import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const db = getDb();

  let activityFilter = "";
  const params: string[] = [];
  if (user.role === "accountant") {
    const actIds = (db.prepare("SELECT activity_id FROM user_activities WHERE user_id = ?").all(user.id) as { activity_id: string }[]).map(a => a.activity_id);
    if (actIds.length > 0) {
      activityFilter = `AND a.id IN (${actIds.map(() => "?").join(",")})`;
      params.push(...actIds);
    }
  }

  const activities = db.prepare(`
    SELECT
      a.*,
      (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE activity_id = a.id) as total_volume,
      (SELECT COUNT(*) FROM invoices WHERE activity_id = a.id) as invoice_count
    FROM activities a WHERE a.is_active = 1 ${activityFilter}
    ORDER BY a.name
  `).all(...params);

  return NextResponse.json({ activities });
}
