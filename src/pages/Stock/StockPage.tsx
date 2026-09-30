import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Copy, Check, ChevronDown, Package, History, Calendar, RotateCcw, X, Shield } from 'lucide-react';
import { getLocalState, sortDescending, fetchCloudState } from '../../lib/storage';
import { AppUser } from '../../lib/auth';

interface StockPageProps {
  onNavigateAddStock: () => void;
  pageTitle?: string;
  currentUser?: AppUser | null;
}

export default function StockPage({ onNavigateAddStock, pageTitle = 'STOCK VIEW', currentUser }: StockPageProps) {
  const [state, setState] = useState(getLocalState());
  const [filterMode, setFilterMode] = useState<'all_masters' | 'design_wise'>('all_masters');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [histFromDate, setHistFromDate] = useState('');
  const [histToDate, setHistToDate] = useState('');
  const histFromRef = useRef<HTMLInputElement>(null);
  const histToRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

  const isOwner = currentUser?.role === 'OWNER';
  const isMaster = currentUser?.role === 'MASTER';
  const isManager = currentUser?.role === 'MANAGER';

  // 1. Master filter
  const filteredBalances = useMemo(() => {
    let list = state.stock_balances || [];
    if (currentUser?.role === 'MASTER' && currentUser?.master_id) {
      list = list.filter((b: any) => b.master_id === currentUser.master_id);
    }
    return list;
  }, [state.stock_balances, currentUser]);

  // Filtered and Descending-sorted balances
  const displayItems = useMemo(() => {
    let list = sortDescending(filteredBalances);

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const des = state.designs.find((d) => d.id === item.design_id);
        const m = state.masters.find((mas) => mas.id === item.master_id);
        return (
          des?.design_number.toLowerCase().includes(q) ||
          m?.name.toLowerCase().includes(q) ||
          item.remarks?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [filteredBalances, state.designs, state.masters, searchQuery]);

  // Master-Wise Grouping
  const masterGroups = useMemo(() => {
    const map = new Map<string, { masterName: string; lines: typeof displayItems }>();
    displayItems.forEach((b) => {
      const m = state.masters.find((mas) => mas.id === b.master_id);
      const name = m?.name || 'Master';
      if (!map.has(b.master_id)) map.set(b.master_id, { masterName: name, lines: [] });
      map.get(b.master_id)!.lines.push(b);
    });
    return Array.from(map.values());
  }, [displayItems, state.masters]);

  // Design-Wise Grouping
  const designGroups = useMemo(() => {
    const map = new Map<string, { designNumber: string; lines: typeof displayItems }>();
    displayItems.forEach((b) => {
      const des = state.designs.find((d) => d.id === b.design_id);
      const dNum = des?.design_number || 'MG-Lot';
      if (!map.has(dNum)) map.set(dNum, { designNumber: dNum, lines: [] });
      map.get(dNum)!.lines.push(b);
    });
    return Array.from(map.values());
  }, [displayItems, state.designs]);

  // Helper to get unit rate for design line
  const getItemRate = (designId: string, sizeId: string) => {
    const des = state.designs.find((d) => d.id === designId && d.size_id === sizeId);
    if (des && des.rate !== undefined && des.rate !== null && !isNaN(Number(des.rate))) {
      return Number(des.rate);
    }
    // Fallback if matching design_number
    const anyDes = state.designs.find((d) => d.id === designId);
    if (anyDes) {
      const sameNum = state.designs.find((d) => d.design_number === anyDes.design_number && d.size_id === sizeId);
      if (sameNum && sameNum.rate) return Number(sameNum.rate);
      return Number(anyDes.rate || 0);
    }
    return 0;
  };

  // WhatsApp text copy
  const handleCopyWhatsApp = () => {
    let text = `*MOHD GARMENT LIVE STOCK*\n`;
    text += `Date: ${new Date().toLocaleDateString('en-GB')}\n\n`;

    if (filterMode === 'design_wise') {
      designGroups.forEach((g) => {
        text += `Design ${g.designNumber}\n`;
        g.lines.forEach((l) => {
          const m = state.masters.find((mas) => mas.id === l.master_id);
          const sz = state.sizes.find((s) => s.id === l.size_id);
          const remText = l.remarks && l.remarks.trim() ? ` (${l.remarks.trim()})` : '';
          text += `${m?.name || 'Master'} = ${sz?.code || 'M'} = ${l.quantity} ps${remText}\n`;
        });
        text += `------------------------------------\n`;
      });
    } else {
      masterGroups.forEach((g) => {
        text += `${g.masterName}\n`;
        g.lines.forEach((l) => {
          const des = state.designs.find((d) => d.id === l.design_id);
          const sz = state.sizes.find((s) => s.id === l.size_id);
          const remText = l.remarks && l.remarks.trim() ? ` (${l.remarks.trim()})` : '';
          text += `${des?.design_number || 'Lot'} = ${sz?.code || 'M'} = ${l.quantity} ps${remText}\n`;
        });
        text += `------------------------------------\n`;
      });
    }

    const totalPieces = displayItems.reduce((acc: number, curr) => acc + curr.quantity, 0);
    text += `\nTotal: ${totalPieces} ps`;

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
          fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
    } catch {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (txt: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = txt;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  // Stock History Date-to-Date Filter
  const filteredHistoryList = useMemo(() => {
    let list = sortDescending(filteredBalances);
    if (histFromDate) {
      list = list.filter((b) => {
        const d = (b.updated_at || b.created_at || '').split('T')[0];
        return d >= histFromDate;
      });
    }
    if (histToDate) {
      list = list.filter((b) => {
        const d = (b.updated_at || b.created_at || '').split('T')[0];
        return d <= histToDate;
      });
    }
    return list;
  }, [filteredBalances, histFromDate, histToDate]);

  const totalPcs = displayItems.reduce((acc: number, curr) => acc + curr.quantity, 0);

  // OWNER ONLY: Grand Total Amount of live stock
  const grandTotalAmount = useMemo(() => {
    if (currentUser?.role !== 'OWNER') return 0;
    return displayItems.reduce((acc: number, curr) => {
      const catalogRate = getItemRate(curr.design_id, curr.size_id);
      return acc + (curr.quantity * (catalogRate || 0));
    }, 0);
  }, [displayItems, currentUser, state.designs]);

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
        <div>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>{pageTitle}</span>
            {isMaster && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                Master View
              </span>
            )}
            {isManager && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                Manager View (No Rate)
              </span>
            )}
            {isOwner && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                Owner View (Full Rates)
              </span>
            )}
          </h1>
        </div>

        {/* History Button at top of Stock View */}
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
        >
          <History className="w-4 h-4 text-amber-400" />
          <span>Stock History</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search design, master, remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono focus:bg-white focus:outline-none focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="appearance-none pl-3 pr-7 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-white cursor-pointer focus:outline-none focus:border-slate-900"
            >
              <option value="all_masters">Master Wise</option>
              <option value="design_wise">Design Wise</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-3 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
            title="Copy exact WhatsApp text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copied ? 'Copied WhatsApp!' : 'Copy WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateAddStock}
            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors shadow-2xs"
            title="Add Stock"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stock Feed */}
      {displayItems.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-300 rounded-2xl text-slate-400 text-xs font-mono bg-slate-50/50">
          <Package className="w-6 h-6 mx-auto mb-1 text-slate-300" />
          Koi stock data nahi hai. Add Stock par click karein.
        </div>
      ) : filterMode === 'design_wise' ? (
        <div>
          {designGroups.map((g) => (
            <div key={g.designNumber} className="mb-4">
              <div className="font-bold text-slate-900 text-base leading-tight">Design {g.designNumber}</div>
              <div className="mt-1 font-mono text-xs text-slate-800 space-y-1">
                {g.lines.map((l) => {
                  const m = state.masters.find((mas) => mas.id === l.master_id);
                  const sz = state.sizes.find((s) => s.id === l.size_id);
                  const unitRate = getItemRate(l.design_id, l.size_id);
                  const lineTotal = l.quantity * unitRate;

                  return (
                    <div key={l.id} className="py-0.5 flex flex-wrap items-center justify-between">
                      <div>
                        <span>{m?.name || 'Master'}</span>
                        <span className="mx-1.5 text-slate-400">=</span>
                        <span>{sz?.code || 'M'}</span>
                        <span className="mx-1.5 text-slate-400">=</span>
                        <span className={l.quantity < 0 ? 'text-red-600 font-bold' : 'font-bold'}>{l.quantity} ps</span>
                        {l.remarks && <span className="text-slate-500 ml-1.5">({l.remarks})</span>}
                      </div>

                      {/* Rate Calculation - Sirf Owner ke liye */}
                      {currentUser?.role === 'OWNER' && (
                        <span className="text-blue-700 font-bold ml-2">
                          ₹{(l.quantity * (unitRate || 0)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <hr className="border-t border-slate-300 my-3" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {masterGroups.map((g) => (
            <div key={g.masterName} className="mb-4">
              <div className="font-bold text-slate-900 text-base leading-tight">{g.masterName}</div>
              <div className="mt-1 font-mono text-xs text-slate-800 space-y-1">
                {g.lines.map((l) => {
                  const des = state.designs.find((d) => d.id === l.design_id);
                  const sz = state.sizes.find((s) => s.id === l.size_id);
                  const unitRate = getItemRate(l.design_id, l.size_id);

                  return (
                    <div key={l.id} className="py-0.5 flex flex-wrap items-center justify-between">
                      <div>
                        <span>{des?.design_number || 'Lot'}</span>
                        <span className="mx-1.5 text-slate-400">=</span>
                        <span>{sz?.code || 'M'}</span>
                        <span className="mx-1.5 text-slate-400">=</span>
                        <span className={l.quantity < 0 ? 'text-red-600 font-bold' : 'font-bold'}>{l.quantity} ps</span>
                        {l.remarks && <span className="text-slate-500 ml-1.5">({l.remarks})</span>}
                      </div>

                      {/* Rate Calculation - Sirf Owner ke liye */}
                      {currentUser?.role === 'OWNER' && (
                        <span className="text-blue-700 font-bold ml-2">
                          ₹{(l.quantity * (unitRate || 0)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <hr className="border-t border-slate-300 my-3" />
            </div>
          ))}
        </div>
      )}

      {/* Grand Total Footer - Sirf Owner ko Total Amount dikhega */}
      <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center text-xs font-mono font-bold mt-6 shadow-2xs">
        <span>Total Pieces: {totalPcs.toLocaleString()} ps</span>
        {currentUser?.role === 'OWNER' && (
          <span className="text-amber-400 text-sm">Total Value: ₹{grandTotalAmount.toLocaleString('en-IN')}</span>
        )}
      </div>

      {/* ==================================================================== */}
      {/* STOCK HISTORY MODAL (Date to Date Selection & Full Update List)      */}
      {/* ==================================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-6 max-h-[90vh] flex flex-col border border-slate-200">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl font-bold">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900">Stock Update History</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Date to date stock entry tracking</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date to Date Picker Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">From:</span>
                <div className="relative flex items-center">
                  <input
                    ref={histFromRef}
                    type="date"
                    value={histFromDate}
                    onChange={(e) => setHistFromDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-l-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        histFromRef.current?.showPicker?.();
                      } catch {
                        histFromRef.current?.focus();
                      }
                    }}
                    className="p-1.5 border border-l-0 border-slate-300 rounded-r-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">To:</span>
                <div className="relative flex items-center">
                  <input
                    ref={histToRef}
                    type="date"
                    value={histToDate}
                    onChange={(e) => setHistToDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-l-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        histToRef.current?.showPicker?.();
                      } catch {
                        histToRef.current?.focus();
                      }
                    }}
                    className="p-1.5 border border-l-0 border-slate-300 rounded-r-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {(histFromDate || histToDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setHistFromDate('');
                    setHistToDate('');
                  }}
                  className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}

              <span className="ml-auto text-xs font-mono text-slate-500">
                Filtered: <strong>{filteredHistoryList.length}</strong> updates
              </span>
            </div>

            {/* History Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-900 text-white sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">Date &amp; Time</th>
                    <th className="p-2.5">Master</th>
                    <th className="p-2.5">Design No.</th>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5 text-right">Quantity</th>
                    <th className="p-2.5">Remarks / Lot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Is date range me koi history record nahi mila.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryList.map((item) => {
                      const m = state.masters.find((mas) => mas.id === item.master_id);
                      const des = state.designs.find((d) => d.id === item.design_id);
                      const sz = state.sizes.find((s) => s.id === item.size_id);
                      const dt = item.updated_at || item.created_at;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-500 whitespace-nowrap">
                            {dt ? new Date(dt).toLocaleString('en-IN') : '-'}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{m?.name || 'Master'}</td>
                          <td className="p-2.5 font-bold text-slate-900">{des?.design_number || 'MG-Lot'}</td>
                          <td className="p-2.5">{sz?.code || 'M'}</td>
                          <td className="p-2.5 text-right font-black">
                            <span className={item.quantity < 0 ? 'text-red-600' : 'text-slate-900'}>
                              {item.quantity} ps
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">{item.remarks || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
