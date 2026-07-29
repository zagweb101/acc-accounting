import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, requireRecordAccess } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const recErr = requireRecordAccess(user, id, "journal_entries");
  if (recErr) return recErr;
  const body = await request.json();
  const { action, performed_by } = body;

  if (!action || !["post", "unpost", "reverse"].includes(action)) {
    return NextResponse.json({ error: "action must be 'post', 'unpost', or 'reverse'" }, { status: 400 });
  }

  const entry = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!entry) return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });

  const currentStatus = entry.status as string;

  if (action === "post" && currentStatus !== "draft") {
    return NextResponse.json({ error: "Only draft entries can be posted" }, { status: 400 });
  }
  if (action === "unpost" && currentStatus !== "posted") {
    return NextResponse.json({ error: "Only posted entries can be unposted" }, { status: 400 });
  }
  if (action === "reverse" && currentStatus !== "posted") {
    return NextResponse.json({ error: "Only posted entries can be reversed" }, { status: 400 });
  }

  const auditId = crypto.randomUUID();

  const tx = db.transaction(() => {
    if (action === "post") {
      db.prepare("UPDATE journal_entries SET status = 'posted' WHERE id = ?").run(id);
    } else if (action === "unpost") {
      db.prepare("UPDATE journal_entries SET status = 'draft' WHERE id = ?").run(id);
    } else if (action === "reverse") {
      db.prepare("UPDATE journal_entries SET status = 'reversed' WHERE id = ?").run(id);

      const newId = crypto.randomUUID();
      const auditId2 = crypto.randomUUID();
      const lastEntry = db.prepare("SELECT entry_number FROM journal_entries WHERE entry_number LIKE 'JE-%' ORDER BY entry_number DESC LIMIT 1").get() as { entry_number: string } | undefined;
      let nextNum = 1;
      if (lastEntry) {
        const parts = lastEntry.entry_number.split("-");
        const lastNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      const newEntryNumber = `JE-${nextNum.toString().padStart(4, "0")}`;

      db.prepare(`INSERT INTO journal_entries (id, entry_number, activity_id, fiscal_year_id, entry_date, description, total_debit, total_credit, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted')`)
        .run(newId, newEntryNumber, entry.activity_id, entry.fiscal_year_id, entry.entry_date, `عكس: ${entry.description || entry.entry_number}`, entry.total_credit, entry.total_debit);

      const originalLines = db.prepare("SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?").all(id) as Array<Record<string, unknown>>;
      const insertLine = db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, cost_center_id, contact_id, item_id, debit, credit, description, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const line of originalLines) {
        insertLine.run(crypto.randomUUID(), newId, line.account_id, line.cost_center_id, line.contact_id, line.item_id, line.credit, line.debit, `عكس: ${line.description || ""}`, line.due_date);
      }

      db.prepare("INSERT INTO audit_log (id, table_name, record_id, action, new_data, user_id) VALUES (?, 'journal_entries', ?, 'create', ?, ?)")
        .run(auditId2, newId, JSON.stringify({ entry_number: newEntryNumber, reversal_of: id }), user.id);
    }

    db.prepare("INSERT INTO audit_log (id, table_name, record_id, action, old_data, new_data, user_id) VALUES (?, 'journal_entries', ?, ?, ?, ?, ?)")
      .run(auditId, id, action, JSON.stringify({ status: currentStatus }), JSON.stringify({ status: action === "post" ? "posted" : action === "unpost" ? "draft" : "reversed" }), user.id);
  });

  tx();

  const updated = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(id);
  return NextResponse.json({ entry: updated });
}
