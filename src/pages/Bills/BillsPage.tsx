import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Printer, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Eye, 
  Building2 
} from 'lucide-react';
import { getLocalState, saveLocalState, sortDescending, numberToWordsINR, fetchCloudState } from '../../lib/storage';

interface BillsPageProps {
  onNavigateNewBill: () => void;
  onViewInvoice?: (billId: string) => void;
}

export default function BillsPage({ onNavigateNewBill }: BillsPageProps) {
  const [state, setState] = useState(getLocalState());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals State
  const [billToDelete, setBillToDelete] = useState<any | null>(null);
  const [viewingBill, setViewingBill] = useState<any | null>(null);
  const [editingBill, setEditingBill] = useState<any | null>(null);

  const reloadData = () => {
    setState(getLocalState());
  };

  useEffect(() => {
    reloadData();
    fetchCloudState().then((latestState) => {
      setState(latestState);
    });

    const handleStorageUpdate = () => setState(getLocalState());
    window.addEventListener('garment-erp-storage-updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('garment-erp-storage-updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const bills = sortDescending(state.bills || []);

  // 1. BULLETPROOF NATIVE PRINT FUNCTION
  const handlePrintBill = (bill: any) => {
    if (!bill) return;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) {
      alert('Kripya browser me pop-up allow karein print kholne ke liye.');
      return;
    }

    const itemsRows = (bill.items || []).map((item: any, idx: number) => {
      const d = state.designs?.find((design: any) => design.id === item.design_id);
      const s = state.sizes?.find((sz: any) => sz.id === item.size_id);
      const dNum = item.design_number || d?.design_number || 'MG-Lot';
      const sCode = s?.code || item.size_id || 'M';
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const amount = Number(item.amount || qty * rate) || 0;

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold; font-family: monospace;">${dNum}</td>
          <td style="padding: 8px; font-family: monospace;">${sCode}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold; font-family: monospace;">${qty} ps</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">₹${rate.toFixed(2)}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold; font-family: monospace;">₹${amount.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const words = numberToWordsINR(Number(bill.total_amount || 0));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill_C${bill.cycle}_${bill.bill_number}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; }
            .company { font-size: 22px; font-weight: 900; margin: 0; }
            .badge { display: inline-block; background: #0f172a; color: white; padding: 4px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; font-family: monospace; }
            .meta-box { margin: 15px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; font-size: 12px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
            th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #0f172a; }
            .total-row { border-top: 2px solid #0f172a; font-weight: bold; background: #f8fafc; }
            .words { background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; font-style: italic; margin-top: 10px; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="company">MOHD GARMENT</h1>
              <div style="font-size: 12px; color: #475569; margin-top: 3px;">Garment Manufacturing & Wholesale Jobwork</div>
              <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">Mumbai, India</div>
            </div>
            <div style="text-align: right; font-family: monospace;">
              <div class="badge">DISPATCH INVOICE</div>
              <div style="font-size: 15px; font-weight: 900; margin-top: 5px;">Bill No: C${bill.cycle}-${bill.bill_number}</div>
              <div style="font-size: 11px; color: #64748b;">Date: ${bill.bill_date}</div>
            </div>
          </div>

          <div class="meta-box">
            <div>
              <span style="color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; display: block;">Consignee:</span>
              <strong style="font-size: 14px;">${bill.customer_name || 'abc'}</strong>
            </div>
            ${bill.remarks ? `
              <div style="text-align: right;">
                <span style="color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; display: block;">Note:</span>
                <span>${bill.remarks}</span>
              </div>
            ` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Design No.</th>
                <th>Size</th>
                <th style="text-align: right;">Quantity</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" style="padding: 8px; text-align: right; text-transform: uppercase;">Total:</td>
                <td style="padding: 8px; text-align: right; font-family: monospace;">${bill.total_pieces} ps</td>
                <td></td>
                <td style="padding: 8px; text-align: right; font-size: 14px; font-family: monospace;">₹${Number(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>

          <div class="words">
            Amount in Words: <strong>${words}</strong>
          </div>

          <div class="footer">
            <div>Terms: Goods once dispatched are checked and non-refundable.</div>
            <div style="text-align: right;">
              <div style="width: 130px; border-bottom: 1px solid #94a3b8; margin-bottom: 4px;"></div>
              <strong>For MOHD GARMENT</strong>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 1500);
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // 2. DELETE BILL
  const executeDeleteBill = () => {
    if (!billToDelete) return;

    try {
      const currentState = getLocalState();
      const targetBill = (currentState.bills || []).find((b: any) => String(b.id) === String(billToDelete.id));

      if (!targetBill) {
        setFeedback({ type: 'error', text: 'Bill data me nahi mila.' });
        setBillToDelete(null);
        return;
      }

      const now = new Date().toISOString();

      if (Array.isArray(targetBill.items)) {
        targetBill.items.forEach((item: any) => {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) return;

          let balIdx = currentState.stock_balances.findIndex((b: any) => {
            const des = currentState.designs.find((d: any) => d.id === b.design_id);
            const matchDesNum = des ? des.design_number === item.design_number : b.design_id === item.design_id;
            return b.master_id === item.master_id && matchDesNum && b.size_id === item.size_id;
          });

          if (balIdx === -1) {
            balIdx = currentState.stock_balances.findIndex((b: any) => {
              const des = currentState.designs.find((d: any) => d.id === b.design_id);
              const matchDesNum = des ? des.design_number === item.design_number : b.design_id === item.design_id;
              return matchDesNum && b.size_id === item.size_id;
            });
          }

          if (balIdx !== -1) {
            currentState.stock_balances[balIdx].quantity += qty;
            currentState.stock_balances[balIdx].updated_at = now;
          } else {
            currentState.stock_balances.unshift({
              id: `bal-rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              master_id: item.master_id || currentState.masters[0]?.id || 'm-1',
              design_id: item.design_id,
              size_id: item.size_id,
              quantity: qty,
              remarks: 'Reversed from deleted bill',
              created_at: now,
              updated_at: now,
            });
          }
        });
      }

      currentState.bills = (currentState.bills || []).filter((b: any) => String(b.id) !== String(billToDelete.id));
      saveLocalState(currentState);
      setState({ ...currentState });

      const dNum = targetBill.bill_number;
      const dCyc = targetBill.cycle;
      setBillToDelete(null);

      setFeedback({
        type: 'success',
        text: `Bill C${dCyc}-${dNum} delete ho gaya aur stock revert ho gaya!`,
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Delete karne me error: ' + (err?.message || '') });
      setBillToDelete(null);
    }
  };

  // 3. EDIT ACTIONS
  const handleOpenEdit = (bill: any) => {
    setEditingBill(JSON.parse(JSON.stringify(bill)));
  };

  const handleLineChange = (index: number, field: 'quantity' | 'rate', value: string) => {
    if (!editingBill) return;
    const nextBill = { ...editingBill };
    const num = Number(value);
    nextBill.items[index][field] = value === '' ? '' : isNaN(num) ? 0 : num;

    const qty = Number(nextBill.items[index].quantity) || 0;
    const rate = Number(nextBill.items[index].rate) || 0;
    nextBill.items[index].amount = qty * rate;

    nextBill.total_pieces = nextBill.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);
    nextBill.total_amount = nextBill.items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);

    setEditingBill(nextBill);
  };

  const handleRemoveLineInEdit = (index: number) => {
    if (!editingBill || editingBill.items.length <= 1) {
      alert('Bill me kam se kam 1 line item hona zaroori hai.');
      return;
    }
    const nextBill = { ...editingBill };
    nextBill.items.splice(index, 1);
    nextBill.total_pieces = nextBill.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);
    nextBill.total_amount = nextBill.items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
    setEditingBill(nextBill);
  };

  const handleSaveFullBillEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;

    const currentState = getLocalState();
    if (!currentState.bills) currentState.bills = [];
    const oldBill = currentState.bills.find((b: any) => String(b.id) === String(editingBill.id));
    if (!oldBill) return;

    const now = new Date().toISOString();

    oldBill.items.forEach((oldItem: any) => {
      const balIdx = currentState.stock_balances.findIndex(
        (b: any) => b.size_id === oldItem.size_id && (b.design_id === oldItem.design_id || !b.design_id)
      );
      if (balIdx !== -1) {
        currentState.stock_balances[balIdx].quantity += Number(oldItem.quantity) || 0;
      }
    });

    editingBill.items.forEach((newItem: any) => {
      const balIdx = currentState.stock_balances.findIndex(
        (b: any) => b.size_id === newItem.size_id && (b.design_id === newItem.design_id || !b.design_id)
      );
      if (balIdx !== -1) {
        currentState.stock_balances[balIdx].quantity -= Number(newItem.quantity) || 0;
        currentState.stock_balances[balIdx].updated_at = now;
      }
    });

    const billIdx = currentState.bills.findIndex((b: any) => String(b.id) === String(editingBill.id));
    if (billIdx !== -1) {
      currentState.bills[billIdx] = {
        ...editingBill,
        total_pieces: Number(editingBill.total_pieces) || 0,
        total_amount: Number(editingBill.total_amount) || 0,
        updated_at: now,
      };
    }

    saveLocalState(currentState);
    setState({ ...currentState });
    setEditingBill(null);

    setFeedback({ type: 'success', text: 'Pura Bill aur Stock update ho gaya!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-5 font-sans">
      {/* Top Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Factory Bills
          </h1>
          <p className="text-xs text-slate-500">Statement layout &bull; View, Print, Edit aur Delete</p>
        </div>
        <button
          type="button"
          onClick={onNavigateNewBill}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
        >
          <Plus className="w-4 h-4" /> <span>New Bill</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. MOBILE RESPONSIVE CARD VIEW (Mobile me screen cut nahi hogi)     */}
      {/* ==================================================================== */}
      <div className="block md:hidden mt-4 space-y-3">
        {bills.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-2xl text-slate-400 text-xs font-mono bg-white">
            Koi bill nahi mila. "New Bill" par click karein.
          </div>
        ) : (
          bills.map((b: any) => (
            <div key={b.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2.5">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                <div>
                  <span className="font-mono font-black text-sm text-slate-900">
                    Bill No: C{b.cycle}-{b.bill_number}
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{b.bill_date}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-sm text-slate-900">
                    ₹{Number(b.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-500">{b.total_pieces} ps</div>
                </div>
              </div>

              {b.remarks && (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg font-mono">
                  <strong className="text-slate-400 uppercase text-[9px] block">Note:</strong>
                  {b.remarks}
                </div>
              )}

              {/* Action Buttons in Full Width Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewingBill(b)}
                  className="py-2 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" /> View Bill
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintBill(b)}
                  className="py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" /> Print Bill
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(b)}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-slate-600" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setBillToDelete(b)}
                  className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==================================================================== */}
      {/* 2. DESKTOP / TABLET STANDARD TABLE VIEW                             */}
      {/* ==================================================================== */}
      <div className="hidden md:block mt-4 border rounded-2xl overflow-hidden shadow-xs bg-white">
        <table className="w-full text-xs text-left font-mono">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3">Bill Date</th>
              <th className="p-3">Bill No</th>
              <th className="p-3">Customer</th>
              <th className="p-3 text-right">Pieces</th>
              <th className="p-3 text-right">Amount (₹)</th>
              <th className="p-3">Dispatch Notes</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Koi bill nahi mila. "Create New Bill" par click karein.
                </td>
              </tr>
            ) : (
              bills.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="p-3">{b.bill_date}</td>
                  <td className="p-3 font-bold text-slate-900">C{b.cycle}-{b.bill_number}</td>
                  <td className="p-3 font-bold">{b.customer_name}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{b.total_pieces} ps</td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    ₹{Number(b.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-slate-500">{b.remarks || '-'}</td>

                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1 w-full">
                        <button
                          type="button"
                          onClick={() => setViewingBill(b)}
                          className="flex-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3 h-3 text-amber-400" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintBill(b)}
                          className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3 h-3 text-amber-300" /> Print
                        </button>
                      </div>

                      <div className="flex items-center gap-1 w-full">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(b)}
                          className="flex-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillToDelete(b)}
                          className="flex-1 px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Bill Modal */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Dispatch Bill View - C{viewingBill.cycle}-{viewingBill.bill_number}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintBill(viewingBill)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4 text-amber-400" /> Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setViewingBill(null)}
                  className="p-1 rounded-lg border text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 border rounded-xl bg-white text-slate-900 font-sans shadow-2xs overflow-x-auto">
              <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900 min-w-[500px]">
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
                  <div className="text-base font-black mt-1">Bill No: C{viewingBill.cycle}-{viewingBill.bill_number}</div>
                  <div className="text-[11px] text-slate-500">Date: {viewingBill.bill_date}</div>
                </div>
              </div>

              <div className="my-4 p-3 bg-slate-50 rounded-xl text-xs flex justify-between font-mono min-w-[500px]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To:</span>
                  <div className="font-extrabold text-sm text-slate-900">{viewingBill.customer_name || 'abc'}</div>
                </div>
                {viewingBill.remarks && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Note:</span>
                    <div className="font-semibold text-slate-700">{viewingBill.remarks}</div>
                  </div>
                )}
              </div>

              <table className="w-full text-xs text-left font-mono my-4 border-collapse min-w-[500px]">
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
                  {(viewingBill.items || []).map((item: any, idx: number) => {
                    const d = state.designs?.find((design: any) => design.id === item.design_id);
                    const s = state.sizes?.find((sz: any) => sz.id === item.size_id);
                    return (
                      <tr key={idx}>
                        <td className="p-2 text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-bold">{item.design_number || d?.design_number || 'MG-Lot'}</td>
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
                    <td className="p-2 text-right">{viewingBill.total_pieces} ps</td>
                    <td></td>
                    <td className="p-2 text-right text-sm">
                      ₹{Number(viewingBill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="p-2.5 bg-slate-100 rounded-lg text-xs italic font-medium font-mono min-w-[500px]">
                Amount in Words: <strong>{numberToWordsINR(Number(viewingBill.total_amount || 0))}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {billToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-red-200 space-y-3">
            <h3 className="font-bold text-sm text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5 shrink-0" />
              <span>Bill Delete Confirmation</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kya aap Bill <strong>C{billToDelete.cycle}-{billToDelete.bill_number}</strong> ko delete karna chahte hain?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-mono text-red-900 space-y-1">
              <div>Total Pieces: <strong>{billToDelete.total_pieces} ps</strong> (Stock me judenge)</div>
              <div>Total Amount: <strong>₹{Number(billToDelete.total_amount || 0).toLocaleString('en-IN')}</strong></div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setBillToDelete(null)}
                className="px-3.5 py-1.5 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteBill}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Haan, Delete Karein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Edit Modal */}
      {editingBill && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <form onSubmit={handleSaveFullBillEdit} className="bg-white p-5 sm:p-6 rounded-2xl max-w-2xl w-full space-y-4 shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Bill C{editingBill.cycle}-{editingBill.bill_number}
              </h3>
              <button type="button" onClick={() => setEditingBill(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Billing Date</label>
                <input
                  type="date"
                  value={editingBill.bill_date}
                  onChange={(e) => setEditingBill({ ...editingBill, bill_date: e.target.value })}
                  className="w-full p-2 border rounded-lg text-xs font-mono bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dispatch Note</label>
                <input
                  type="text"
                  value={editingBill.remarks || ''}
                  onChange={(e) => setEditingBill({ ...editingBill, remarks: e.target.value })}
                  className="w-full p-2 border rounded-lg text-xs bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                Line Items (Pieces aur Rate Edit Karein):
              </label>
              <table className="w-full text-xs text-left font-mono border rounded-xl min-w-[450px]">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2">Design No</th>
                    <th className="p-2">Size</th>
                    <th className="p-2 w-28">Pieces</th>
                    <th className="p-2 w-28">Rate (₹)</th>
                    <th className="p-2 text-right">Line Total</th>
                    <th className="p-2 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editingBill.items.map((item: any, idx: number) => {
                    const d = state.designs.find((des: any) => des.id === item.design_id);
                    const s = state.sizes.find((sz: any) => sz.id === item.size_id);
                    return (
                      <tr key={idx}>
                        <td className="p-2 font-bold">{item.design_number || d?.design_number || 'MG-Lot'}</td>
                        <td className="p-2">{s?.code || 'M'}</td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            className="w-full p-1.5 border rounded font-bold text-xs bg-amber-50/50"
                            required
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.5"
                            value={item.rate}
                            onChange={(e) => handleLineChange(idx, 'rate', e.target.value)}
                            className="w-full p-1.5 border rounded font-bold text-xs bg-amber-50/50"
                            required
                          />
                        </td>
                        <td className="p-2 text-right font-bold">
                          ₹{(Number(item.quantity || 0) * Number(item.rate || 0)).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineInEdit(idx)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center text-xs font-mono font-bold">
              <span>Total Pieces: {editingBill.total_pieces} ps</span>
              <span className="text-amber-400 text-sm">
                ₹{Number(editingBill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                Save Full Bill &amp; Update Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
