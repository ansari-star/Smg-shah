import React, { useState, useMemo } from 'react';
import { StoredState, SizeEntity } from '../types/stock';
import { createSize, deleteSize } from '../services/storage';
import { Plus, Trash2, ArrowUpDown, Layers, Check, X, Info } from 'lucide-react';

interface SizesManagerProps {
  state: StoredState;
  onRefresh: () => void;
}

export const SizesManager: React.FC<SizesManagerProps> = ({ state, onRefresh }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [code, setCode] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [formError, setFormError] = useState('');

  // Tally pieces per size
  const piecesBySize = useMemo(() => {
    const map = new Map<string, number>();
    state.stock_balances.forEach((sb) => {
      map.set(sb.size_id, (map.get(sb.size_id) || 0) + sb.quantity);
    });
    return map;
  }, [state.stock_balances]);

  const sortedSizes = useMemo(() => {
    return [...state.sizes].sort((a, b) => a.sort_order - b.sort_order);
  }, [state.sizes]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!code.trim()) {
      setFormError('Size code is required (e.g. 42/44, Free Size, XL).');
      return;
    }

    // Check duplicate
    if (state.sizes.some((s) => s.code.toLowerCase() === code.trim().toLowerCase())) {
      setFormError(`Size code "${code.trim()}" already exists.`);
      return;
    }

    const order = sortOrder ? parseInt(sortOrder, 10) : undefined;
    createSize(code.trim(), order);
    setCode('');
    setSortOrder('');
    setIsAddOpen(false);
    onRefresh();
  };

  const handleDelete = (id: string, sizeCode: string) => {
    const pieces = piecesBySize.get(id) || 0;
    if (pieces > 0) {
      if (
        !confirm(
          `Warning: Size ${sizeCode} currently has ${pieces} pieces in stock balances. Deleting it will purge those balances. Continue?`
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete size "${sizeCode}"?`)) {
        return;
      }
    }
    deleteSize(id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Garment Size Clusters</h2>
          <p className="text-xs text-neutral-500">
            Define size intervals, sort sequence across the stock matrix, and aggregate piece distribution
          </p>
        </div>

        <button
          onClick={() => {
            const nextOrder = state.sizes.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1;
            setSortOrder(nextOrder.toString());
            setCode('');
            setFormError('');
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Size Code</span>
        </button>
      </div>

      {/* Sizes Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-24">Order</th>
                <th className="py-3 px-4">Size Code</th>
                <th className="py-3 px-4 text-right font-mono">Current Factory Stock</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
              {sortedSizes.map((size) => {
                const totalPieces = piecesBySize.get(size.id) || 0;
                return (
                  <tr key={size.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-500 font-semibold">
                      #{size.sort_order}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold font-mono text-neutral-900 text-sm">{size.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <span className={`font-bold ${totalPieces > 0 ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {totalPieces.toLocaleString()} Pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px]">
                      {new Date(size.created_at).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDelete(size.id, size.code)}
                        title="Delete size"
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
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
      </div>

      {/* Add Size Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
              <h3 className="text-sm font-bold text-neutral-900">Add New Size Cluster</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Size Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 42/44, Free Size, XL, 0-6M"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Determines column positioning in the stock matrix (lowest number first).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Size</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
