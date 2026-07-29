import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const db = getDb();

  const actFilter = buildActivityFilterCol(user, activityId, "activity_id");
  let query = `SELECT * FROM fiscal_years WHERE ${actFilter.clause}`;
  const params: string[] = [...actFilter.params];
  query += " ORDER BY start_date DESC";

  const fiscalYears = db.prepare(query).all(...params);
  return NextResponse.json({ fiscal_years: fiscalYears });
}
