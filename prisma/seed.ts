import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function applyConstraints() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE journal_entries ADD CONSTRAINT IF NOT EXISTS ck_journal_balanced CHECK (total_debit = total_credit)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE journal_entry_lines ADD CONSTRAINT IF NOT EXISTS ck_line_single_side CHECK (NOT (debit > 0 AND credit > 0))`
  );
}

async function main() {
  if (await prisma.activity.findFirst()) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  const com = await prisma.activity.create({
    data: { name: "النشاط التجاري", code: "COM01", type: "commercial", vatNumber: "310123456700003" },
  });
  const ser = await prisma.activity.create({
    data: { name: "النشاط الخدمي", code: "SER01", type: "service", vatNumber: "310123456700004" },
  });

  await prisma.fiscalYear.create({
    data: { activityId: com.id, name: "FY 2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
  });
  await prisma.fiscalYear.create({
    data: { activityId: ser.id, name: "FY 2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
  });

  const acc: Record<string, string> = {};

  const level1 = [
    { code: "1000", nameAr: "الأصول", nameEn: "Assets", accountType: "asset" as const, nature: "debit" as const, isPostable: false },
    { code: "2000", nameAr: "الخصوم", nameEn: "Liabilities", accountType: "liability" as const, nature: "credit" as const, isPostable: false },
    { code: "3000", nameAr: "الإيرادات", nameEn: "Revenue", accountType: "revenue" as const, nature: "credit" as const, isPostable: false },
    { code: "4000", nameAr: "المصروفات", nameEn: "Expenses", accountType: "expense" as const, nature: "debit" as const, isPostable: false },
  ];
  for (const a of level1) {
    const r = await prisma.chartOfAccount.create({ data: { activityId: com.id, ...a, level: 1 } });
    acc[a.code] = r.id;
  }

  const level2 = [
    { code: "1100", nameAr: "النقدية", nameEn: "Cash", accountType: "asset" as const, nature: "debit" as const, parent: "1000" },
    { code: "1200", nameAr: "الذمم المدينة", nameEn: "Accounts Receivable", accountType: "asset" as const, nature: "debit" as const, parent: "1000" },
    { code: "1300", nameAr: "المخزون", nameEn: "Inventory", accountType: "asset" as const, nature: "debit" as const, parent: "1000" },
    { code: "1400", nameAr: "الأصول الثابتة", nameEn: "Fixed Assets", accountType: "asset" as const, nature: "debit" as const, isPostable: false, parent: "1000" },
    { code: "2100", nameAr: "الذمم الدائنة", nameEn: "Accounts Payable", accountType: "liability" as const, nature: "credit" as const, parent: "2000" },
    { code: "2200", nameAr: "ضريبة القيمة المضافة", nameEn: "VAT Payable", accountType: "liability" as const, nature: "credit" as const, parent: "2000" },
    { code: "3100", nameAr: "إيرادات المبيعات", nameEn: "Sales Revenue", accountType: "revenue" as const, nature: "credit" as const, parent: "3000" },
    { code: "3200", nameAr: "إيرادات الخدمات", nameEn: "Service Revenue", accountType: "revenue" as const, nature: "credit" as const, parent: "3000" },
    { code: "4100", nameAr: "تكلفة المبيعات", nameEn: "Cost of Goods Sold", accountType: "expense" as const, nature: "debit" as const, parent: "4000" },
    { code: "4200", nameAr: "مصروفات عمومية وإدارية", nameEn: "General & Admin", accountType: "expense" as const, nature: "debit" as const, isPostable: false, parent: "4000" },
  ];
  for (const a of level2) {
    const { parent, ...data } = a;
    const r = await prisma.chartOfAccount.create({ data: { activityId: com.id, ...data, level: 2, parentId: acc[parent] } });
    acc[a.code] = r.id;
  }

  const level3 = [
    { code: "1410", nameAr: "مباني", nameEn: "Buildings", accountType: "asset" as const, nature: "debit" as const, parent: "1400" },
    { code: "1420", nameAr: "معدات", nameEn: "Equipment", accountType: "asset" as const, nature: "debit" as const, parent: "1400" },
    { code: "4210", nameAr: "إيجار", nameEn: "Rent", accountType: "expense" as const, nature: "debit" as const, parent: "4200" },
    { code: "4220", nameAr: "رواتب", nameEn: "Salaries", accountType: "expense" as const, nature: "debit" as const, parent: "4200" },
    { code: "4230", nameAr: "مرافق", nameEn: "Utilities", accountType: "expense" as const, nature: "debit" as const, parent: "4200" },
  ];
  for (const a of level3) {
    const { parent, ...data } = a;
    await prisma.chartOfAccount.create({ data: { activityId: com.id, ...data, level: 3, parentId: acc[parent] } });
  }

  for (const [code, name] of [["ADM", "الإدارة العامة"], ["SAL", "المبيعات والتسويق"], ["PRJ", "المشاريع"]]) {
    await prisma.costCenter.create({ data: { activityId: com.id, name, code, level: 1 } });
  }
  for (const [code, name] of [["SER-ADM", "الإدارة العامة"], ["SER-TEC", "الخدمات الفنية"], ["SER-PRJ", "المشاريع"]]) {
    await prisma.costCenter.create({ data: { activityId: ser.id, name, code, level: 1 } });
  }

  await applyConstraints();
  console.log("✅ Seed complete — 2 activities, 1 fiscal year, 20 accounts, 6 cost centers");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
