'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from 'lucide-react';
import { NoTransactions } from '@/components/empty/NoTransactions';
import type { TxRow } from '@/hooks/useTransactionHistory';
import type { TxSort } from '@/hooks/useTransactionHistory';

interface Props {
  rows: TxRow[];
  sort: TxSort;
  onSort: (field: TxSort['field']) => void;
  onRowClick: (tx: TxRow) => void;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    confirmed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    pending:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    failed:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    contribution: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    payout:       'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    refund:       'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  );
}

function AmountCell({ amount, type }: { amount: number; type: string }) {
  const positive = type === 'payout' || type === 'refund';
  return (
    <span className={`font-semibold tabular-nums ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-slate-100'}`}>
      {positive ? '+' : ''}{amount.toLocaleString()} XLM
    </span>
  );
}

function SortIcon({ field, sort }: { field: TxSort['field']; sort: TxSort }) {
  if (sort.field !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return sort.direction === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
    : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />;
}

const thCls = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap select-none';
const sortableCls = `${thCls} cursor-pointer hover:text-gray-700 dark:hover:text-slate-200 transition-colors`;

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" style={{ width: `${60 + (j * 13) % 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionsTable({ rows, sort, onSort, onRowClick, isLoading }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
            <tr>
              <th
                className={sortableCls}
                onClick={() => onSort('date')}
              >
                <span className="flex items-center gap-1">Date <SortIcon field="date" sort={sort} /></span>
              </th>
              <th
                className={sortableCls}
                onClick={() => onSort('type')}
              >
                <span className="flex items-center gap-1">Type <SortIcon field="type" sort={sort} /></span>
              </th>
              <th
                className={sortableCls}
                onClick={() => onSort('amount')}
              >
                <span className="flex items-center gap-1">Amount <SortIcon field="amount" sort={sort} /></span>
              </th>
              <th
                className={sortableCls}
                onClick={() => onSort('groupName')}
              >
                <span className="flex items-center gap-1">Group <SortIcon field="groupName" sort={sort} /></span>
              </th>
              <th
                className={sortableCls}
                onClick={() => onSort('member')}
              >
                <span className="flex items-center gap-1">Member <SortIcon field="member" sort={sort} /></span>
              </th>
              <th
                className={sortableCls}
                onClick={() => onSort('status')}
              >
                <span className="flex items-center gap-1">Status <SortIcon field="status" sort={sort} /></span>
              </th>
              <th className={thCls}>Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {isLoading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-gray-400 dark:text-slate-500">
                  <NoTransactions />
                </td>
              </tr>
            ) : (
              rows.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => onRowClick(tx)}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                    {new Date(tx.timestamp || tx.date || '').toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={tx.type} /></td>
                  <td className="px-4 py-3"><AmountCell amount={tx.amount} type={tx.type} /></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-300 max-w-[140px] truncate">
                    {tx.groupName ?? tx.groupId}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-slate-400 max-w-[140px] truncate">
                    {tx.member}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {tx.hash ? (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        aria-label="View on Stellar Expert"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
