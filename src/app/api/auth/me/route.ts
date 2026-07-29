import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ user: null });
  const db = getDb();
  const active = db.prepare("SELECT is_active FROM users WHERE id = ?").get(user.id) as { is_active: number } | undefined;
  if (!active || !active.is_active) return NextResponse.json({ user: null });
  let assigned_activities: string[] = [];
  if (user.role === "accountant") {
    assigned_activities = (db.prepare("SELECT activity_id FROM user_activities WHERE user_id = ?").all(user.id) as { activity_id: string }[]).map(a => a.activity_id);
  }
  return NextResponse.json({ user: { ...user, assigned_activities } });
}
