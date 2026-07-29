import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "acc-secret-change-in-production";

export interface UserInfo {
  id: string;
  name: string;
  username: string;
  role: "owner" | "accountant" | "sales" | "viewer";
}

export function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  if (signature !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

export function getUserFromRequest(request: NextRequest): UserInfo | null {
  const token = request.cookies.get("acc_auth_token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return payload as unknown as UserInfo;
}

export function requireAuth(request: NextRequest): { user: UserInfo; error: NextResponse | null } {
  const user = getUserFromRequest(request);
  if (!user) return { user: null as unknown as UserInfo, error: NextResponse.json({ error: "غير مصرح به" }, { status: 401 }) };
  const db = getDb();
  const active = db.prepare("SELECT is_active FROM users WHERE id = ?").get(user.id) as { is_active: number } | undefined;
  if (!active || !active.is_active) return { user: null as unknown as UserInfo, error: NextResponse.json({ error: "الحساب غير نشط" }, { status: 403 }) };
  return { user, error: null };
}

export function requireRole(user: UserInfo, ...roles: string[]): NextResponse | null {
  if (!roles.includes(user.role)) return NextResponse.json({ error: "لا تملك الصلاحية لهذه العملية" }, { status: 403 });
  return null;
}

export function getUserActivityIds(user: UserInfo): string[] | null {
  if (user.role === "owner") return null;
  if (user.role === "accountant") {
    const db = getDb();
    return (db.prepare("SELECT activity_id FROM user_activities WHERE user_id = ?").all(user.id) as { activity_id: string }[]).map(a => a.activity_id);
  }
  return null;
}

export function buildActivityFilter(user: UserInfo, requestActivityId: string | null): { clause: string; params: string[] } {
  const actIds = getUserActivityIds(user);
  if (actIds === null) {
    if (requestActivityId) return { clause: "activity_id = ?", params: [requestActivityId] };
    return { clause: "1=1", params: [] };
  }
  if (requestActivityId) {
    if (!actIds.includes(requestActivityId)) return { clause: "1=0", params: [] };
    return { clause: "activity_id = ?", params: [requestActivityId] };
  }
  const placeholders = actIds.map(() => "?").join(",");
  return { clause: `activity_id IN (${placeholders})`, params: actIds };
}

export function buildActivityFilterCol(user: UserInfo, requestActivityId: string | null, col: string): { clause: string; params: string[] } {
  const actIds = getUserActivityIds(user);
  if (actIds === null) {
    if (requestActivityId) return { clause: `${col} = ?`, params: [requestActivityId] };
    return { clause: "1=1", params: [] };
  }
  if (requestActivityId) {
    if (!actIds.includes(requestActivityId)) return { clause: "1=0", params: [] };
    return { clause: `${col} = ?`, params: [requestActivityId] };
  }
  const placeholders = actIds.map(() => "?").join(",");
  return { clause: `${col} IN (${placeholders})`, params: actIds };
}

export function requireActivityAccess(user: UserInfo, activityId: string | null | undefined): boolean {
  if (!activityId) return user.role !== "accountant";
  if (user.role !== "accountant") return true;
  const db = getDb();
  const row = db.prepare("SELECT 1 FROM user_activities WHERE user_id = ? AND activity_id = ?").get(user.id, activityId);
  return !!row;
}

function getRecordActivityId(recordId: string, table: string): string | null {
  const db = getDb();
  const row = db.prepare(`SELECT activity_id FROM ${table} WHERE id = ?`).get(recordId) as { activity_id: string } | undefined;
  return row?.activity_id || null;
}

export function requireRecordAccess(user: UserInfo, recordId: string, table: string): NextResponse | null {
  if (user.role !== "accountant") return null;
  const actId = getRecordActivityId(recordId, table);
  if (!actId) return null;
  const hasAccess = requireActivityAccess(user, actId);
  if (!hasAccess) return NextResponse.json({ error: "لا تملك صلاحية لهذا السجل" }, { status: 403 });
  return null;
}
