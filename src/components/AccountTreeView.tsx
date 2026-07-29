"use client";

import { useState } from "react";

type Account = {
  id: string;
  activity_id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  account_type: string;
  parent_id: string | null;
  level: number;
  nature: string;
  is_postable: number;
  is_active: number;
  balance: number;
};

type TreeNode = Account & { children: TreeNode[] };

function buildTree(accounts: Account[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const a of accounts) map.set(a.id, { ...a, children: [] });
  for (const a of accounts) {
    const node = map.get(a.id)!;
    if (a.parent_id && map.has(a.parent_id)) map.get(a.parent_id)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

const typeLabels: Record<string, string> = { asset: "أصل", liability: "خصم", equity: "حق ملكية", revenue: "إيراد", expense: "مصروف" };
const typeColors: Record<string, string> = { asset: "text-emerald-300 bg-emerald-500/15 border-emerald-500/20", liability: "text-red-300 bg-red-500/15 border-red-500/20", equity: "text-blue-300 bg-blue-500/15 border-blue-500/20", revenue: "text-violet-300 bg-violet-500/15 border-violet-500/20", expense: "text-amber-300 bg-amber-500/15 border-amber-500/20" };
const natureLabels: Record<string, string> = { debit: "مدين", credit: "دائن" };

type Props = {
  accounts: Account[];
  onAddChild: (parent: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  search: string;
};

export default function AccountTreeView({ accounts, onAddChild, onEdit, onDelete, search }: Props) {
  const tree = buildTree(accounts);
  return (
    <div className="flex flex-col gap-1">
      {tree.map((node) => (
        <TreeNodeView key={node.id} node={node} depth={0} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} search={search} />
      ))}
    </div>
  );
}

function TreeNodeView({ node, depth, onAddChild, onEdit, onDelete, search }: { node: TreeNode; depth: number; onAddChild: (parent: Account) => void; onEdit: (account: Account) => void; onDelete: (account: Account) => void; search: string }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const matchesSearch = search ? node.code.includes(search) || node.name_ar.includes(search) || (node.name_en?.toLowerCase().includes(search.toLowerCase()) ?? false) : true;
  const childMatches = search ? node.children.some(c => descMatches(c, search)) : true;
  if (search && !matchesSearch && !childMatches) return null;

  const showExpander = hasChildren || node.is_postable === 1;

  return (
    <div>
      <div className={`glass flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 ${depth === 0 ? "border-violet-500/30" : ""}`} style={{ marginInlineStart: `${depth * 24}px` }}>
        <button onClick={() => setExpanded(!expanded)} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/90 transition-colors shrink-0">
          {showExpander ? (expanded ? "▼" : "▶") : " "}
        </button>
        <span className="font-mono text-white/90 text-xs w-16 shrink-0">{node.code}</span>
        <span className="text-white/90 font-medium flex-1 truncate">{node.name_ar}</span>
        {node.name_en && <span className="text-white/40 text-xs truncate max-w-[120px] hidden sm:inline">{node.name_en}</span>}
        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${typeColors[node.account_type] || "text-white/60 bg-white/10 border-white/10"}`}>
          {typeLabels[node.account_type] || node.account_type}
        </span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${node.nature === "debit" ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/20" : "text-red-300 bg-red-500/15 border-red-500/20"}`}>
          {natureLabels[node.nature] || node.nature}
        </span>
        {node.is_postable === 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 border border-white/10">غير ترحيل</span>}
        <span className="text-white/60 text-xs w-24 text-left font-mono">{node.balance ? `${Number(node.balance).toLocaleString()}` : ""}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onAddChild(node)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white/90 transition-all text-sm" title="إضافة حساب فرعي">+</button>
          <button onClick={() => onEdit(node)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white/90 transition-all text-sm" title="تعديل">⚙</button>
          <button onClick={() => onDelete(node)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-red-500/20 text-white/60 hover:text-red-300 transition-all text-sm" title="حذف">✕</button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView key={child.id} node={child} depth={depth + 1} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}

function descMatches(node: TreeNode, search: string): boolean {
  if (node.code.includes(search) || node.name_ar.includes(search) || (node.name_en?.toLowerCase().includes(search.toLowerCase()) ?? false)) return true;
  return node.children.some(c => descMatches(c, search));
}
