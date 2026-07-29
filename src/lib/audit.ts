import Database from "better-sqlite3";
import { generateId } from "@/lib/db";

type AuditAction = "create" | "update" | "delete" | "post" | "unpost" | "reverse" | "stock_move";

export function auditLog(
  db: Database.Database,
  userId: string | null | undefined,
  action: AuditAction,
  tableName: string,
  recordId: string,
  newData?: Record<string, unknown> | null,
  oldData?: Record<string, unknown> | null,
) {
  const id = generateId();
  db.prepare(`INSERT INTO audit_log (id, user_id, table_name, record_id, action, old_data, new_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
    .run(
      id,
      userId || null,
      tableName,
      recordId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
    );
}
