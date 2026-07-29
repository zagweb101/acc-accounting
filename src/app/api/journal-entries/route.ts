import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");
  const db = getDb();

  let query = `SELECT j.*, f.name as fiscal_year_name FROM journal_entries j JOIN fiscal_years f ON f.id = j.fiscal_year_id`;
  const params: string[] = [];
  const wheres: string[] = [];

  const actFilter = buildActivityFilterCol(user, activityId, "j.activity_id");
  wheres.push(actFilter.clause);
  params.push(...actFilter.params);
  if (status) { wheres.push("j.status = ?"); params.push(status); }
  if (from) { wheres.push("j.entry_date >= ?"); params.push(from); }
  if (to) { wheres.push("j.entry_date <= ?"); params.push(to); }
  if (search) { wheres.push("(j.entry_number LIKE ? OR j.description LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }

  if (wheres.length > 0) query += " WHERE " + wheres.join(" AND ");
  query += " ORDER BY j.entry_date DESC, j.entry_number DESC";

  const entries = db.prepare(query).all(...params);
  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const db = getDb();
  const body = await request.json();
  const { activity_id, fiscal_year_id, entry_date, description, lines } = body;

  if (!activity_id || !fiscal_year_id || !entry_date || !lines || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "activity_id, fiscal_year_id, entry_date, and at least 2 lines are required" }, { status: 400 });
  }

  const activity = db.prepare("SELECT id FROM activities WHERE id = ?").get(activity_id) as { id: string } | undefined;
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const fy = db.prepare("SELECT id, start_date, end_date FROM fiscal_years WHERE id = ? AND activity_id = ?").get(fiscal_year_id, activity_id) as { id: string; start_date: string; end_date: string } | undefined;
  if (!fy) return NextResponse.json({ error: "Fiscal year not found for this activity" }, { status: 404 });
  if (entry_date < fy.start_date || entry_date > fy.end_date) {
    return NextResponse.json({ error: `Entry date must be within fiscal year (${fy.start_date} to ${fy.end_date})` }, { status: 400 });
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.account_id) {
      return NextResponse.json({ error: `Line ${i + 1}: account_id is required` }, { status: 400 });
    }
    if ((!line.debit || line.debit <= 0) && (!line.credit || line.credit <= 0)) {
      return NextResponse.json({ error: `Line ${i + 1}: either debit or credit must be positive` }, { status: 400 });
    }
    if (line.debit > 0 && line.credit > 0) {
      return NextResponse.json({ error: `Line ${i + 1}: cannot have both debit and credit` }, { status: 400 });
    }

    const account = db.prepare("SELECT id, is_postable, activity_id FROM chart_of_accounts WHERE id = ?").get(line.account_id) as { id: string; is_postable: number; activity_id: string | null } | undefined;
    if (!account) {
      return NextResponse.json({ error: `Line ${i + 1}: account not found` }, { status: 404 });
    }
    if (account.is_postable !== 1) {
      return NextResponse.json({ error: `Line ${i + 1}: account is not postable` }, { status: 400 });
    }
    if (account.activity_id && account.activity_id !== activity_id) {
      return NextResponse.json({ error: `Line ${i + 1}: account belongs to a different activity` }, { status: 400 });
    }

    if (line.cost_center_id) {
      const cc = db.prepare("SELECT id FROM cost_centers WHERE id = ?").get(line.cost_center_id);
      if (!cc) return NextResponse.json({ error: `Line ${i + 1}: cost center not found` }, { status: 404 });
    }
    if (line.contact_id) {
      const contact = db.prepare("SELECT id FROM contacts WHERE id = ?").get(line.contact_id);
      if (!contact) return NextResponse.json({ error: `Line ${i + 1}: contact not found` }, { status: 404 });
    }
    if (line.due_date && line.due_date < entry_date) {
      return NextResponse.json({ error: `Line ${i + 1}: due date cannot be before entry date` }, { status: 400 });
    }

    totalDebit += line.debit || 0;
    totalCredit += line.credit || 0;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return NextResponse.json({ error: `Debit (${totalDebit.toFixed(3)}) must equal credit (${totalCredit.toFixed(3)})` }, { status: 400 });
  }

  const id = generateId();
  const auditId = generateId();

  const lastEntry = db.prepare("SELECT entry_number FROM journal_entries WHERE entry_number LIKE 'JE-%' ORDER BY entry_number DESC LIMIT 1").get() as { entry_number: string } | undefined;
  let nextNum = 1;
  if (lastEntry) {
    const parts = lastEntry.entry_number.split("-");
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  const entryNumber = `JE-${nextNum.toString().padStart(4, "0")}`;

  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO journal_entries (id, entry_number, activity_id, fiscal_year_id, entry_date, description, total_debit, total_credit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, entryNumber, activity_id, fiscal_year_id, entry_date, description || null, totalDebit, totalCredit);

    const insertLine = db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, cost_center_id, contact_id, item_id, debit, credit, description, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const line of lines) {
      insertLine.run(generateId(), id, line.account_id, line.cost_center_id || null, line.contact_id || null, line.item_id || null, line.debit || 0, line.credit || 0, line.description || null, line.due_date || null);
    }

    db.prepare(`INSERT INTO audit_log (id, table_name, record_id, action, new_data, user_id)
      VALUES (?, 'journal_entries', ?, 'create', ?, ?)`)
      .run(auditId, id, JSON.stringify({ entry_number: entryNumber, entry_date, description, total_debit: totalDebit, total_credit: totalCredit, lines }), user.id);
  });

  tx();

  const entry = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(id) as Record<string, unknown>;
  const entryLines = db.prepare("SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?").all(id);
  return NextResponse.json({ entry: { ...entry, lines: entryLines } }, { status: 201 });
}
