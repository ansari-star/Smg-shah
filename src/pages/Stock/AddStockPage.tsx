import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, PackagePlus, Plus, Trash2, Building2, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { getLocalState, saveLocalState, sortDescending, fetchCloudState, syncStockBalanceToCloud } from '../../lib/storage';

interface AddStockPageProps {
  onBackToStock: () => void;
}

interface NewStockLine {
  id: string;
  design_number: string;
  size_id: string;
  quantity: string;
  remarks: string;
  isMenuOpen?: boolean;
}

export default function AddStockPage({ onBackToStock }: AddStockPageProps) {
  const [state, setState] = useState(getLocalState());
  const [selectedMasterId, setSelectedMasterId] = useState(state.masters[0]?.id || '');
  const [adjustments, setAdjustments] = useState<Record<string, { qty: string; remarks: string }>>({});
  const [lineToDelete, setLineToDelete] = useState<{ id: string; designNumber: string; size: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetchCloudState().then((latestState) => {
      setState(latestState);
      if (!selectedMasterId && latestState.masters.length > 0) {
        setSelectedMasterId(latestState.masters[0].id);
      }
    });

    const handleStorageUpdate = () => setState(getLocalState());
    window.addEventListener('garment-erp-storage-updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('garment-erp-storage-updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Distinct valid designs jo Design Catalog me maujood hain
  const catalogDesignNumbers = useMemo(() => {
    const set = new Set<string>();
    (state.designs || []).forEach((d: any) => {
      if (d.design_number && d.design_number.trim()) {
        set.add(d.design_number.trim());
      }
    });
    return Array.from(set).sort();
  }, [state.designs]);

  // Nayi input rows
  const [newLines, setNewLines] = useState<NewStockLine[]>([
    {
      id: `new-${Date.now()}-1`,
      design_number: '',
      size_id: state.sizes[0]?.id || '',
      quantity: '',
      remarks: '',
      isMenuOpen: false,
    },
  ]);

  // Existing balances of selected master
  const existingRows = useMemo(() => {
    const list = state.stock_balances.filter((b: any) => b.master_id === selectedMasterId);
    return sortDescending(list);
  }, [state.stock_balances, selectedMasterId]);

  // Handle new entry fields
  const handleNewLineChange = (id: string, field: keyof NewStockLine, val: any) => {
    setValidationError(null);
    setNewLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          const updated = { ...line, [field]: val };
          if (field === 'design_number') {
            updated.isMenuOpen = true;
          }
          return updated;
        }
        return line;
      })
    );
  };

  const handleSelectSuggestedDesign = (id: string, designNum: string) => {
    setValidationError(null);
    setNewLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          return {
            ...line,
            design_number: designNum,
            isMenuOpen: false,
          };
        }
        return line;
      })
    );
  };

  // Add another line button
  const handleAddNewRow = () => {
    setNewLines((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${prev.length + 1}`,
        design_number: '',
        size_id: state.sizes[0]?.id || '',
        quantity: '',
        remarks: '',
        isMenuOpen: false,
      },
    ]);
  };

  // Remove extra new row
  const handleRemoveNewRow = (id: string) => {
    if (newLines.length === 1) {
      setNewLines([
        {
          id: `new-${Date.now()}`,
          design_number: '',
          size_id: state.sizes[0]?.id || '',
          quantity: '',
          remarks: '',
          isMenuOpen: false,
        },
      ]);
    } else {
      setNewLines((prev) => prev.filter((l) => l.id !== id));
    }
  };

  // Handle existing balances change
  const handleExistingChange = (balanceId: string, field: 'qty' | 'remarks', val: string) => {
    setValidationError(null);
    setAdjustments((prev) => ({
      ...prev,
      [balanceId]: {
        qty: field === 'qty' ? val : prev[balanceId]?.qty || '',
        remarks: field === 'remarks' ? val : prev[balanceId]?.remarks || '',
      },
    }));
  };

  // Delete existing stock line
  const executeDeleteStockLine = () => {
    if (!lineToDelete) return;

    const currentState = getLocalState();
    currentState.stock_balances = currentState.stock_balances.filter((b: any) => b.id !== lineToDelete.id);
    saveLocalState(currentState);
    setState({ ...currentState });
    setLineToDelete(null);
    setValidationError(null);
  };

  // Save Stock to database with Catalog Validation
  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Strict Catalog Validation: Sirf Design Catalog wale designs hi add ho sakte hain
    for (const nl of newLines) {
      const dNum = nl.design_number.trim();
      const qtyNum = Number(nl.quantity);

      if (dNum || (!isNaN(qtyNum) && qtyNum !== 0)) {
        if (!dNum) {
          setValidationError('Kripya sabhi bhari hui lines ke liye Design No. select karein.');
          return;
        }

        const isCatalogDesign = catalogDesignNumbers.some(
          (catNum) => catNum.toLowerCase() === dNum.toLowerCase()
        );

        if (!isCatalogDesign) {
          setValidationError(
            `Design "${dNum}" Design Catalog me maujood nahi hai! Sirf catalog wale designs hi add ho sakte hain. Pehle "Design Catalog" tab me jakar naya design add karein.`
          );
          return;
        }

        if (isNaN(qtyNum) || qtyNum === 0) {
          setValidationError(`Design "${dNum}" ke liye valid Pieces count dalein.`);
          return;
        }
      }
    }

    // 2. Strict Negative Guard: Existing negative rows must be settled (>=0) or deleted
    for (const row of existingRows) {
      if (row.quantity < 0) {
        const change = adjustments[row.id]?.qty?.trim() || '';
        const delta = Number(change) || 0;
        const projected = row.quantity + delta;

        if (projected < 0) {
          const des = state.designs.find((d: any) => d.id === row.design_id);
          const sz = state.sizes.find((s: any) => s.id === row.size_id);
          const dName = des?.design_number || 'MG-Lot';
          const sName = sz?.code || 'M';

          setValidationError(
            `Rukye! Design ${dName} (${sName}) ka stock abhi bhi minus (${projected} ps) me hai. Isme pieces add karke 0 ya positive karein, ya delete karein.`
          );
          return;
        }
      }
    }

    const currentState = getLocalState();
    const now = new Date().toISOString();

    // 3. Clean old "Billed in advance" text
    currentState.stock_balances.forEach((b: any) => {
      if (b.remarks && b.remarks.includes('Billed in advance')) {
        b.remarks = '';
      }
    });

    // 4. Save New Lines
    newLines.forEach((nl) => {
      const dNum = nl.design_number.trim();
      const qtyNum = Number(nl.quantity);

      if (dNum && !isNaN(qtyNum) && qtyNum !== 0) {
        const designObj = currentState.designs.find(
          (d: any) => d.design_number.toLowerCase() === dNum.toLowerCase() && d.size_id === nl.size_id
        );

        const designIdToUse = designObj ? designObj.id : `des-${dNum}`;

        const existingBalIdx = currentState.stock_balances.findIndex(
          (b: any) =>
            b.master_id === selectedMasterId &&
            b.size_id === nl.size_id &&
            (b.design_id === designIdToUse ||
              currentState.designs.find((d: any) => d.id === b.design_id)?.design_number.toLowerCase() ===
                dNum.toLowerCase())
        );

        if (existingBalIdx !== -1) {
          currentState.stock_balances[existingBalIdx].quantity += qtyNum;
          if (nl.remarks.trim()) currentState.stock_balances[existingBalIdx].remarks = nl.remarks.trim();
          currentState.stock_balances[existingBalIdx].updated_at = now;
        } else {
          currentState.stock_balances.unshift({
            id: `bal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            master_id: selectedMasterId,
            design_id: designIdToUse,
            size_id: nl.size_id,
            quantity: qtyNum,
            remarks: nl.remarks.trim(),
            created_at: now,
            updated_at: now,
          });
        }
      }
    });

    // 5. Update adjustments on existing rows
    Object.entries(adjustments).forEach(([balanceId, change]) => {
      const delta = Number(change.qty) || 0;
      const idx = currentState.stock_balances.findIndex((b: any) => b.id === balanceId);
      if (idx !== -1) {
        if (delta !== 0 || change.remarks !== undefined) {
          currentState.stock_balances[idx].quantity += delta;
          if (change.remarks !== undefined) {
            currentState.stock_balances[idx].remarks = change.remarks.trim();
          }
          currentState.stock_balances[idx].updated_at = now;
        }
      }
    });

    saveLocalState(currentState);
    setState(currentState);
    onBackToStock();
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-5 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={onBackToStock}
          className="p-2 border rounded-xl hover:bg-slate-50 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Stock
        </button>
        <h1 className="text-base font-black flex items-center gap-1.5 text-slate-900">
          <PackagePlus className="w-5 h-5 text-amber-500" /> Maal Stock Entry
        </h1>
      </div>

      {validationError && (
        <div className="mt-3 p-3.5 bg-red-50 border-2 border-red-300 text-red-800 text-xs rounded-xl flex items-start gap-2.5 font-bold shadow-xs">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{validationError}</div>
        </div>
      )}

      {/* Select Master */}
      <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Building2 className="w-4 h-4 text-slate-500" /> Select Master Section
        </label>
        <select
          value={selectedMasterId}
          onChange={(e) => {
            setSelectedMasterId(e.target.value);
            setValidationError(null);
          }}
          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono cursor-pointer"
        >
          {state.masters.map((m: any) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSaveStock} className="mt-4 space-y-4">
        {/* ==================================================================== */}
        {/* SECTION 1: NAYE MAAL KI FIRST LINE (SUGGESTIONS + CATALOG ONLY)      */}
        {/* ==================================================================== */}
        <div className="bg-white p-4 rounded-2xl border border-amber-300 bg-amber-50/20 shadow-2xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-amber-200">
            <h3 className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-600" /> Naya Design Stock Add Karein
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Catalog Verified Only</span>
          </div>

          <div className="space-y-3">
            {newLines.map((line, idx) => {
              const query = line.design_number.trim().toLowerCase();
              const matchingSuggestions = catalogDesignNumbers.filter((num) =>
                num.toLowerCase().includes(query)
              );

              return (
                <div key={line.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-100">
                    <span className="font-bold text-slate-700 font-mono">Item #{idx + 1}</span>
                    {newLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveNewRow(line.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    {/* Design Number Input with Live Suggestion Popup */}
                    <div className="col-span-12 sm:col-span-4 relative">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Design No. (Catalog Only) *
                      </label>
                      <input
                        type="text"
                        placeholder="Type design..."
                        value={line.design_number}
                        onChange={(e) => handleNewLineChange(line.id, 'design_number', e.target.value)}
                        onFocus={() => handleNewLineChange(line.id, 'isMenuOpen', true)}
                        onBlur={() => {
                          setTimeout(() => handleNewLineChange(line.id, 'isMenuOpen', false), 200);
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />

                      {/* Suggestion Dropdown List */}
                      {line.isMenuOpen && matchingSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {matchingSuggestions.map((sugNum) => (
                            <div
                              key={sugNum}
                              onMouseDown={() => handleSelectSuggestedDesign(line.id, sugNum)}
                              className="p-2 text-xs font-mono font-bold hover:bg-amber-50 cursor-pointer flex items-center justify-between text-slate-800"
                            >
                              <span>Design {sugNum}</span>
                              {line.design_number.trim().toLowerCase() === sugNum.toLowerCase() && (
                                <Check className="w-3.5 h-3.5 text-amber-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Size Selector */}
                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Size *</label>
                      <select
                        value={line.size_id}
                        onChange={(e) => handleNewLineChange(line.id, 'size_id', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold font-mono bg-white cursor-pointer"
                      >
                        {state.sizes.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.code}</option>
                        ))}
                      </select>
                    </div>

                    {/* Pieces (Qty) */}
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Pieces *</label>
                      <input
                        type="number"
                        placeholder="e.g. 144"
                        value={line.quantity}
                        onChange={(e) => handleNewLineChange(line.id, 'quantity', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>

                    {/* Remarks */}
                    <div className="col-span-12 sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Remark (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Blue/Black Lot"
                        value={line.remarks}
                        onChange={(e) => handleNewLineChange(line.id, 'remarks', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* + Add Another Design Line Button */}
          <button
            type="button"
            onClick={handleAddNewRow}
            className="w-full py-2.5 border-2 border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/50 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98"
          >
            <Plus className="w-4 h-4 text-amber-600" />
            <span>+ Add Another Design Line</span>
          </button>
        </div>

        {/* ==================================================================== */}
        {/* SECTION 2: EXISTING STOCKS                                           */}
        {/* ==================================================================== */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 pt-2">
            Is Master Ka Pehle Ka Live Stock ({existingRows.length})
          </div>

          {existingRows.map((row: any) => {
            const des = state.designs.find((d: any) => d.id === row.design_id);
            const sz = state.sizes.find((s: any) => s.id === row.size_id);
            const change = adjustments[row.id]?.qty || '';
            const delta = Number(change) || 0;
            const projected = row.quantity + delta;
            const dNum = des?.design_number || 'MG-Lot';
            const sCode = sz?.code || 'M';
            const isNegative = row.quantity < 0;
            const isProjectedStillNegative = projected < 0;

            return (
              <div
                key={row.id}
                className={`p-3.5 bg-white border rounded-xl shadow-2xs transition ${
                  isNegative && isProjectedStillNegative
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 text-sm">
                      Design {dNum} - {sCode}
                    </span>
                    {isNegative && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded border border-red-300">
                        Pending Advance
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs">
                      Current: <strong className={isNegative ? 'text-red-600' : 'text-slate-800'}>{row.quantity} ps</strong> &rarr; Projected:{' '}
                      <strong className={isProjectedStillNegative ? 'text-red-600' : 'text-emerald-700'}>
                        {projected} ps
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setLineToDelete({ id: row.id, designNumber: dNum, size: sCode })}
                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      title="Line Delete Karein"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isNegative && isProjectedStillNegative && (
                  <div className="my-1.5 text-[11px] text-red-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Ise barabar karne ke liye kam se kam +{Math.abs(row.quantity)} ps dalein ya right side se delete karein.</span>
                  </div>
                )}

                <div className="mt-2 grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <input
                      type="number"
                      placeholder={`e.g. +${Math.abs(row.quantity)}`}
                      value={change}
                      onChange={(e) => handleExistingChange(row.id, 'qty', e.target.value)}
                      className={`w-full p-2 border rounded-lg text-xs font-mono font-bold ${
                        isNegative && isProjectedStillNegative ? 'border-red-400 bg-white text-red-700' : ''
                      }`}
                    />
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      placeholder="Stock Remark (optional)..."
                      defaultValue={row.remarks && row.remarks.includes('Billed in advance') ? '' : row.remarks || ''}
                      onChange={(e) => handleExistingChange(row.id, 'remarks', e.target.value)}
                      className="w-full p-2 border rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="pt-3 border-t">
          <button
            type="submit"
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md uppercase tracking-wider cursor-pointer active:scale-98 transition"
          >
            SAVE STOCK TO DATABASE
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {lineToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-xl border border-red-200">
            <h3 className="font-bold text-sm text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Stock Line Delete Confirmation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kya aap sach me Design <strong>{lineToDelete.designNumber} ({lineToDelete.size})</strong> ki line ko Master ke list se hatana chahte hain?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setLineToDelete(null)}
                className="px-3.5 py-1.5 border rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteStockLine}
                className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Haan, Delete Karein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
