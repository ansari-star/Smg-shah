import React, { useState, useMemo, useEffect } from 'react';
import { Scissors, Search, Edit2, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { getLocalState, saveLocalState, sortDescending, fetchCloudState, syncDesignToCloud } from '../../lib/storage';
import { AppUser } from '../../lib/auth';

interface DesignMasterPageProps {
  currentUser?: AppUser | null;
}

export default function DesignMasterPage({ currentUser }: DesignMasterPageProps = {}) {
  const isMaster = currentUser?.role === 'MASTER';
  const [activeTab, setActiveTab] = useState<'catalog' | 'add_design' | 'set_size'>('catalog');
  const [state, setState] = useState(getLocalState());
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for Add Design
  const [designNumber, setDesignNumber] = useState('');
  const [sizeRates, setSizeRates] = useState<Record<string, { rate: string; mrp: string }>>({});
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

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

  // Size Form states
  const [sizeCode, setSizeCode] = useState('');

  // Edit / Delete Confirmation States for Design Catalog
  const [editingDesign, setEditingDesign] = useState<{ id: string; design_number: string; rate: number; mrp: number } | null>(null);
  const [designToDelete, setDesignToDelete] = useState<{ id: string; design_number: string; size_code: string } | null>(null);

  // Edit / Delete Confirmation States for Sizes
  const [editingSize, setEditingSize] = useState<{ id: string; code: string; sort_order: number } | null>(null);
  const [sizeToDelete, setSizeToDelete] = useState<{ id: string; code: string } | null>(null);

  const sortedDesigns = useMemo(() => {
    let list = sortDescending(state.designs);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => d.design_number.toLowerCase().includes(q));
    }
    return list;
  }, [state.designs, searchQuery]);

  const handleRateChange = (sizeId: string, field: 'rate' | 'mrp', val: string) => {
    setSizeRates((prev) => ({
      ...prev,
      [sizeId]: {
        rate: field === 'rate' ? val : prev[sizeId]?.rate || '',
        mrp: field === 'mrp' ? val : prev[sizeId]?.mrp || '',
      },
    }));
  };

  const handleSaveDesignMultiSizes = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);
    const trimmedNum = designNumber.trim();
    if (!trimmedNum) return;

    const currentState = getLocalState();

    // 1. DUPLICATE CHECK: Exact same name pehle se exist karta hai ya nahi
    const isAlreadyExists = (currentState.designs || []).some(
      (d) => d.design_number.trim().toLowerCase() === trimmedNum.toLowerCase()
    );

    if (isAlreadyExists) {
      setDuplicateError(
        `Design "${trimmedNum}" pehle se maujood hai! Agar ye naya variant hai toh name me kuch extra jodiye (e.g. ${trimmedNum}-A ya ${trimmedNum} New).`
      );
      return;
    }

    const now = new Date().toISOString();

    state.sizes.forEach((s) => {
      const enteredRate = sizeRates[s.id]?.rate?.trim();
      const enteredMrp = sizeRates[s.id]?.mrp?.trim();
      const finalRate = enteredRate !== '' && !isNaN(Number(enteredRate)) ? Number(enteredRate) : 0;
      const finalMrp = enteredMrp !== '' && !isNaN(Number(enteredMrp)) ? Number(enteredMrp) : 0;

      currentState.designs.unshift({
        id: `des-${Date.now()}-${s.id}`,
        design_number: trimmedNum,
        size_id: s.id,
        rate: finalRate,
        mrp_sticker: finalMrp,
        created_at: now,
        updated_at: now,
      });
    });

    saveLocalState(currentState);
    setState(currentState);
    setDesignNumber('');
    setSizeRates({});
    setDuplicateError(null);
    setActiveTab('catalog');
  };

  const handleUpdateSingleDesign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesign) return;

    const currentState = getLocalState();
    const idx = currentState.designs.findIndex((d) => d.id === editingDesign.id);
    if (idx !== -1) {
      currentState.designs[idx].rate = Number(editingDesign.rate) || 0;
      currentState.designs[idx].mrp_sticker = Number(editingDesign.mrp) || 0;
      currentState.designs[idx].updated_at = new Date().toISOString();
      saveLocalState(currentState);
      setState(currentState);
    }
    setEditingDesign(null);
  };

  // 1. EXECUTE DESIGN DELETE (Confirmation modal se confirm hone ke baad)
  const executeDeleteDesign = () => {
    if (!designToDelete) return;

    const currentState = getLocalState();
    currentState.designs = currentState.designs.filter((d) => d.id !== designToDelete.id);
    saveLocalState(currentState);
    setState(currentState);
    setDesignToDelete(null);
  };

  // Size Actions
  const handleSaveSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sizeCode.trim()) return;

    const currentState = getLocalState();
    currentState.sizes.unshift({
      id: `sz-${Date.now()}`,
      code: sizeCode.trim(),
      sort_order: currentState.sizes.length + 1,
      created_at: new Date().toISOString(),
    });

    saveLocalState(currentState);
    setState(currentState);
    setSizeCode('');
  };

  const handleUpdateSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSize || !editingSize.code.trim()) return;

    const currentState = getLocalState();
    const idx = currentState.sizes.findIndex((s) => s.id === editingSize.id);
    if (idx !== -1) {
      currentState.sizes[idx].code = editingSize.code.trim();
      currentState.sizes[idx].sort_order = Number(editingSize.sort_order) || 0;
      saveLocalState(currentState);
      setState(currentState);
    }
    setEditingSize(null);
  };

  const executeDeleteSize = () => {
    if (!sizeToDelete) return;

    const currentState = getLocalState();
    currentState.sizes = currentState.sizes.filter((s) => s.id !== sizeToDelete.id);
    saveLocalState(currentState);
    setState(currentState);
    setSizeToDelete(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 font-sans">
      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-purple-600" /> Design Catalog &amp; Rates
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 my-4 bg-slate-100 p-1 rounded-xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'catalog' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
        >
          1. Design Catalog ({sortedDesigns.length})
        </button>
        {!isMaster && (
          <>
            <button
              onClick={() => setActiveTab('add_design')}
              className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'add_design' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              2. + Add New Design (All Sizes)
            </button>
            <button
              onClick={() => setActiveTab('set_size')}
              className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'set_size' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              3. Set Sizes ({state.sizes.length})
            </button>
          </>
        )}
      </div>

      {/* 1. Catalog View */}
      {activeTab === 'catalog' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search design number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono focus:bg-white focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-3">Design No.</th>
                  <th className="p-3">Size</th>
                  <th className="p-3 text-right">Wholesale Rate (₹)</th>
                  <th className="p-3 text-right text-amber-300">MRP Rate (₹)</th>
                  {currentUser?.role !== 'MASTER' && (
                    <th className="p-3 text-center">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDesigns.map((d) => {
                  const sz = state.sizes.find((s) => s.id === d.size_id);
                  const sizeLabel = sz?.code || 'M';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900 text-sm">{d.design_number}</td>
                      <td className="p-3">{sizeLabel}</td>
                      <td className="p-3 text-right font-bold">₹{d.rate.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-amber-800">
                        {d.mrp_sticker ? `₹${d.mrp_sticker.toFixed(2)}` : '₹0.00'}
                      </td>
                      {currentUser?.role !== 'MASTER' && (
                        <td className="p-3 text-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingDesign({ id: d.id, design_number: d.design_number, rate: d.rate, mrp: d.mrp_sticker || 0 })}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" /> Edit
                          </button>
                          {/* Delete button opens on-screen modal */}
                          <button
                            type="button"
                            onClick={() => setDesignToDelete({ id: d.id, design_number: d.design_number, size_code: sizeLabel })}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Add New Design Form */}
      {activeTab === 'add_design' && (
        <form onSubmit={handleSaveDesignMultiSizes} className="bg-white p-5 rounded-2xl border max-w-xl space-y-4 shadow-2xs">
          <h3 className="font-bold text-sm text-slate-900">Naya Design Daliye (All Sizes)</h3>
          
          {duplicateError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{duplicateError}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Design No. *</label>
            <input
              type="text"
              required
              placeholder="e.g. 55291, 7701"
              value={designNumber}
              onChange={(e) => {
                setDesignNumber(e.target.value);
                setDuplicateError(null);
              }}
              className="w-full p-2.5 border rounded-lg text-xs font-mono font-bold bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Size Wise Rates (Khali chhodne par Rate = 0 save hoga)
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5">Size Code</th>
                    <th className="p-2.5">Wholesale Rate (₹)</th>
                    <th className="p-2.5">MRP Rate (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.sizes.map((s) => (
                    <tr key={s.id}>
                      <td className="p-2.5 font-bold text-slate-800">{s.code}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="0.00"
                          value={sizeRates[s.id]?.rate || ''}
                          onChange={(e) => handleRateChange(s.id, 'rate', e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono font-bold focus:outline-none focus:border-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="1"
                          placeholder="0.00"
                          value={sizeRates[s.id]?.mrp || ''}
                          onChange={(e) => handleRateChange(s.id, 'mrp', e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-900"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button type="submit" className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors">
            Save Design Across All Sizes
          </button>
        </form>
      )}

      {/* 3. Set Size Tab */}
      {activeTab === 'set_size' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveSize} className="flex gap-2 max-w-sm">
            <input
              type="text"
              placeholder="Size Code (e.g. 24/34)"
              value={sizeCode}
              onChange={(e) => setSizeCode(e.target.value)}
              className="flex-1 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-slate-900"
              required
            />
            <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs">
              Add Size
            </button>
          </form>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-w-md shadow-2xs">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2.5">Size Code</th>
                  <th className="p-2.5 text-center">Order</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.sizes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{s.code}</td>
                    <td className="p-2.5 text-center text-slate-500">{s.sort_order}</td>
                    <td className="p-2.5 text-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingSize({ id: s.id, code: s.code, sort_order: s.sort_order })}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit Size"
                      >
                        <Edit2 className="w-3 h-3 text-slate-600" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeToDelete({ id: s.id, code: s.code })}
                        className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Delete Size"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ON-SCREEN CONFIRMATION MODALS (Popup blocker se completely safe)     */}
      {/* ==================================================================== */}

      {/* 1. Design Catalog Delete Confirmation Modal */}
      {designToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-red-200 space-y-3">
            <h3 className="font-bold text-sm text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Design Delete Confirmation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kya aap sach me Design <strong>&quot;{designToDelete.design_number}&quot; ({designToDelete.size_code})</strong> ko catalog se delete karna chahte hain?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDesignToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteDesign}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
              >
                Haan, Delete Karein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Size Delete Confirmation Modal */}
      {sizeToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-red-200 space-y-3">
            <h3 className="font-bold text-sm text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Size Delete Confirmation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kya aap sach me size group <strong>&quot;{sizeToDelete.code}&quot;</strong> ko catalog se delete karna chahte hain?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSizeToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteSize}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
              >
                Haan, Delete Karein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Edit Design Rate Modal */}
      {editingDesign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUpdateSingleDesign} className="bg-white p-5 rounded-2xl max-w-xs w-full space-y-3 shadow-xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Edit Design {editingDesign.design_number} Rate</h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Wholesale Rate (₹)</label>
              <input
                type="number"
                step="0.5"
                value={editingDesign.rate}
                onChange={(e) => setEditingDesign({ ...editingDesign, rate: Number(e.target.value) })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">MRP Rate (₹)</label>
              <input
                type="number"
                step="1"
                value={editingDesign.mrp}
                onChange={(e) => setEditingDesign({ ...editingDesign, mrp: Number(e.target.value) })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDesign(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Edit Size Modal */}
      {editingSize && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUpdateSize} className="bg-white p-5 rounded-2xl max-w-xs w-full space-y-3 shadow-xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-purple-600" /> Edit Size Group
            </h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Size Code *</label>
              <input
                type="text"
                value={editingSize.code}
                onChange={(e) => setEditingSize({ ...editingSize, code: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Display Sort Order</label>
              <input
                type="number"
                value={editingSize.sort_order}
                onChange={(e) => setEditingSize({ ...editingSize, sort_order: Number(e.target.value) })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSize(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs"
              >
                Update Size
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
