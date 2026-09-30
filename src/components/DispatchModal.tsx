import React, { useState, useEffect, useMemo } from 'react';
import { StoredState } from '../types/stock';
import { recordOutwardDispatch } from '../services/storage';
import { X, Send, AlertCircle, Check } from 'lucide-react';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (generatedReferenceNo?: string) => void;
  state: StoredState;
  initialDesignId?: string;
  initialMasterId?: string;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  state,
  initialDesignId,
  initialMasterId,
}) => {
  const [masterId, setMasterId] = useState<string>('');
  const [designId, setDesignId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState('');
  const [recipient, setRecipient] = useState('');
  const [remarks, setRemarks] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');

  const sortedSizes = useMemo(() => {
    return [...state.sizes].sort((a, b) => a.sort_order - b.sort_order);
  }, [state.sizes]);

  // Current balance lookup for selected master and design
  const availableBalances = useMemo(() => {
    const map: Record<string, number> = {};
    if (!masterId || !designId) return map;

    state.stock_balances.forEach((sb) => {
      if (sb.master_id === masterId && sb.design_id === designId) {
        map[sb.size_id] = sb.quantity;
      }
    });
    return map;
  }, [masterId, designId, state.stock_balances]);

  useEffect(() => {
    if (isOpen) {
      setMasterId(initialMasterId || state.masters[0]?.id || '');
      setDesignId(initialDesignId || state.designs[0]?.id || '');
      setReferenceNo(`DC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setRecipient('');
      setRemarks('');
      setErrorMessage('');

      const initQty: Record<string, string> = {};
      state.sizes.forEach((s) => {
        initQty[s.id] = '';
      });
      setQuantities(initQty);
    }
  }, [isOpen, initialDesignId, initialMasterId, state.masters, state.designs, state.sizes]);

  if (!isOpen) return null;

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
    if (!designId) {
      setErrorMessage('Please select a Garment Design.');
      return;
    }
    if (totalPieces <= 0) {
      setErrorMessage('Please enter dispatch quantity for at least one size.');
      return;
    }

    // Check if any size exceeds current balance
    const parsedQuantities: Record<string, number> = {};
    for (const [sId, val] of Object.entries(quantities)) {
      const q = parseInt(val, 10);
      if (!isNaN(q) && q > 0) {
        const available = availableBalances[sId] || 0;
        if (q > available) {
          const sizeName = state.sizes.find((s) => s.id === sId)?.code || sId;
          setErrorMessage(
            `Warning: Dispatch quantity (${q}) exceeds current in-hand balance (${available}) for size ${sizeName}.`
          );
          return;
        }
        parsedQuantities[sId] = q;
      }
    }

    const fullRemarks = [
      recipient ? `Dispatched to: ${recipient}` : '',
      remarks.trim(),
    ]
      .filter(Boolean)
      .join(' · ');

    recordOutwardDispatch({
      master_id: masterId,
      design_id: designId,
      quantities: parsedQuantities,
      remarks: fullRemarks || undefined,
      reference_no: referenceNo.trim() || undefined,
    });

    onSuccess(referenceNo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Dispatch / Delivery Outward</h2>
              <p className="text-xs text-neutral-500">
                Deduct finished or cut pieces from master stock
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Master & Design */}
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
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Garment Design <span className="text-red-500">*</span>
              </label>
              <select
                value={designId}
                onChange={(e) => setDesignId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium"
              >
                <option value="">Select Design...</option>
                {state.designs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.design_number} (Rate: ₹{d.rate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Challan Ref & Recipient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Challan / Dispatch No.
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. DC-2026-019"
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Recipient / Stitching Unit / Buyer
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Unit 3 Stitching / Metro Traders"
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Size Quantities & Current In-Stock Comparison */}
          <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-800">
                Quantity to Dispatch (Pieces)
              </label>
              <div className="text-xs font-mono font-bold text-neutral-900">
                Total Outward: {totalPieces} Pcs
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sortedSizes.map((size) => {
                const inStock = availableBalances[size.id] || 0;
                return (
                  <div
                    key={size.id}
                    className={`p-2 border rounded-lg transition-colors ${
                      inStock > 0 ? 'bg-white border-neutral-200' : 'bg-neutral-100/70 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-neutral-700">{size.code}</span>
                      <span className="font-mono text-neutral-500 text-[10px]">
                        In hand: {inStock}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={inStock}
                      placeholder="0"
                      value={quantities[size.id] || ''}
                      onChange={(e) => handleQuantityChange(size.id, e.target.value)}
                      disabled={inStock === 0}
                      className="w-full text-center px-2 py-1.5 text-sm font-bold font-mono text-neutral-900 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Dispatch Remarks / Vehicle No.
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Sent via Tempo MH-04-1234, lot signed by foreman"
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Actions */}
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
              <span>Confirm Dispatch ({totalPieces} Pcs)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
