import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const db = getDb();
  const { source_activity_id, target_activity_id } = await request.json();

  if (!source_activity_id || !target_activity_id) {
    return NextResponse.json({ error: "source_activity_id and target_activity_id are required" }, { status: 400 });
  }

  const source = db.prepare("SELECT id FROM activities WHERE id = ?").get(source_activity_id) as { id: string } | undefined;
  const target = db.prepare("SELECT id FROM activities WHERE id = ?").get(target_activity_id) as { id: string } | undefined;
  if (!source) return NextResponse.json({ error: "Source activity not found" }, { status: 404 });
  if (!target) return NextResponse.json({ error: "Target activity not found" }, { status: 404 });

  const existing = db.prepare("SELECT COUNT(*) as c FROM chart_of_accounts WHERE activity_id = ?").get(target_activity_id) as { c: number };
  if (existing.c > 0) {
    return NextResponse.json({ error: "Target activity already has accounts. Delete them first or use a different target." }, { status: 409 });
  }

  type SrcAccount = { id: string; activity_id: string; code: string; name_ar: string; name_en: string | null; account_type: string; parent_id: string | null; level: number; nature: string; is_postable: number; is_active: number };
  const accounts = db.prepare("SELECT * FROM chart_of_accounts WHERE activity_id = ? ORDER BY level, code").all(source_activity_id) as SrcAccount[];
  if (accounts.length === 0) {
    return NextResponse.json({ error: "Source activity has no accounts" }, { status: 404 });
  }

  const idMap: Record<string, string> = {};
  const insert = db.prepare(`INSERT INTO chart_of_accounts (id, activity_id, code, name_ar, name_en, account_type, parent_id, level, nature, is_postable, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const tx = db.transaction(() => {
    for (const acc of accounts) {
      const newId = generateId();
      idMap[acc.id] = newId;
      const newParentId = acc.parent_id ? (idMap[acc.parent_id] || null) : null;
      insert.run(newId, target_activity_id, acc.code, acc.name_ar, acc.name_en, acc.account_type, newParentId, acc.level, acc.nature, acc.is_postable, acc.is_active);
    }
  });

  tx();
  return NextResponse.json({ count: accounts.length, message: `Copied ${accounts.length} accounts successfully` });
}
