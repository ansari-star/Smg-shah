import React, { useState, useMemo } from 'react';
import { StoredState, MasterEntity } from '../types/stock';
import { createMaster, updateMaster, toggleMasterStatus, sortDescending } from '../services/storage';
import { Users, Plus, Phone, CheckCircle2, XCircle, Edit2, Layers, Check, X, Scissors } from 'lucide-react';

interface MastersManagerProps {
  state: StoredState;
  onRefresh: () => void;
  onSelectMasterForMatrix: (masterId: string) => void;
}

export const MastersManager: React.FC<MastersManagerProps> = ({
  state,
  onRefresh,
  onSelectMasterForMatrix,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterEntity | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Design lookup for valuation
  const designMap = useMemo(() => {
    const map = new Map<string, { rate: number }>();
    state.designs.forEach((d) => map.set(d.id, { rate: d.rate }));
    return map;
  }, [state.designs]);

  // Master stats aggregation
  const masterStats = useMemo(() => {
    const stats: Record<
      string,
      { totalPieces: number; totalValuation: number; distinctDesigns: Set<string> }
    > = {};

    state.masters.forEach((m) => {
      stats[m.id] = { totalPieces: 0, totalValuation: 0, distinctDesigns: new Set() };
    });

    state.stock_balances.forEach((sb) => {
      if (stats[sb.master_id]) {
        stats[sb.master_id].totalPieces += sb.quantity;
        const rate = designMap.get(sb.design_id)?.rate || 0;
        stats[sb.master_id].totalValuation += sb.quantity * rate;
        if (sb.quantity > 0) {
          stats[sb.master_id].distinctDesigns.add(sb.design_id);
        }
      }
    });

    return stats;
  }, [state.masters, state.stock_balances, designMap]);

  const handleOpenAdd = () => {
    setEditingMaster(null);
    setName('');
    setPhone('');
    setNotes('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (master: MasterEntity) => {
    setEditingMaster(master);
    setName(master.name);
    setPhone(master.phone || '');
    setNotes(master.notes || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Cutting Master name is required.');
      return;
    }

    if (editingMaster) {
      updateMaster(editingMaster.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      createMaster({
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    setIsAddModalOpen(false);
    onRefresh();
  };

  const handleToggleActive = (id: string) => {
    toggleMasterStatus(id);
    onRefresh();
  };

  // Sort masters: active first, then newest first
  const sortedMasters = useMemo(() => {
    return [...state.masters].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [state.masters]);

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Cutting Masters & Workshop Artisans</h2>
          <p className="text-xs text-neutral-500">
            Manage master pattern cutters, workshop status, and stock holding tallies
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Cutting Master</span>
        </button>
      </div>

      {/* Masters Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedMasters.map((master) => {
          const stats = masterStats[master.id] || {
            totalPieces: 0,
            totalValuation: 0,
            distinctDesigns: new Set(),
          };

          return (
            <div
              key={master.id}
              className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition-colors ${
                master.is_active ? 'border-neutral-200 hover:border-neutral-300' : 'border-neutral-200/60 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center font-bold text-sm text-neutral-800">
                      {master.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">{master.name}</h4>
                      {/* Zero-pill status metadata */}
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                        <span className={master.is_active ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                          {master.is_active ? 'Active Workshop' : 'Inactive'}
                        </span>
                        {master.phone && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px]">{master.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(master)}
                      title="Edit master details"
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(master.id)}
                      title={master.is_active ? 'Mark as inactive' : 'Mark as active'}
                      className={`p-1.5 rounded transition-colors ${
                        master.is_active
                          ? 'text-neutral-400 hover:text-neutral-700'
                          : 'text-neutral-400 hover:text-emerald-600'
                      }`}
                    >
                      {master.is_active ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {master.notes && (
                  <p className="text-xs text-neutral-600 mt-3 p-2 bg-neutral-50 rounded border border-neutral-100">
                    {master.notes}
                  </p>
                )}

                {/* Stock in Hand Tally */}
                <div className="mt-4 grid grid-cols-3 gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                  <div>
                    <div className="text-[10px] text-neutral-500 font-medium">In-Hand Stock</div>
                    <div className="text-sm font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                      {stats.totalPieces.toLocaleString()} Pcs
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500 font-medium">Stock Value</div>
                    <div className="text-xs font-bold font-mono tabular-nums text-neutral-900 mt-1">
                      ₹{stats.totalValuation.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500 font-medium">Designs Handled</div>
                    <div className="text-xs font-bold font-mono tabular-nums text-neutral-900 mt-1">
                      {stats.distinctDesigns.size}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectMasterForMatrix(master.id)}
                  className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>View Stock Matrix</span>
                </button>

                <div className="text-[11px] text-neutral-400 font-mono">
                  Joined: {new Date(master.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Master Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
              <h3 className="text-sm font-bold text-neutral-900">
                {editingMaster ? 'Edit Cutting Master' : 'Add New Cutting Master'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Master Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Master Saleem, Master Aslam"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Contact / Mobile Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98200 12345"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Specialization & Workshop Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Specialist in 18/22 and 24/34 kids baba suits, operates 4 stitching tables"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingMaster ? 'Update Master' : 'Save Master'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
