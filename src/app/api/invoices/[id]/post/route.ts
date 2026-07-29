import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, requireRecordAccess } from "@/lib/auth";
import QRCode from "qrcode";

const TLV_TAGS = {
  sellerName: 1,
  vatNumber: 2,
  timeStamp: 3,
  totalWithVat: 4,
  totalVat: 5,
};

function encodeTLV(tag: number, value: string): Buffer {
  const valueBuf = Buffer.from(value, "utf-8");
  const tagBuf = Buffer.from([tag]);
  const len = valueBuf.length;
  const lenBuf = len <= 255 ? Buffer.from([len]) : Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
  return Buffer.concat([tagBuf, lenBuf, valueBuf]);
}

function generateZatcaQR(sellerName: string, vatNumber: string, invoiceDate: string, totalWithVat: number, totalVat: number): string {
  const tlvParts = [
    encodeTLV(TLV_TAGS.sellerName, sellerName),
    encodeTLV(TLV_TAGS.vatNumber, vatNumber),
    encodeTLV(TLV_TAGS.timeStamp, invoiceDate),
    encodeTLV(TLV_TAGS.totalWithVat, totalWithVat.toFixed(2)),
    encodeTLV(TLV_TAGS.totalVat, totalVat.toFixed(2)),
  ];
  return Buffer.concat(tlvParts).toString("base64");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const recErr = requireRecordAccess(user, id, "invoices");
  if (recErr) return recErr;
  const body = await request.json();
  const { action } = body;

  if (action !== "post") {
    return NextResponse.json({ error: "Invalid action. Use 'post'." }, { status: 400 });
  }

  const invoice = db.prepare(`
    SELECT i.*, c.name as contact_name, c.tax_number as contact_tax, a.name as activity_name, a.vat_number as activity_vat, a.type as activity_type
    FROM invoices i
    JOIN contacts c ON c.id = i.contact_id
    JOIN activities a ON a.id = i.activity_id
    WHERE i.id = ?
  `).get(id) as Record<string, unknown> | undefined;

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "draft") return NextResponse.json({ error: "Only draft invoices can be posted" }, { status: 400 });

  const lines = db.prepare("SELECT l.*, it.type as item_type, it.cost_price FROM invoice_lines l LEFT JOIN items it ON it.id = l.item_id WHERE l.invoice_id = ?").all(id) as Array<Record<string, unknown>>;
  if (lines.length === 0) return NextResponse.json({ error: "Invoice has no lines" }, { status: 400 });

  const ifType = invoice.type as string;
  const actId = invoice.activity_id as string;
  const entryDate = invoice.invoice_date as string;
  const subTotal = invoice.subtotal as number;
  const vatAmount = invoice.vat_amount as number;
  const totalAmount = invoice.total_amount as number;
  const fy = db.prepare("SELECT id FROM fiscal_years WHERE activity_id = ? AND ? BETWEEN start_date AND end_date LIMIT 1").get(actId, entryDate) as { id: string } | undefined;
  if (!fy) return NextResponse.json({ error: "No active fiscal year for invoice date" }, { status: 400 });

  const costCenterId = invoice.cost_center_id as string | null;
  const contactId = invoice.contact_id as string;

  const isSales = ifType === "sales" || ifType === "sales_return";
  const isPurchase = ifType === "purchase" || ifType === "purchase_return";
  const isReturn = ifType === "sales_return" || ifType === "purchase_return";

  let accountAR: { id: string } | undefined;
  let accountAP: { id: string } | undefined;
  let accountSales: { id: string } | undefined;
  let accountVATOut: { id: string } | undefined;
  let accountVATIn: { id: string } | undefined;
  let accountInventory: { id: string } | undefined;
  let accountCOGS: { id: string } | undefined;
  let accountCash: { id: string } | undefined;

  if (isSales) {
    accountAR = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '1200'").get(actId) as { id: string } | undefined;
    accountSales = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '4100'").get(actId) as { id: string } | undefined;
    accountVATOut = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '2200'").get(actId) as { id: string } | undefined;
    accountInventory = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '1300'").get(actId) as { id: string } | undefined;
    accountCOGS = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '5100'").get(actId) as { id: string } | undefined;
    accountCash = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '1100'").get(actId) as { id: string } | undefined;
    if (!accountAR || !accountSales || !accountVATOut) {
      return NextResponse.json({ error: "Missing required accounts (1200/4100/2200)" }, { status: 500 });
    }
  }
  if (isPurchase) {
    accountAP = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '2100'").get(actId) as { id: string } | undefined;
    accountInventory = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '1300'").get(actId) as { id: string } | undefined;
    accountVATIn = db.prepare("SELECT id FROM chart_of_accounts WHERE activity_id = ? AND code = '2200'").get(actId) as { id: string } | undefined;
    if (!accountAP || !accountInventory || !accountVATIn) {
      return NextResponse.json({ error: "Missing required accounts (2100/1300/2200)" }, { status: 500 });
    }
  }

  const jeId = generateId();
  const auditId = generateId();
  const zatcaUUID = crypto.randomUUID();

  const lastEntry = db.prepare("SELECT entry_number FROM journal_entries WHERE entry_number GLOB 'JE-[0-9][0-9][0-9][0-9]' ORDER BY CAST(SUBSTR(entry_number, 4) AS INTEGER) DESC LIMIT 1").get() as { entry_number: string } | undefined;
  let nextNum = 1;
  if (lastEntry) { const n = parseInt(lastEntry.entry_number.substring(3)); if (!isNaN(n)) nextNum = n + 1; }
  const jeNumber = `JE-${nextNum.toString().padStart(4, "0")}`;

  const desc = isSales ? `فاتورة مبيعات ${invoice.invoice_number}` : `فاتورة مشتريات ${invoice.invoice_number}`;
  const factor = isReturn ? -1 : 1;

  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO journal_entries (id, entry_number, activity_id, fiscal_year_id, entry_date, description, total_debit, total_credit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(jeId, jeNumber, actId, fy.id, entryDate, desc, totalAmount as number, totalAmount as number);

    const insertJel = db.prepare("INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, contact_id, cost_center_id, item_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if (isSales) {
      const arTotal = totalAmount as number;
      insertJel.run(generateId(), jeId, accountAR!.id, contactId, costCenterId, null, arTotal, 0, desc);
      const salesNet = (subTotal as number) * factor;
      const vatNet = (vatAmount as number) * factor;
      insertJel.run(generateId(), jeId, accountSales!.id, null, costCenterId, null, salesNet < 0 ? Math.abs(salesNet) : 0, salesNet > 0 ? salesNet : 0, `إيراد ${invoice.invoice_number}`);
      insertJel.run(generateId(), jeId, accountVATOut!.id, null, costCenterId, null, vatNet < 0 ? Math.abs(vatNet) : 0, vatNet > 0 ? vatNet : 0, `ضريبة ${invoice.invoice_number}`);

      if (isReturn && accountCash) {
        insertJel.run(generateId(), jeId, accountCash.id, contactId, costCenterId, null, 0, arTotal, `مرتجع ${invoice.invoice_number}`);
      }

      let cogsTotal = 0;
      for (const line of lines) {
        const itemType = line.item_type as string;
        const qty = line.quantity as number;
        const costPrice = line.cost_price as number || 0;
        if (itemType === "product" && costPrice > 0 && accountInventory && accountCOGS) {
          const lineCogs = costPrice * qty * (isReturn ? -1 : 1);
          if (lineCogs !== 0) {
            cogsTotal += lineCogs;
          }
        }
      }
      if (cogsTotal > 0) {
        const cogsJeId = generateId();
        const lastCogs = db.prepare("SELECT entry_number FROM journal_entries WHERE entry_number GLOB 'JE-[0-9][0-9][0-9][0-9]' ORDER BY CAST(SUBSTR(entry_number, 4) AS INTEGER) DESC LIMIT 1").get() as { entry_number: string } | undefined;
        let cogsNext = 1;
        if (lastCogs) { const n = parseInt(lastCogs.entry_number.substring(3)); if (!isNaN(n)) cogsNext = n + 1; }
        const cogsJeNum = `JE-${cogsNext.toString().padStart(4, "0")}`;
        db.prepare(`INSERT INTO journal_entries (id, entry_number, activity_id, fiscal_year_id, entry_date, description, total_debit, total_credit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(cogsJeId, cogsJeNum, actId, fy.id, entryDate, `تكلفة ${invoice.invoice_number}`, cogsTotal, cogsTotal);
        insertJel.run(generateId(), cogsJeId, accountCOGS!.id, null, costCenterId, null, cogsTotal, 0, `تكلفة ${invoice.invoice_number}`);
        insertJel.run(generateId(), cogsJeId, accountInventory!.id, null, costCenterId, null, 0, cogsTotal, `مخزون ${invoice.invoice_number}`);
      }
    }

    if (isPurchase) {
      const poTotal = totalAmount as number;
      insertJel.run(generateId(), jeId, accountInventory!.id, null, costCenterId, null, (subTotal as number) * factor, 0, `مشتريات ${invoice.invoice_number}`);
      insertJel.run(generateId(), jeId, accountVATIn!.id, null, costCenterId, null, (vatAmount as number) * factor, 0, `ضريبة مشتريات ${invoice.invoice_number}`);
      insertJel.run(generateId(), jeId, accountAP!.id, contactId, costCenterId, null, 0, poTotal, desc);
      if (isReturn && accountCash) {
        insertJel.run(generateId(), jeId, accountCash.id, contactId, costCenterId, null, poTotal, 0, `مرتجع مشتريات ${invoice.invoice_number}`);
      }
    }

    for (const line of lines) {
      const itemType = line.item_type as string;
      const qty = line.quantity as number;
      if (itemType === "product") {
        const invQty = (isSales ? -1 : 1) * qty * (isReturn ? -1 : 1);
        db.prepare("UPDATE items SET stock_quantity = stock_quantity + ? WHERE id = ?").run(invQty, line.item_id);
      }
    }

    db.prepare(`UPDATE invoices SET status = 'unpaid', zatca_uuid = ?, zatca_qr = ?, journal_entry_id = ? WHERE id = ?`)
      .run(zatcaUUID, "", jeId, id);

    db.prepare(`INSERT INTO audit_log (id, table_name, record_id, action, new_data, user_id)
      VALUES (?, 'invoices', ?, 'post', ?, ?)`)
      .run(auditId, id, JSON.stringify({ invoice_number: invoice.invoice_number, journal_entry_id: jeId, zatca_uuid: zatcaUUID }), user.id);
  });

  tx();

  const activityRecord = db.prepare("SELECT name, vat_number FROM activities WHERE id = ?").get(actId) as { name: string; vat_number: string | null } | undefined;
  const sellerName = activityRecord?.name || "";
  const vatNumber = activityRecord?.vat_number || "";
  const qrBase64 = generateZatcaQR(sellerName, vatNumber, entryDate, totalAmount as number, vatAmount as number);

  db.prepare("UPDATE invoices SET zatca_qr = ? WHERE id = ?").run(qrBase64, id);

  const updated = db.prepare("SELECT i.*, c.name as contact_name FROM invoices i JOIN contacts c ON c.id = i.contact_id WHERE i.id = ?").get(id) as Record<string, unknown>;
  const invLines = db.prepare("SELECT l.*, it.name as item_name FROM invoice_lines l LEFT JOIN items it ON it.id = l.item_id WHERE l.invoice_id = ?").all(id);

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(qrBase64, { margin: 1, width: 200, color: { dark: "#000", light: "#fff" } });
  } catch {
    qrDataUrl = "";
  }

  return NextResponse.json({
    invoice: { ...updated, lines: invLines },
    zatca_uuid: zatcaUUID,
    zatca_qr_base64: qrBase64,
    zatca_qr_image: qrDataUrl,
    journal_entry_id: jeId,
  });
}
