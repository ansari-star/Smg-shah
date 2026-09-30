import React, { useMemo } from 'react';
import { ArrowLeft, Printer, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import { getLocalState, saveLocalState, numberToWordsINR } from '../../lib/storage';

interface InvoiceViewPageProps {
  billId: string;
  onBackToBills: () => void;
}

export default function InvoiceViewPage({ billId, onBackToBills }: InvoiceViewPageProps) {
  const state = getLocalState();
  const bill = useMemo(() => {
    return state.bills?.find((b) => b.id === billId);
  }, [state.bills, billId]);

  if (!bill) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center bg-white border border-slate-200 rounded-xl">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">Invoice not found</h2>
        <p className="text-xs text-slate-500 mt-1">This bill may have been deleted or the ID is invalid.</p>
        <button
          onClick={onBackToBills}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
        >
          Return to Bills
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCancelBill = () => {
    if (!confirm(`Are you sure you want to cancel Bill #${bill.bill_number} (Cycle ${bill.cycle})? Stock will be restored to factory balances.`)) {
      return;
    }

    const currentState = getLocalState();
    const bIdx = currentState.bills?.findIndex((b) => b.id === billId);
    if (bIdx !== undefined && bIdx !== -1 && currentState.bills) {
      currentState.bills[bIdx].status = 'CANCELLED';

      // Restore deducted stock balances
      const now = new Date().toISOString();
      currentState.bills[bIdx].items.forEach((item: any) => {
        const balIdx = currentState.stock_balances.findIndex(
          (b: any) => b.master_id === item.master_id && b.design_id === item.design_id && b.size_id === item.size_id
        );
        if (balIdx !== -1) {
          currentState.stock_balances[balIdx].quantity += item.quantity;
          currentState.stock_balances[balIdx].updated_at = now;
        } else {
          currentState.stock_balances.unshift({
            id: `bal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            master_id: item.master_id,
            design_id: item.design_id,
            size_id: item.size_id,
            quantity: item.quantity,
            created_at: now,
            updated_at: now,
          });
        }
      });

      saveLocalState(currentState);
      onBackToBills();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans space-y-4">
      {/* Top Toolbar (no-print) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
        <button
          type="button"
          onClick={onBackToBills}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bills
        </button>

        <div className="flex items-center gap-2">
          {bill.status === 'ACTIVE' && (
            <button
              onClick={handleCancelBill}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Bill</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Sheet */}
      <div className="bg-white border-2 border-slate-900 rounded-xl p-8 shadow-md text-slate-950 font-sans print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                S. MOHD GARMENTS & APPARELS
              </h1>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                Wholesale Garments Manufacturer & Supplier
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                Email: s.mohdgarment@gmail.com · Phone: +91 98201 44521
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block border-2 border-slate-900 px-3 py-1 font-black text-xs tracking-wider uppercase bg-slate-100">
                DISPATCH INVOICE
              </div>
              <div className="mt-2 text-xs font-mono font-bold">
                CYCLE {bill.cycle} / BILL #{String(bill.bill_number).padStart(3, '0')}
              </div>
              {bill.status === 'CANCELLED' && (
                <div className="mt-1 inline-block px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 font-bold text-[10px] rounded">
                  CANCELLED INVOICE
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-300 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Billed To (Customer):</div>
            <div className="text-sm font-bold text-slate-900">{bill.customer_name}</div>
            {bill.customer_phone && (
              <div className="text-xs text-slate-600 font-mono mt-0.5">Mobile: {bill.customer_phone}</div>
            )}
            {bill.remarks && (
              <div className="text-[11px] text-slate-500 mt-1 italic">Note: {bill.remarks}</div>
            )}
          </div>

          <div className="text-right space-y-1 font-mono text-xs">
            <div>
              <span className="text-slate-500 font-sans">Date: </span>
              <span className="font-bold">{bill.bill_date}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Status: </span>
              <span className={bill.status === 'ACTIVE' ? 'font-bold text-emerald-700' : 'font-bold text-red-600'}>
                {bill.status}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Total Qty: </span>
              <span className="font-bold">{bill.total_pieces} Pcs</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-4">
          <table className="w-full text-xs text-left font-mono border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 font-bold uppercase text-[11px]">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Design No</th>
                <th className="py-2.5 px-3 text-center">Size</th>
                <th className="py-2.5 px-3">Cutting Master</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bill.items.map((it: any, idx: number) => {
                const des = state.designs.find((d: any) => d.id === it.design_id);
                const sz = state.sizes.find((s: any) => s.id === it.size_id);
                const mas = state.masters.find((m: any) => m.id === it.master_id);

                return (
                  <tr key={it.id || idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {des?.design_number || it.design_id}
                    </td>
                    <td className="py-2 px-3 text-center font-bold">
                      {sz?.code || it.size_id}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-sans">
                      {mas?.name || 'In-House'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {it.quantity} ps
                    </td>
                    <td className="py-2 px-3 text-right">
                      ₹{it.rate.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      ₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                <td className="py-2.5 px-3 text-center" colSpan={4}>
                  GRAND TOTAL
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                  {bill.total_pieces} ps
                </td>
                <td className="py-2.5 px-3 text-right">—</td>
                <td className="py-2.5 px-3 text-right text-sm font-black text-slate-950">
                  ₹{bill.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Amount in words */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <span className="font-bold text-slate-700">Amount in Words: </span>
          <span className="font-semibold text-slate-900 italic">
            {numberToWordsINR(bill.total_amount)}
          </span>
        </div>

        {/* Footer & Signatures */}
        <div className="mt-8 pt-4 border-t border-slate-300">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="font-bold text-[10px] uppercase text-slate-500 mb-1">
                Terms & Conditions:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-slate-600 space-y-0.5">
                <li>Goods once sold will not be taken back or exchanged.</li>
                <li>Discrepancies to be notified within 24 hours of delivery.</li>
                <li>Interest @ 18% p.a. applicable on delayed settlements.</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center mt-6">
              <div className="border-t border-slate-400 pt-2">
                <p className="text-[11px] font-semibold text-slate-700">Customer Signature</p>
                <p className="text-[9px] text-slate-400 mt-1">(Received in Good Condition)</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="text-[11px] font-semibold text-slate-700">For S. Mohd Garments</p>
                <p className="text-[9px] text-slate-400 mt-1">(Authorized Signatory)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
