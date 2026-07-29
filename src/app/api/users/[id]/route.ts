import { NextRequest, NextResponse } from "next/server";
import { getDb, hashPassword } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner");
  if (roleErr) return roleErr;

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const { name, username, password, role, is_active, activity_ids } = body;

  db.transaction(() => {
    db.prepare(`UPDATE users SET
      name = COALESCE(?, name), username = COALESCE(?, username),
      role = COALESCE(?, role), is_active = COALESCE(?, is_active)
      ${password ? ", password_hash = ?" : ""}
      WHERE id = ?`).run(
      name ?? null, username ?? null, role ?? null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      ...(password ? [hashPassword(password)] : []), id
    );
    if (activity_ids && Array.isArray(activity_ids) && (role || existing)) {
      db.prepare("DELETE FROM user_activities WHERE user_id = ?").run(id);
      const ins = db.prepare("INSERT INTO user_activities (user_id, activity_id) VALUES (?, ?)");
      for (const aid of activity_ids) ins.run(id, aid);
    }
  })();

  const updated = db.prepare("SELECT id, name, username, role, is_active FROM users WHERE id = ?").get(id);
  return NextResponse.json({ user: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner");
  if (roleErr) return roleErr;

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (id === user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  db.transaction(() => {
    db.prepare("DELETE FROM user_activities WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  })();
  return NextResponse.json({ success: true });
}
