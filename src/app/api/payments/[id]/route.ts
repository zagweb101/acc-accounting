import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { id } = await params;
  const db = getDb();
  const payment = db.prepare("SELECT p.*, i.invoice_number, c.name as contact_name FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id JOIN contacts c ON c.id = p.contact_id WHERE p.id = ?").get(id) as Record<string, unknown> | undefined;
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ payment });
}
