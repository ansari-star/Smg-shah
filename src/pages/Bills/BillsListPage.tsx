import React, { useState, useMemo } from 'react';
import { Plus, Search, FileText, Printer, Eye, Ban, Calendar, User } from 'lucide-react';
import { getLocalState, sortDescending } from '../../lib/storage';

interface BillsListPageProps {
  onNavigateNewBill: () => void;
  onViewInvoice: (billId: string) => void;
}

export default function BillsListPage({ onNavigateNewBill, onViewInvoice }: BillsListPageProps) {
  const state = getLocalState();
  const [searchQuery, setSearchQuery] = useState('');

  const sortedBills = useMemo(() => {
    let list = sortDescending(state.bills || []);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(q) ||
          String(b.bill_number).includes(q) ||
          (b.customer_phone || '').includes(q) ||
          (b.remarks || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.bills, searchQuery]);

  const totalBilledPcs = useMemo(() => {
    return (state.bills || [])
      .filter((b) => b.status === 'ACTIVE')
      .reduce((sum, b) => sum + (b.total_pieces || 0), 0);
  }, [state.bills]);

  const totalBilledAmount = useMemo(() => {
    return (state.bills || [])
      .filter((b) => b.status === 'ACTIVE')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);
  }, [state.bills]);

  return (
    <div className="max-w-5xl mx-auto p-4 font-sans space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Dispatch Invoices & Bills
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-numbered cycle (1..1000) invoices with instant stock deduction
          </p>
        </div>

        <button
          onClick={onNavigateNewBill}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>+ New Dispatch Bill</span>
        </button>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-500">Active Invoices</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {(state.bills || []).filter((b) => b.status === 'ACTIVE').length} Bills
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-500">Total Pieces Dispatched</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {totalBilledPcs.toLocaleString()} ps
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-500">Total Invoiced Amount</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            ₹{totalBilledAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Customer name, Bill #, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
        />
      </div>

      {/* Invoices List Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        {sortedBills.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs font-mono">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No dispatch invoices registered yet. Click "+ New Dispatch Bill" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-3">Bill No.</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer / Party</th>
                  <th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Total Pcs</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      C{b.cycle}-#{String(b.bill_number).padStart(3, '0')}
                    </td>
                    <td className="p-3 text-slate-600">{b.bill_date}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 font-sans">{b.customer_name}</div>
                      {b.customer_phone && (
                        <div className="text-[10px] text-slate-500 font-mono">{b.customer_phone}</div>
                      )}
                    </td>
                    <td className="p-3 text-right">{b.items?.length || 0}</td>
                    <td className="p-3 text-right font-bold">{b.total_pieces} ps</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ₹{b.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onViewInvoice(b.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
