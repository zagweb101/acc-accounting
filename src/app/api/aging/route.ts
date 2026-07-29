import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const contactId = searchParams.get("contact_id");
  const bucket = searchParams.get("bucket");
  const type = searchParams.get("type") || "sales";
  const db = getDb();

  if (!["sales", "purchase"].includes(type)) {
    return NextResponse.json({ error: "type must be 'sales' or 'purchase'" }, { status: 400 });
  }

  let query = `SELECT
    i.id, i.invoice_number, c.name as contact_name, c.id as contact_id,
    i.due_date, i.total_amount, i.paid_amount, i.invoice_date,
    (i.total_amount - i.paid_amount) as outstanding,
    CAST(julianday('now') - julianday(i.due_date) AS INTEGER) as days_overdue,
    CASE
      WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 0 AND 30 THEN '0-30'
      WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 31 AND 60 THEN '31-60'
      WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 61 AND 90 THEN '61-90'
      ELSE '90+'
    END as bucket
  FROM invoices i
  JOIN contacts c ON c.id = i.contact_id
  WHERE i.type = ? AND i.status != 'paid' AND (i.total_amount - i.paid_amount) > 0`;

  const params: string[] = [type];

  const actFilter = buildActivityFilterCol(user, activityId, "i.activity_id");
  query += ` AND ${actFilter.clause}`;
  params.push(...actFilter.params);
  if (contactId) { query += " AND i.contact_id = ?"; params.push(contactId); }
  if (bucket) { query += " AND CASE WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 0 AND 30 THEN '0-30' WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 31 AND 60 THEN '31-60' WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 61 AND 90 THEN '61-90' ELSE '90+' END = ?"; params.push(bucket); }

  query += " ORDER BY i.due_date";

  const aging = db.prepare(query).all(...params);

  let bucketQuery = `SELECT bucket, COUNT(*) as count, COALESCE(SUM(outstanding), 0) as total
    FROM (SELECT
      CASE
        WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 0 AND 30 THEN '0-30'
        WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 31 AND 60 THEN '31-60'
        WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 61 AND 90 THEN '61-90'
        ELSE '90+'
      END as bucket,
      (i.total_amount - i.paid_amount) as outstanding
    FROM invoices i
    WHERE i.type = ? AND i.status != 'paid' AND (i.total_amount - i.paid_amount) > 0`;

  const bucketParams: string[] = [type];

  const bucketActFilter = buildActivityFilterCol(user, activityId, "i.activity_id");
  bucketQuery += ` AND ${bucketActFilter.clause}`;
  bucketParams.push(...bucketActFilter.params);
  if (contactId) { bucketQuery += " AND i.contact_id = ?"; bucketParams.push(contactId); }

  bucketQuery += ") GROUP BY bucket ORDER BY CASE bucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 ELSE 4 END";

  const buckets = db.prepare(bucketQuery).all(...bucketParams);

  return NextResponse.json({ aging, buckets });
}
