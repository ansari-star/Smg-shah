import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, FileText, CheckCircle2, ChevronDown, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { getLocalState, saveLocalState, fetchCloudState } from '../../lib/storage';

interface NewBillPageProps {
  onBackToBills: () => void;
  onViewInvoice: (billId: string) => void;
}

interface DraftLine {
  master_id: string;
  master_name: string;
  design_id: string;
  design_number: string;
  size_id: string;
  quantity: number;
  rate: number;
}

export default function NewBillPage({ onBackToBills, onViewInvoice }: NewBillPageProps) {
  const [state, setState] = useState(getLocalState());
  const [remarks, setRemarks] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const CUSTOMER_NAME = 'abc';

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

  // Maximum 10 entries per single chalan limit
  const MAX_LINES_LIMIT = 10;

  // Distinct sorted design numbers
  const uniqueDesignNumbers = useMemo(() => {
    const s = new Set<string>();
    (state.designs || []).forEach((d: any) => {
      if (d.design_number) s.add(d.design_number.trim());
    });
    (state.stock_balances || []).forEach((b: any) => {
      const matchDes = state.designs.find((d: any) => d.id === b.design_id);
      if (matchDes) s.add(matchDes.design_number.trim());
    });
    return Array.from(s).sort();
  }, [state.designs, state.stock_balances]);

  // Form states (Sabhi step-by-step empty rahenge)
  const [designInput, setDesignInput] = useState('');
  const [selectedDesignNumber, setSelectedDesignNumber] = useState('');
  const [isDesignMenuOpen, setIsDesignMenuOpen] = useState(false);

  // 1. Size Box Empty rahega
  const [sizeId, setSizeId] = useState('');
  // 2. Master Box Empty rahega
  const [selectedMasterId, setSelectedMasterId] = useState('');
  // 3. Rate auto-fill tabhi hoga jab Master select ho jayega
  const [rate, setRate] = useState<string>('');
  // 4. Pieces Box Empty rahega
  const [quantity, setQuantity] = useState<string>('');

  // Chalan Items List (Up to 10 entries)
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Focus & Click-outside Refs
  const designContainerRef = useRef<HTMLDivElement>(null);
  const designInputRef = useRef<HTMLInputElement>(null);
  const sizeSelectRef = useRef<HTMLSelectElement>(null);
  const masterSelectRef = useRef<HTMLSelectElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);
  const addLineBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (designContainerRef.current && !designContainerRef.current.contains(e.target as Node)) {
        setIsDesignMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDesigns = useMemo(() => {
    if (!designInput.trim()) return uniqueDesignNumbers;
    const q = designInput.toLowerCase().trim();
    return uniqueDesignNumbers.filter((num) => num.toLowerCase().includes(q));
  }, [designInput, uniqueDesignNumbers]);

  // STEP 1: Design Choose hua -> Size box empty rahega, Master box empty rahega, Rate blank rahega
  const handleSelectDesignNumber = (num: string) => {
    setSelectedDesignNumber(num);
    setDesignInput(num);
    setIsDesignMenuOpen(false);

    // Size aur Master dono empty ho jayenge
    setSizeId('');
    setSelectedMasterId('');
    setRate('');
    setQuantity('');

    // Focus size box par bhejein
    setTimeout(() => sizeSelectRef.current?.focus(), 50);
  };

  // STEP 2: Size Choose hua -> Master box abhi bhi empty rahega
  const handleSizeChange = (newSizeId: string) => {
    setSizeId(newSizeId);
    setSelectedMasterId('');
    setRate('');
    setQuantity('');

    // Focus master select par bhejein
    setTimeout(() => masterSelectRef.current?.focus(), 50);
  };

  // STEP 3: Master Choose hua -> Rate automatic catalog se set hoga
  const handleMasterChange = (newMasterId: string) => {
    setSelectedMasterId(newMasterId);

    if (selectedDesignNumber && sizeId) {
      const match = state.designs.find(
        (d: any) => d.design_number === selectedDesignNumber && d.size_id === sizeId
      );
      if (match && match.rate !== undefined && match.rate !== null && String(match.rate) !== '') {
        setRate(String(match.rate));
      } else {
        setRate('0'); // Agar set nahi hai toh 0
      }
    } else {
      setRate('0');
    }

    // Focus quantity par bhejein taaki pieces type ho sake
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  // Live stock check for UI
  const currentSelectedMasterStock = useMemo(() => {
    if (!selectedMasterId || !selectedDesignNumber || !sizeId) return null;
    const bal = state.stock_balances.find((b: any) => {
      const des = state.designs.find((d: any) => d.id === b.design_id);
      const matchNum = des ? des.design_number === selectedDesignNumber : b.design_id === selectedDesignNumber;
      return b.master_id === selectedMasterId && matchNum && b.size_id === sizeId;
    });
    return bal ? bal.quantity : 0;
  }, [selectedMasterId, selectedDesignNumber, sizeId, state.stock_balances, state.designs]);

  // STEP 4: Add Entry to Challan -> Reset all inputs for the fresh cycle
  const handleAddLine = () => {
    if (lines.length >= MAX_LINES_LIMIT) {
      alert(`Ek chalan me maximum ${MAX_LINES_LIMIT} entries hi add ho sakti hain.`);
      return;
    }

    const activeDesign = selectedDesignNumber || designInput.trim();
    if (!activeDesign) {
      alert('Pehle Design Number select karein.');
      designInputRef.current?.focus();
      return;
    }
    if (!sizeId) {
      alert('Size select karein.');
      sizeSelectRef.current?.focus();
      return;
    }
    if (!selectedMasterId) {
      alert('Master select karein.');
      masterSelectRef.current?.focus();
      return;
    }
    const numQty = Number(quantity);
    if (!quantity || isNaN(numQty) || numQty <= 0) {
      alert('Pieces box me piece count daliye.');
      qtyInputRef.current?.focus();
      return;
    }

    const finalRate = rate !== '' && !isNaN(Number(rate)) ? Number(rate) : 0;
    const designObj = state.designs.find(
      (d: any) => d.design_number === activeDesign && d.size_id === sizeId
    );
    const masterObj = state.masters.find((m: any) => m.id === selectedMasterId);

    // Entry Add to Chalan
    setLines((prev) => [
      ...prev,
      {
        master_id: selectedMasterId,
        master_name: masterObj?.name || 'Master',
        design_id: designObj?.id || `des-${activeDesign}`,
        design_number: activeDesign,
        size_id: sizeId,
        quantity: numQty,
        rate: finalRate,
      },
    ]);

    // CYCLE RESET: Upar ki saari fields dobara naye cycle ke liye blank/ready
    setDesignInput('');
    setSelectedDesignNumber('');
    setSizeId('');
    setSelectedMasterId('');
    setRate('');
    setQuantity('');

    // Naye cycle ke liye cursor wapas Design box par focus karega
    setTimeout(() => designInputRef.current?.focus(), 50);
  };

  const handleRemoveLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalPieces = lines.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalAmount = lines.reduce((acc, curr) => acc + curr.quantity * curr.rate, 0);

  // Common Save Process for 1 Single Chalan
  const executeSaveBillProcess = (actionType: 'view_invoice' | 'create_new') => {
    const currentState = getLocalState();
    if (!currentState.bills) currentState.bills = [];

    const lastBill = currentState.bills[0];
    let nextCycle = 1;
    let nextNum = 1;

    if (lastBill) {
      if (lastBill.bill_number >= 1000) {
        nextCycle = lastBill.cycle + 1;
        nextNum = 1;
      } else {
        nextCycle = lastBill.cycle;
        nextNum = lastBill.bill_number + 1;
      }
    }

    const now = new Date().toISOString();
    const newBillId = `bill-${Date.now()}`;

    // Minus stock from each line's selected master
    lines.forEach((l) => {
      const balIdx = currentState.stock_balances.findIndex((b: any) => {
        const des = currentState.designs.find((d: any) => d.id === b.design_id);
        const matchDesignNumber = des ? des.design_number === l.design_number : b.design_id === l.design_id;
        return b.master_id === l.master_id && matchDesignNumber && b.size_id === l.size_id;
      });

      if (balIdx !== -1) {
        currentState.stock_balances[balIdx].quantity -= l.quantity;
        currentState.stock_balances[balIdx].updated_at = now;
      } else {
        currentState.stock_balances.unshift({
          id: `bal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          master_id: l.master_id,
          design_id: l.design_id,
          size_id: l.size_id,
          quantity: -l.quantity,
          remarks: '',
          created_at: now,
          updated_at: now,
        });
      }
    });

    const newBillItem = {
      id: newBillId,
      cycle: nextCycle,
      bill_number: nextNum,
      bill_date: billDate,
      customer_name: CUSTOMER_NAME,
      remarks: remarks.trim() || undefined,
      items: lines.map((l, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        master_id: l.master_id,
        master_name: l.master_name,
        design_id: l.design_id,
        design_number: l.design_number,
        size_id: l.size_id,
        quantity: l.quantity,
        rate: l.rate,
        amount: l.quantity * l.rate,
      })),
      total_pieces: totalPieces,
      total_amount: totalAmount,
      status: 'ACTIVE' as const,
      created_at: now,
    };

    currentState.bills.unshift(newBillItem);
    saveLocalState(currentState);
    setShowConfirmModal(false);

    if (actionType === 'view_invoice') {
      onViewInvoice(newBillId);
    } else {
      setLines([]);
      setRemarks('');
      setDesignInput('');
      setSelectedDesignNumber('');
      setSizeId('');
      setSelectedMasterId('');
      setRate('');
      setQuantity('');
      alert(`Chalan C${nextCycle}-${nextNum} (Total ${lines.length} items, ${totalPieces} ps) save ho gaya! Naya chalan banane ke liye form tayyar hai.`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={onBackToBills}
          className="p-2 border rounded-xl hover:bg-slate-50 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bills
        </button>
        <h1 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-slate-900">
          <FileText className="w-5 h-5 text-blue-600" /> New Bill (Single Chalan)
        </h1>
      </div>

      <div className="mt-4 space-y-4">
        {/* Header Details */}
        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Customer Name</label>
            <div className="p-2.5 border border-slate-200 bg-slate-100 rounded-xl text-xs font-mono font-black text-slate-900">
              {CUSTOMER_NAME}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Chalan Date</label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dispatch / Lot Note</label>
            <input
              type="text"
              placeholder="e.g. Lot info / vehicle..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white"
            />
          </div>
        </div>

        {/* ==================================================================== */}
        {/* STEP-BY-STEP CYCLE INPUT CONTAINER                                   */}
        {/* ==================================================================== */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Add Line Item To Chalan
            </h3>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              lines.length >= MAX_LINES_LIMIT ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
            }`}>
              Chalan Lines ({lines.length}/{MAX_LINES_LIMIT})
            </span>
          </div>

          {lines.length >= MAX_LINES_LIMIT ? (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Is chalan me maximum 10 entries poori ho chuki hain. Niche se save karein.</span>
            </div>
          ) : (
            <div className="flex flex-col md:grid md:grid-cols-12 gap-3 items-stretch md:items-end">
              {/* 1. Design Number */}
              <div className="w-full md:col-span-4 relative" ref={designContainerRef}>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">1. Design No. *</label>
                <div className="relative flex items-center">
                  <input
                    ref={designInputRef}
                    type="text"
                    placeholder="Type ya arrow dabayein..."
                    value={designInput}
                    onChange={(e) => {
                      setDesignInput(e.target.value);
                      setSelectedDesignNumber(e.target.value);
                      setIsDesignMenuOpen(true);
                    }}
                    onFocus={() => setIsDesignMenuOpen(true)}
                    className="w-full pl-3 pr-9 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDesignMenuOpen((prev) => !prev)}
                    className="absolute right-1.5 p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDesignMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {isDesignMenuOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredDesigns.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 font-mono text-center">
                        Koi design match nahi hua
                      </div>
                    ) : (
                      filteredDesigns.map((num) => (
                        <div
                          key={num}
                          onClick={() => handleSelectDesignNumber(num)}
                          className={`p-2.5 text-xs font-mono font-bold cursor-pointer flex items-center justify-between hover:bg-slate-100 transition ${
                            selectedDesignNumber === num ? 'bg-amber-50 text-slate-950' : 'text-slate-800'
                          }`}
                        >
                          <span>Design {num}</span>
                          {selectedDesignNumber === num && <Check className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. Size Selection (Design select hone ke baad empty rahega, click par option khulega) */}
              <div className="w-full md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">2. Size *</label>
                <select
                  ref={sizeSelectRef}
                  value={sizeId}
                  onChange={(e) => handleSizeChange(e.target.value)}
                  className={`w-full px-3 py-2.5 sm:py-2 border rounded-xl text-xs font-bold font-mono bg-white cursor-pointer ${
                    !selectedDesignNumber ? 'opacity-60 bg-slate-100' : 'border-slate-300'
                  }`}
                  disabled={!selectedDesignNumber}
                >
                  <option value="">-- Choose Size --</option>
                  {state.sizes.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.code}</option>
                  ))}
                </select>
              </div>

              {/* 3. Active Master Selection (Size select hone ke baad empty rahega, click par khulega) */}
              <div className="w-full md:col-span-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">3. Select Master *</label>
                  {currentSelectedMasterStock !== null && (
                    <span className={`text-[10px] font-mono font-bold ${currentSelectedMasterStock < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                      Stock: {currentSelectedMasterStock} ps
                    </span>
                  )}
                </div>
                <select
                  ref={masterSelectRef}
                  value={selectedMasterId}
                  onChange={(e) => handleMasterChange(e.target.value)}
                  className={`w-full px-3 py-2.5 sm:py-2 border rounded-xl text-xs font-bold bg-white cursor-pointer ${
                    !sizeId ? 'opacity-60 bg-slate-100' : 'border-slate-300'
                  }`}
                  disabled={!sizeId}
                >
                  <option value="">-- Choose Master --</option>
                  {state.masters.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* 4. Pieces Box (Master select hone ke baad quantity daliye) */}
              <div className="w-full md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">4. Pieces *</label>
                <input
                  ref={qtyInputRef}
                  type="number"
                  placeholder="Qty"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddLine();
                  }}
                  className={`w-full px-3 py-2.5 sm:py-2 border rounded-xl text-xs font-mono font-bold ${
                    !selectedMasterId ? 'opacity-60 bg-slate-100' : 'border-slate-300'
                  }`}
                  disabled={!selectedMasterId}
                />
              </div>

              {/* 5. Rate Box (Master select hone par automatic set ho jayega) */}
              <div className="w-full md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Rate (₹) [Auto]</label>
                <input
                  ref={rateInputRef}
                  type="number"
                  step="0.5"
                  placeholder="0.00"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddLine();
                  }}
                  className="w-full px-3 py-2.5 sm:py-2 border border-amber-300 bg-amber-50/40 rounded-xl text-xs font-mono font-bold focus:bg-white"
                />
              </div>
            </div>
          )}

          {lines.length < MAX_LINES_LIMIT && (
            <button
              ref={addLineBtnRef}
              type="button"
              onClick={handleAddLine}
              className="w-full mt-2 py-3 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-98 transition"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Entry #{lines.length + 1} to Chalan</span>
            </button>
          )}
        </div>

        {/* ==================================================================== */}
        {/* SINGLE CHALAN DETAIL TABLE                                           */}
        {/* ==================================================================== */}
        {lines.length > 0 && (
          <div className="border rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 uppercase font-mono">
                Chalan Items ({lines.length} of 10)
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Ye sabhi ek hi chalan me shamil honge
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono min-w-[550px]">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Design</th>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5">Master</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Rate</th>
                    <th className="p-2.5 text-right">Amount (₹)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => {
                    const s = state.sizes.find((item: any) => item.id === l.size_id);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-400 font-bold">{i + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{l.design_number}</td>
                        <td className="p-2.5">{s?.code || 'M'}</td>
                        <td className="p-2.5 font-bold text-slate-700">{l.master_name}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{l.quantity} ps</td>
                        <td className="p-2.5 text-right font-bold text-blue-700">₹{l.rate.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{(l.quantity * l.rate).toFixed(2)}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(i)}
                            className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                            title="Entry Hatayein"
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

            {/* Chalan Grand Total */}
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center text-xs font-mono font-bold">
              <span>Chalan Total: {totalPieces} ps ({lines.length} items)</span>
              <span className="text-amber-400 text-sm">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Issue / Save Chalan Button */}
        <button
          type="button"
          onClick={() => setShowConfirmModal(true)}
          disabled={lines.length === 0}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider disabled:opacity-50 cursor-pointer active:scale-98 transition"
        >
          Issue 1 Chalan (Save Confirmation)
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirm 1 Single Chalan
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kya aap in sabhi <strong>{lines.length} entries</strong> ka ek hi single chalan generate karna chahte hain? Har entry ke Master se stock deduct ho jayega.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span>Total Lines:</span>
                <strong>{lines.length} entries</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Pieces:</span>
                <strong>{totalPieces} ps</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <strong className="text-blue-700">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => executeSaveBillProcess('create_new')}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider active:scale-98 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Save &amp; New Chalan</span>
              </button>

              <button
                type="button"
                onClick={() => executeSaveBillProcess('view_invoice')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider active:scale-98 transition"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Save (View Chalan)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
