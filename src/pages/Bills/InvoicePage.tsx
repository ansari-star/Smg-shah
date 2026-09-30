import React, { useMemo } from 'react';
import { ArrowLeft, Printer, Building2 } from 'lucide-react';
import { getLocalState, numberToWordsINR } from '../../lib/storage';

interface InvoicePageProps {
  billId: string;
  onBack: () => void;
}

export default function InvoicePage({ billId, onBack }: InvoicePageProps) {
  const state = getLocalState();
  const bill = useMemo(() => {
    return (state.bills || []).find((b) => String(b.id) === String(billId));
  }, [state.bills, billId]);

  const handlePrint = () => {
    window.print();
  };

  if (!bill) {
    return (
      <div className="p-8 text-center text-xs font-mono">
        Bill nahi mila.{' '}
        <button onClick={onBack} className="underline text-blue-600 cursor-pointer font-bold">
          Wapas Bills List Par Jayein
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans">
      {/* Top Controls Bar */}
      <div className="flex justify-between items-center mb-4 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="p-2 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Wapas Bills List Par
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-colors"
        >
          <Printer className="w-4 h-4 text-amber-400" /> Print Invoice Abhi Kholein
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border border-slate-200 p-8 rounded-2xl print:border-none print:p-0 shadow-sm text-slate-900">
        <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-slate-900 text-amber-400 rounded">
                <Building2 className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black text-slate-900">MOHD GARMENT</h1>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">Garment Manufacturing &amp; Wholesale Jobwork</p>
            <p className="text-[10px] text-slate-400 font-mono">Mumbai, India</p>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs px-2 py-0.5 bg-slate-900 text-white rounded font-bold">DISPATCH INVOICE</span>
            <div className="text-base font-black mt-1">Bill No: C{bill.cycle}-{bill.bill_number}</div>
            <div className="text-[11px] text-slate-500">Date: {bill.bill_date}</div>
          </div>
        </div>

        <div className="my-4 p-3 bg-slate-50 rounded-xl text-xs flex justify-between border border-slate-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To (Consignee):</span>
            <div className="font-extrabold text-sm text-slate-900">{bill.customer_name || 'abc'}</div>
          </div>
          {bill.remarks && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Dispatch Note:</span>
              <div className="font-semibold text-slate-700">{bill.remarks}</div>
            </div>
          )}
        </div>

        <table className="w-full text-xs text-left font-mono my-4 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 bg-slate-100 font-bold uppercase text-[10px]">
              <th className="p-2">#</th>
              <th className="p-2">Design No.</th>
              <th className="p-2">Size</th>
              <th className="p-2 text-right">Quantity</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(bill.items || []).map((item: any, idx: number) => {
              const d = state.designs?.find((design: any) => design.id === item.design_id);
              const s = state.sizes?.find((sz: any) => sz.id === item.size_id);
              const designNumber = (item as unknown as { design_number?: string }).design_number || d?.design_number || 'MG-Lot';
              return (
                <tr key={idx}>
                  <td className="p-2 text-slate-400">{idx + 1}</td>
                  <td className="p-2 font-bold">{designNumber}</td>
                  <td className="p-2">{s?.code || item.size_id || 'M'}</td>
                  <td className="p-2 text-right font-bold">{item.quantity} ps</td>
                  <td className="p-2 text-right">₹{Number(item.rate || 0).toFixed(2)}</td>
                  <td className="p-2 text-right font-bold">
                    ₹{Number(item.amount || item.quantity * item.rate || 0).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
              <td colSpan={3} className="p-2 text-right uppercase">Total:</td>
              <td className="p-2 text-right">{bill.total_pieces} ps</td>
              <td></td>
              <td className="p-2 text-right text-sm">
                ₹{Number(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="p-2.5 bg-slate-100 rounded-lg text-xs italic font-medium">
          Amount in Words: <strong>{numberToWordsINR(Number(bill.total_amount || 0))}</strong>
        </div>

        <div className="mt-12 flex justify-between text-xs text-slate-500 pt-4 border-t border-slate-200">
          <div>Terms: Goods once dispatched are non-refundable.</div>
          <div className="text-right">
            <div className="w-32 border-b border-slate-400 mb-1 ml-auto"></div>
            <strong>For MOHD GARMENT</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
