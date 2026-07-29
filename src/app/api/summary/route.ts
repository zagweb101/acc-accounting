import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const db = getDb();

  const actF = buildActivityFilterCol(user, null, "i.activity_id");

  const monthly = db.prepare(`
    SELECT
      strftime('%m', invoice_date) as month,
      strftime('%Y-%m', invoice_date) as label,
      COALESCE(SUM(CASE WHEN type = 'sales' THEN total_amount ELSE 0 END), 0) as sales,
      COALESCE(SUM(CASE WHEN type = 'purchase' THEN total_amount ELSE 0 END), 0) as purchases
    FROM invoices i
    WHERE ${actF.clause} AND invoice_date >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', invoice_date)
    ORDER BY month
  `).all(...actF.params);

  const actF2 = buildActivityFilterCol(user, null, "i.activity_id");
  const topContacts = db.prepare(`
    SELECT c.name, c.type, COALESCE(SUM(i.total_amount), 0) as total
    FROM contacts c
    JOIN invoices i ON i.contact_id = c.id
    WHERE i.type = 'sales' AND ${actF2.clause}
    GROUP BY c.id
    ORDER BY total DESC
    LIMIT 5
  `).all(...actF2.params);

  return NextResponse.json({ monthly, topContacts });
}
