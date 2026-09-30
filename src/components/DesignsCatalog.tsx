import React, { useState, useMemo } from 'react';
import { StoredState, DesignEntity } from '../types/stock';
import { createDesign, updateDesign, deleteDesign, sortDescending } from '../services/storage';
import { Plus, Search, Edit3, Trash2, Tag, Printer, Layers, Check, X } from 'lucide-react';

interface DesignsCatalogProps {
  state: StoredState;
  onRefresh: () => void;
  onNavigateToMatrixWithDesign: (designId: string) => void;
  onNavigateToStickers: (designId: string) => void;
}

export const DesignsCatalog: React.FC<DesignsCatalogProps> = ({
  state,
  onRefresh,
  onNavigateToMatrixWithDesign,
  onNavigateToStickers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<DesignEntity | null>(null);

  // Form fields
  const [designNumber, setDesignNumber] = useState('');
  const [rate, setRate] = useState('');
  const [mrpSticker, setMrpSticker] = useState('');
  const [sizeId, setSizeId] = useState('');
  const [fabricType, setFabricType] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Sorted sizes
  const sortedSizes = useMemo(() => {
    return [...state.sizes].sort((a, b) => a.sort_order - b.sort_order);
  }, [state.sizes]);

  // Size lookup
  const sizeMap = useMemo(() => {
    const map = new Map<string, string>();
    state.sizes.forEach((s) => map.set(s.id, s.code));
    return map;
  }, [state.sizes]);

  // Total stock per design
  const stockByDesign = useMemo(() => {
    const map = new Map<string, number>();
    state.stock_balances.forEach((sb) => {
      map.set(sb.design_id, (map.get(sb.design_id) || 0) + sb.quantity);
    });
    return map;
  }, [state.stock_balances]);

  // Filtered & sorted designs (newest first via sortDescending)
  const displayedDesigns = useMemo(() => {
    const sorted = sortDescending(state.designs);
    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase().trim();
    return sorted.filter(
      (d) =>
        d.design_number.toLowerCase().includes(query) ||
        (d.fabric_type || '').toLowerCase().includes(query) ||
        (d.description || '').toLowerCase().includes(query)
    );
  }, [state.designs, searchQuery]);

  const handleOpenAdd = () => {
    setEditingDesign(null);
    setDesignNumber('');
    setRate('180');
    setMrpSticker('599');
    setSizeId(state.sizes[0]?.id || '');
    setFabricType('');
    setDescription('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (design: DesignEntity) => {
    setEditingDesign(design);
    setDesignNumber(design.design_number);
    setRate(design.rate.toString());
    setMrpSticker(design.mrp_sticker ? design.mrp_sticker.toString() : '');
    setSizeId(design.size_id);
    setFabricType(design.fabric_type || '');
    setDescription(design.description || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveDesign = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!designNumber.trim()) {
      setFormError('Design number is required.');
      return;
    }
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      setFormError('Please enter a valid rate per piece.');
      return;
    }

    const numMrp = mrpSticker ? parseFloat(mrpSticker) : undefined;

    if (editingDesign) {
      updateDesign(editingDesign.id, {
        design_number: designNumber.trim().toUpperCase(),
        size_id: sizeId || editingDesign.size_id,
        rate: numRate,
        mrp_sticker: numMrp,
        fabric_type: fabricType.trim() || undefined,
        description: description.trim() || undefined,
      });
    } else {
      createDesign({
        design_number: designNumber.trim().toUpperCase(),
        size_id: sizeId || state.sizes[0]?.id || 'sz-1',
        rate: numRate,
        mrp_sticker: numMrp,
        fabric_type: fabricType.trim() || undefined,
        description: description.trim() || undefined,
      });
    }

    setIsAddModalOpen(false);
    onRefresh();
  };

  const handleDelete = (id: string, designNumber: string) => {
    const inStock = stockByDesign.get(id) || 0;
    if (inStock > 0) {
      if (
        !confirm(
          `Design ${designNumber} currently has ${inStock} pcs in stock. Deleting it will also remove all its stock records. Are you sure?`
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete design ${designNumber}?`)) {
        return;
      }
    }
    deleteDesign(id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search design number, fabric, or style..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add New Design</span>
        </button>
      </div>

      {/* Grid of Designs */}
      {displayedDesigns.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <Tag className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="mt-3 text-sm font-semibold text-neutral-900">No designs created yet</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Add design patterns with rates, MRP sticker prices, and fabric details.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            + Create First Design
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedDesigns.map((design) => {
            const stockQty = stockByDesign.get(design.id) || 0;
            const primarySizeCode = sizeMap.get(design.size_id) || 'Standard';

            return (
              <div
                key={design.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold font-mono text-neutral-900 tracking-wide">
                        {design.design_number}
                      </h4>
                      {design.description && (
                        <p className="text-xs text-neutral-600 mt-0.5 line-clamp-1">
                          {design.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(design)}
                        title="Edit design details"
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(design.id, design.design_number)}
                        title="Delete design"
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                    <span>{design.fabric_type || 'Standard Knit/Woven'}</span>
                    <span aria-hidden="true">·</span>
                    <span>Default: {primarySizeCode}</span>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                    <div>
                      <div className="text-[10px] text-neutral-500 font-medium">Rate / Pc</div>
                      <div className="text-xs font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                        ₹{design.rate}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 font-medium">MRP Sticker</div>
                      <div className="text-xs font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                        {design.mrp_sticker ? `₹${design.mrp_sticker}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 font-medium">Current Stock</div>
                      <div
                        className={`text-xs font-bold font-mono tabular-nums mt-0.5 ${
                          stockQty > 0 ? 'text-emerald-700' : 'text-neutral-400'
                        }`}
                      >
                        {stockQty} Pcs
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onNavigateToMatrixWithDesign(design.id)}
                    className="font-medium text-neutral-700 hover:text-neutral-950 flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>View in Matrix</span>
                  </button>

                  <button
                    onClick={() => onNavigateToStickers(design.id)}
                    className="font-medium text-neutral-700 hover:text-neutral-950 flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>MRP Stickers</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Design Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
              <h3 className="text-sm font-bold text-neutral-900">
                {editingDesign ? 'Edit Garment Design' : 'Create New Garment Design'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDesign} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Design Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={designNumber}
                  onChange={(e) => setDesignNumber(e.target.value)}
                  placeholder="e.g. DN-101, BABA-402, SHIRT-90"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono uppercase"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Rate per Pc (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="180"
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    MRP Sticker Price (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={mrpSticker}
                    onChange={(e) => setMrpSticker(e.target.value)}
                    placeholder="599"
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Default Size Group
                </label>
                <select
                  value={sizeId}
                  onChange={(e) => setSizeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium"
                >
                  {sortedSizes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Fabric Type / Quality
                </label>
                <input
                  type="text"
                  value={fabricType}
                  onChange={(e) => setFabricType(e.target.value)}
                  placeholder="e.g. 100% Pure Combed Cotton, Hosiery Lycra"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Style Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Boys 2-Piece Summer Printed Short Set"
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
                  <span>{editingDesign ? 'Update Design' : 'Save Design'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
