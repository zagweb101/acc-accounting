import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId, hashPassword } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner");
  if (roleErr) return roleErr;

  const db = getDb();
  const users = db.prepare(`SELECT u.id, u.name, u.username, u.role, u.is_active, u.created_at,
    (SELECT GROUP_CONCAT(ua.activity_id) FROM user_activities ua WHERE ua.user_id = u.id) as activity_ids
    FROM users u ORDER BY u.name`).all() as Record<string, unknown>[];
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner");
  if (roleErr) return roleErr;

  const db = getDb();
  const body = await request.json();
  const { name, username, password, role, activity_ids } = body;

  if (!name || !username || !password || !role) {
    return NextResponse.json({ error: "name, username, password, role required" }, { status: 400 });
  }
  if (!["owner", "accountant", "sales", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const exist = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (exist) return NextResponse.json({ error: "Username already exists" }, { status: 409 });

  const id = generateId();
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, username, hashPassword(password), role);
    if (role === "accountant" && activity_ids && Array.isArray(activity_ids)) {
      const ins = db.prepare("INSERT INTO user_activities (user_id, activity_id) VALUES (?, ?)");
      for (const aid of activity_ids) ins.run(id, aid);
    }
  });
  tx();

  const created = db.prepare("SELECT id, name, username, role, is_active, created_at FROM users WHERE id = ?").get(id);
  return NextResponse.json({ user: created }, { status: 201 });
}
