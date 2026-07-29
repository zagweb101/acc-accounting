import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const db = getDb();
  const body = await request.json();
  const { item_id, quantity, move_type, entry_date, description, activity_id, fiscal_year_id } = body;

  if (!item_id || quantity === undefined || !move_type) {
    return NextResponse.json({ error: "item_id, quantity, and move_type are required" }, { status: 400 });
  }
  if (!["purchase", "sale", "return_in", "return_out", "adjustment"].includes(move_type)) {
    return NextResponse.json({ error: "Invalid move_type" }, { status: 400 });
  }

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(item_id) as Record<string, unknown> | undefined;
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.type !== "product") {
    return NextResponse.json({ error: "Stock moves only apply to products" }, { status: 400 });
  }

  const actId = activity_id || item.activity_id;
  if (!fiscal_year_id) {
    return NextResponse.json({ error: "fiscal_year_id is required for journal entries" }, { status: 400 });
  }

  let qtyChange = 0;
  let shouldPostCOGS = false;
  let cogsDesc = "";

  switch (move_type) {
    case "purchase":
      qtyChange = Math.abs(quantity);
      break;
    case "sale":
      qtyChange = -Math.abs(quantity);
      shouldPostCOGS = true;
      cogsDesc = description || "تكلفة مبيعات";
      break;
    case "return_in":
      qtyChange = Math.abs(quantity);
      break;
    case "return_out":
      qtyChange = -Math.abs(quantity);
      shouldPostCOGS = true;
      cogsDesc = description || "مرتجع مبيعات";
      break;
    case "adjustment":
      qtyChange = quantity;
      break;
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE items SET stock_quantity = stock_quantity + ? WHERE id = ?").run(qtyChange, item_id);

    if (shouldPostCOGS && (item.cost_price as number) > 0) {
      const cogsTotal = (item.cost_price as number) * Math.abs(quantity);
      const jeId = generateId();
      const lastEntry = db.prepare("SELECT entry_number FROM journal_entries WHERE entry_number LIKE 'JE-%' ORDER BY entry_number DESC LIMIT 1").get() as { entry_number: string } | undefined;
      let nextNum = 1;
      if (lastEntry) { const p = lastEntry.entry_number.split("-"); const n = parseInt(p[p.length - 1]); if (!isNaN(n)) nextNum = n + 1; }
      const entryNumber = `JE-${nextNum.toString().padStart(4, "0")}`;
      const entryDate = entry_date || new Date().toISOString().split("T")[0];

      const accCOGS = db.prepare("SELECT id FROM chart_of_accounts WHERE code = '5100' AND activity_id = ?").get(actId as string) as { id: string } | undefined;
      const accInventory = db.prepare("SELECT id FROM chart_of_accounts WHERE code = '1300' AND activity_id = ?").get(actId as string) as { id: string } | undefined;

      if (accCOGS && accInventory) {
        db.prepare("INSERT INTO journal_entries (id, entry_number, activity_id, fiscal_year_id, entry_date, description, total_debit, total_credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(jeId, entryNumber, actId as string, fiscal_year_id, entryDate, cogsDesc, cogsTotal, cogsTotal);
        db.prepare("INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, item_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(generateId(), jeId, accCOGS.id, item_id, cogsTotal, 0, cogsDesc);
        db.prepare("INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, item_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(generateId(), jeId, accInventory.id, item_id, 0, cogsTotal, cogsDesc);
      }
    }

    const auditId = generateId();
    db.prepare("INSERT INTO audit_log (id, table_name, record_id, action, new_data, user_id) VALUES (?, 'items', ?, 'stock_move', ?, ?)")
      .run(auditId, item_id, JSON.stringify({ quantity: qtyChange, move_type, description }), user.id);
  });

  tx();

  const updated = db.prepare("SELECT * FROM items WHERE id = ?").get(item_id);
  return NextResponse.json({ item: updated, quantity_change: qtyChange });
}
