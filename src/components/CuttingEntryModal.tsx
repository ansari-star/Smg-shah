import React, { useState, useEffect, useMemo } from 'react';
import { StoredState } from '../types/stock';
import { recordCuttingInward, createDesign } from '../services/storage';
import { X, Scissors, PlusCircle, Check } from 'lucide-react';

interface CuttingEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  state: StoredState;
  initialDesignId?: string;
  initialMasterId?: string;
}

export const CuttingEntryModal: React.FC<CuttingEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  state,
  initialDesignId,
  initialMasterId,
}) => {
  const [masterId, setMasterId] = useState<string>('');
  const [designId, setDesignId] = useState<string>('');
  const [isCreatingNewDesign, setIsCreatingNewDesign] = useState(false);
  const [newDesignNumber, setNewDesignNumber] = useState('');
  const [newDesignRate, setNewDesignRate] = useState('180');
  const [newDesignMrp, setNewDesignMrp] = useState('599');
  const [newDesignFabric, setNewDesignFabric] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');

  const sortedSizes = useMemo(() => {
    return [...state.sizes].sort((a, b) => a.sort_order - b.sort_order);
  }, [state.sizes]);

  // Set default master & design when opened
  useEffect(() => {
    if (isOpen) {
      const activeMaster = state.masters.find((m) => m.is_active);
      setMasterId(initialMasterId || (activeMaster ? activeMaster.id : state.masters[0]?.id || ''));
      setDesignId(initialDesignId || state.designs[0]?.id || '');
      setIsCreatingNewDesign(state.designs.length === 0);
      setReferenceNo(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      
      // Initialize zero quantities
      const initialQty: Record<string, string> = {};
      state.sizes.forEach((s) => {
        initialQty[s.id] = '';
      });
      setQuantities(initialQty);
      setErrorMessage('');
    }
  }, [isOpen, initialDesignId, initialMasterId, state.masters, state.designs, state.sizes]);

  if (!isOpen) return null;

  // Total pieces calculated in real time
  const totalPieces = Object.values(quantities).reduce((acc, val) => {
    const parsed = parseInt(val, 10);
    return acc + (isNaN(parsed) ? 0 : Math.max(0, parsed));
  }, 0);

  const handleQuantityChange = (sizeId: string, value: string) => {
    setQuantities((prev) => ({
      ...prev,
      [sizeId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!masterId) {
      setErrorMessage('Please select a Cutting Master.');
      return;
    }

    let finalDesignId = designId;

    // If creating new design first
    if (isCreatingNewDesign) {
      if (!newDesignNumber.trim()) {
        setErrorMessage('Please enter a Design Number (e.g. DN-105).');
        return;
      }
      const rate = parseFloat(newDesignRate);
      if (isNaN(rate) || rate <= 0) {
        setErrorMessage('Please enter a valid rate per piece.');
        return;
      }

      const defaultSizeId = state.sizes[0]?.id || 'sz-1';
      const created = createDesign({
        design_number: newDesignNumber.trim(),
        size_id: defaultSizeId,
        rate,
        mrp_sticker: newDesignMrp ? parseFloat(newDesignMrp) : undefined,
        fabric_type: newDesignFabric.trim() || undefined,
      });
      finalDesignId = created.id;
    }

    if (!finalDesignId) {
      setErrorMessage('Please select or create a design.');
      return;
    }

    if (totalPieces <= 0) {
      setErrorMessage('Please enter cutting quantity for at least one size.');
      return;
    }

    // Convert string inputs to numeric
    const parsedQuantities: Record<string, number> = {};
    Object.entries(quantities).forEach(([sId, val]) => {
      const q = parseInt(val, 10);
      if (!isNaN(q) && q > 0) {
        parsedQuantities[sId] = q;
      }
    });

    recordCuttingInward({
      master_id: masterId,
      design_id: finalDesignId,
      quantities: parsedQuantities,
      remarks: remarks.trim() || undefined,
      reference_no: referenceNo.trim() || undefined,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">New Cutting Lot Inward</h2>
              <p className="text-xs text-neutral-500">
                Log cut pattern pieces received from workshop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Master & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Cutting Master <span className="text-red-500">*</span>
              </label>
              <select
                value={masterId}
                onChange={(e) => setMasterId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium"
              >
                <option value="">Select Master...</option>
                {state.masters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {!m.is_active ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Lot / Cutting Slip Ref
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. CUT-2026-092"
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
              />
            </div>
          </div>

          {/* Design Selection or Quick Create */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700">
                Garment Design <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewDesign(!isCreatingNewDesign)}
                className="text-xs text-neutral-900 font-semibold hover:underline"
              >
                {isCreatingNewDesign ? 'Select Existing Design' : '+ Create New Design'}
              </button>
            </div>

            {!isCreatingNewDesign ? (
              <select
                value={designId}
                onChange={(e) => setDesignId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium"
              >
                <option value="">Select Design...</option>
                {state.designs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.design_number} — Rate: ₹{d.rate} {d.fabric_type ? `(${d.fabric_type})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">
                      Design No. (e.g. DN-105)
                    </label>
                    <input
                      type="text"
                      value={newDesignNumber}
                      onChange={(e) => setNewDesignNumber(e.target.value)}
                      placeholder="DN-105"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">
                      Rate / pc (₹)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={newDesignRate}
                      onChange={(e) => setNewDesignRate(e.target.value)}
                      placeholder="180"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">
                      MRP Sticker (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={newDesignMrp}
                      onChange={(e) => setNewDesignMrp(e.target.value)}
                      placeholder="599"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">
                      Fabric / Specification
                    </label>
                    <input
                      type="text"
                      value={newDesignFabric}
                      onChange={(e) => setNewDesignFabric(e.target.value)}
                      placeholder="100% Cotton Lycra"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Size Breakdown Matrix Input */}
          <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-800">
                Size Breakdown (Pieces Cut)
              </label>
              <div className="text-xs font-mono font-bold text-neutral-900">
                Total: {totalPieces} Pcs
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sortedSizes.map((size) => (
                <div key={size.id} className="bg-white p-2 border border-neutral-200 rounded-lg">
                  <div className="text-[11px] font-bold text-neutral-600 mb-1 text-center">
                    Size: {size.code}
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={quantities[size.id] || ''}
                    onChange={(e) => handleQuantityChange(size.id, e.target.value)}
                    className="w-full text-center px-2 py-1.5 text-sm font-bold font-mono text-neutral-900 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Remarks / Fabric Roll Details
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Roll #12 - Navy Blue & Yellow combo, 20 kg fabric"
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Record {totalPieces} Pieces</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
