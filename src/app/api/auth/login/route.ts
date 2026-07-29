import { NextRequest, NextResponse } from "next/server";
import { getDb, verifyPassword } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  if (!username || !password) return NextResponse.json({ error: "username and password required" }, { status: 400 });

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ? AND is_active = 1").get(username) as Record<string, unknown> | undefined;
  if (!user || !verifyPassword(password, user.password_hash as string)) {
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const token = signToken({ id: user.id, name: user.name, username: user.username, role: user.role });

  const resp = NextResponse.json({ user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  resp.cookies.set("acc_auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });
  return resp;
}
