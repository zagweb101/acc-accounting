"use client";

import { useEffect, useState, useCallback } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

type Activity = { id: string; name: string; code: string; type: string };
type Item = {
  id: string; activity_id: string; activity_name: string;
  type: "product" | "service"; name: string;
  sku: string | null; cost_price: number; sale_price: number;
  vat_rate: number; stock_quantity: number;
  reorder_level: number; hourly_rate: number; unit_of_measure: string | null;
};

const defaultProduct = () => ({
  name: "", sku: "", cost_price: 0, sale_price: 0,
  vat_rate: 15, stock_quantity: 0, reorder_level: 0,
});

const defaultService = () => ({
  name: "", sku: "", sale_price: 0, hourly_rate: 0,
  unit_of_measure: "ساعة", vat_rate: 15,
});

export default function ItemsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeActivity, setActiveActivity] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<"product" | "service">("product");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [formProd, setFormProd] = useState(defaultProduct());
  const [formSvc, setFormSvc] = useState(defaultService());
  const [saving, setSaving] = useState(false);

  const [showStock, setShowStock] = useState<Item | null>(null);
  const [stockMove, setStockMove] = useState({ quantity: 0, move_type: "adjustment", description: "" });
  const [stocking, setStocking] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null);

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) setActiveActivity(d.activities[0].id);
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    fetch(`/api/items?activity_id=${activeActivity}&type=${tab}`)
      .then(r => r.json()).then(d => { if (!cancelled) { setItems(d.items); setError(""); } })
      .catch(() => { if (!cancelled) setError("Failed to load items"); });
    return () => { cancelled = true; };
  }, [activeActivity, tab, refreshKey]);

  function openAdd() {
    setEditTarget(null);
    setFormProd(defaultProduct());
    setFormSvc(defaultService());
    setShowForm(true);
  }

  function openEdit(item: Item) {
    setEditTarget(item);
    if (item.type === "product") {
      setFormProd({ name: item.name, sku: item.sku || "", cost_price: item.cost_price, sale_price: item.sale_price, vat_rate: item.vat_rate, stock_quantity: item.stock_quantity, reorder_level: item.reorder_level });
    } else {
      setFormSvc({ name: item.name, sku: item.sku || "", sale_price: item.sale_price, hourly_rate: item.hourly_rate, unit_of_measure: item.unit_of_measure || "ساعة", vat_rate: item.vat_rate });
    }
    setShowForm(true);
  }

  async function saveItem() {
    const url = editTarget ? `/api/items/${editTarget.id}` : "/api/items";
    const method = editTarget ? "PUT" : "POST";
    const isProduct = tab === "product" || editTarget?.type === "product";

    const body = isProduct
      ? { type: "product", activity_id: activeActivity, name: formProd.name, sku: formProd.sku || null, cost_price: formProd.cost_price, sale_price: formProd.sale_price, vat_rate: formProd.vat_rate, stock_quantity: formProd.stock_quantity, reorder_level: formProd.reorder_level }
      : { type: "service", activity_id: activeActivity, name: formSvc.name, sku: formSvc.sku || null, sale_price: formSvc.sale_price, hourly_rate: formSvc.hourly_rate, unit_of_measure: formSvc.unit_of_measure, vat_rate: formSvc.vat_rate };

    setSaving(true);
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowForm(false); setEditTarget(null); setError(""); refetch();
    } catch { setError("Failed to save"); }
    setSaving(false);
  }

  async function deleteItem(id: string) {
    try {
      const r = await fetch(`/api/items/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setDeleteConfirm(null); setError(""); refetch();
    } catch { setError("Failed to delete"); }
  }

  async function handleStockMove(itemId: string) {
    if (stockMove.quantity === 0) return;
    setStocking(true);
    try {
      const r = await fetch("/api/items/stock-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, quantity: stockMove.quantity, move_type: stockMove.move_type, description: stockMove.description || null, activity_id: activeActivity }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowStock(null); setStockMove({ quantity: 0, move_type: "adjustment", description: "" }); setError(""); refetch();
    } catch { setError("Failed to process stock move"); }
    setStocking(false);
  }

  const filtered = items.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.name.includes(q) || (i.sku && i.sku.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col px-8 py-16 gap-8" dir="rtl">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">الأصناف</h1>
          <p className="text-gray-600">إدارة المنتجات والخدمات — مخزون، تسعير، وتكلفة</p>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="input-field max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1">
              <button onClick={() => setTab("product")} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "product" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>منتجات</button>
              <button onClick={() => setTab("service")} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "service" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>خدمات</button>
            </div>
            <div className="flex-1 min-w-[180px]"><GlassInput placeholder="بحث بالاسم أو SKU..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <GlassButton onClick={openAdd}>+ {tab === "product" ? "منتج" : "خدمة"}</GlassButton>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-12">لا توجد {tab === "product" ? "منتجات" : "خدمات"}. أضف واحداً للبدأ</p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">الاسم</th>
                    {tab === "product" && <th className="text-right px-4 py-3 text-gray-600 font-medium">SKU</th>}
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">سعر البيع</th>
                    {tab === "product" && <th className="text-right px-4 py-3 text-gray-600 font-medium">سعر التكلفة</th>}
                    {tab === "product" && <th className="text-right px-4 py-3 text-gray-600 font-medium">المخزون</th>}
                    {tab === "product" && <th className="text-right px-4 py-3 text-gray-600 font-medium">الحد الأدنى</th>}
                    {tab === "service" && <th className="text-right px-4 py-3 text-gray-600 font-medium">سعر الساعة</th>}
                    {tab === "service" && <th className="text-right px-4 py-3 text-gray-600 font-medium">وحدة القياس</th>}
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">ضريبة</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={item.id} className={i < filtered.length - 1 ? "border-b border-gray-200" : ""}>
                      <td className="px-4 py-3 text-gray-900">{item.name}</td>
                      {tab === "product" && <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku || "—"}</td>}
                      <td className="px-4 py-3 text-emerald-700 font-mono text-xs">{item.sale_price.toFixed(2)}</td>
                      {tab === "product" && <td className="px-4 py-3 text-amber-700 font-mono text-xs">{item.cost_price.toFixed(2)}</td>}
                      {tab === "product" && (
                        <td className="px-4 py-3">
                          <span className={`font-mono text-xs ${item.stock_quantity <= item.reorder_level ? "text-red-300" : "text-gray-800"}`}>
                            {item.stock_quantity}
                          </span>
                        </td>
                      )}
                      {tab === "product" && <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.reorder_level}</td>}
                      {tab === "service" && <td className="px-4 py-3 text-cyan-300 font-mono text-xs">{item.hourly_rate.toFixed(2)}</td>}
                      {tab === "service" && <td className="px-4 py-3 text-gray-500 text-xs">{item.unit_of_measure || "—"}</td>}
                      <td className="px-4 py-3 text-gray-400 text-xs">%{item.vat_rate}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(item)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all text-xs" title="تعديل">⚙</button>
                          {item.type === "product" && (
                            <button onClick={() => { setShowStock(item); setStockMove({ quantity: 0, move_type: "adjustment", description: "" }); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all text-xs" title="حركة مخزون">📦</button>
                          )}
                          <button onClick={() => setDeleteConfirm(item)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-red-500/20 text-gray-600 hover:text-red-300 transition-all text-xs" title="حذف">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editTarget ? `تعديل ${editTarget.name}` : `إضافة ${tab === "product" ? "منتج" : "خدمة"}`}
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">الاسم</label>
                <GlassInput value={tab === "product" ? formProd.name : formSvc.name} onChange={e => tab === "product" ? setFormProd({ ...formProd, name: e.target.value }) : setFormSvc({ ...formSvc, name: e.target.value })} placeholder="اسم الصنف" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">{tab === "product" ? "SKU" : "كود الخدمة"}</label>
                  <GlassInput value={tab === "product" ? formProd.sku : formSvc.sku} onChange={e => tab === "product" ? setFormProd({ ...formProd, sku: e.target.value }) : setFormSvc({ ...formSvc, sku: e.target.value })} placeholder={tab === "product" ? "RT-100" : "SV-001"} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">نسبة الضريبة %</label>
                  <input type="number" step="0.01" min="0" max="100" value={tab === "product" ? formProd.vat_rate : formSvc.vat_rate} onChange={e => tab === "product" ? setFormProd({ ...formProd, vat_rate: parseFloat(e.target.value) || 0 }) : setFormSvc({ ...formSvc, vat_rate: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
              </div>
              {tab === "product" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-600 text-sm">سعر التكلفة</label>
                      <input type="number" step="0.01" min="0" value={formProd.cost_price} onChange={e => setFormProd({ ...formProd, cost_price: parseFloat(e.target.value) || 0 })} className="input-field" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-600 text-sm">سعر البيع</label>
                      <input type="number" step="0.01" min="0" value={formProd.sale_price} onChange={e => setFormProd({ ...formProd, sale_price: parseFloat(e.target.value) || 0 })} className="input-field" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-600 text-sm">كمية المخزون</label>
                      <input type="number" step="1" min="0" value={formProd.stock_quantity} onChange={e => setFormProd({ ...formProd, stock_quantity: parseFloat(e.target.value) || 0 })} className="input-field" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-600 text-sm">حد إعادة الطلب</label>
                      <input type="number" step="1" min="0" value={formProd.reorder_level} onChange={e => setFormProd({ ...formProd, reorder_level: parseFloat(e.target.value) || 0 })} className="input-field" />
                    </div>
                  </div>
                  {formProd.cost_price > 0 && formProd.sale_price > 0 && (
                    <div className="text-xs text-gray-400">
                      الهامش: <span className="text-emerald-700 font-mono">{((formProd.sale_price - formProd.cost_price) / formProd.sale_price * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </>
              )}
              {tab === "service" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-600 text-sm">سعر البيع</label>
                      <input type="number" step="0.01" min="0" value={formSvc.sale_price} onChange={e => setFormSvc({ ...formSvc, sale_price: parseFloat(e.target.value) || 0 })} className="input-field" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-600 text-sm">سعر الساعة</label>
                      <input type="number" step="0.01" min="0" value={formSvc.hourly_rate} onChange={e => setFormSvc({ ...formSvc, hourly_rate: parseFloat(e.target.value) || 0 })} className="input-field" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-600 text-sm">وحدة القياس</label>
                    <select value={formSvc.unit_of_measure} onChange={e => setFormSvc({ ...formSvc, unit_of_measure: e.target.value })} className="input-field cursor-pointer">
                      <option value="ساعة">ساعة</option>
                      <option value="يوم">يوم</option>
                      <option value="شهر">شهر</option>
                      <option value="سنة">سنة</option>
                      <option value="وحدة">وحدة</option>
                      <option value="استشارة">استشارة</option>
                      <option value="عقد">عقد</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={saveItem} disabled={saving || (tab === "product" ? !formProd.name : !formSvc.name)}>
                  {saving ? "جاري الحفظ..." : editTarget ? "حفظ التعديلات" : "إضافة"}
                </GlassButton>
                <GlassButton onClick={() => { setShowForm(false); setEditTarget(null); }} className="">إلغاء</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {showStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <GlassCard className="p-8 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">حركة مخزون</h2>
            <p className="text-gray-500 text-sm mb-6">{showStock.name} <span className="font-mono">(المخزون الحالي: {showStock.stock_quantity})</span></p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">نوع الحركة</label>
                <select value={stockMove.move_type} onChange={e => setStockMove({ ...stockMove, move_type: e.target.value })} className="input-field cursor-pointer">
                  <option value="adjustment">تسوية</option>
                  <option value="purchase">مشتريات</option>
                  <option value="sale">مبيعات</option>
                  <option value="return_in">مرتجع وارد</option>
                  <option value="return_out">مرتجع صادر</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">الكمية</label>
                <input type="number" step="1" min="0" value={stockMove.quantity || ""} onChange={e => setStockMove({ ...stockMove, quantity: parseFloat(e.target.value) || 0 })} className="input-field" placeholder="0" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">الوصف (اختياري)</label>
                <GlassInput value={stockMove.description} onChange={e => setStockMove({ ...stockMove, description: e.target.value })} placeholder="سبب الحركة" />
              </div>
              {["sale", "return_out"].includes(stockMove.move_type) && showStock.cost_price > 0 && (
                <div className="text-xs text-amber-700/70">
                  سيتم إنشاء قيد تكلفة تلقائي: {(showStock.cost_price * stockMove.quantity).toFixed(2)} د.ك
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={() => handleStockMove(showStock.id)} disabled={stocking || stockMove.quantity <= 0}>
                  {stocking ? "جاري التنفيذ..." : "تنفيذ"}
                </GlassButton>
                <GlassButton onClick={() => setShowStock(null)} className="">إلغاء</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <p className="text-gray-900 text-lg mb-2">حذف الصنف</p>
            <p className="text-gray-600 mb-6">{`هل أنت متأكد من حذف "${deleteConfirm.name}"؟`}</p>
            <div className="flex items-center justify-center gap-3">
              <GlassButton onClick={() => deleteItem(deleteConfirm.id)} className="bg-red-500/20 hover:bg-red-500/30">تأكيد الحذف</GlassButton>
              <GlassButton onClick={() => setDeleteConfirm(null)} className="">إلغاء</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
