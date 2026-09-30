import React, { useState, useMemo } from 'react';
import {
  StoredState,
  DesignEntity,
  MasterEntity,
  SizeEntity,
  StockBalanceEntity,
} from '../types/stock';
import { setStockBalanceDirect, sortDescending } from '../services/storage';
import {
  Search,
  Filter,
  Plus,
  Send,
  Printer,
  Edit2,
  Check,
  X,
  TrendingUp,
  Package,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';

interface StockMatrixViewProps {
  state: StoredState;
  onRefresh: () => void;
  onOpenCuttingModal: (preselectedDesignId?: string, preselectedMasterId?: string) => void;
  onOpenDispatchModal: (preselectedDesignId?: string, preselectedMasterId?: string) => void;
  onNavigateToStickers: (designId: string) => void;
  onNavigateToChallan: (masterId?: string) => void;
  onNavigateToAddStock?: () => void;
  onNavigateToStockList?: () => void;
}

interface CellEditState {
  masterId: string;
  designId: string;
  sizeId: string;
  currentQty: number;
  newQty: string;
  remarks: string;
}

export const StockMatrixView: React.FC<StockMatrixViewProps> = ({
  state,
  onRefresh,
  onOpenCuttingModal,
  onOpenDispatchModal,
  onNavigateToStickers,
  onNavigateToChallan,
  onNavigateToAddStock,
  onNavigateToStockList,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMasterId, setSelectedMasterId] = useState<string>('ALL');
  const [hideZeroBalances, setHideZeroBalances] = useState(false);
  const [activeCellEdit, setActiveCellEdit] = useState<CellEditState | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'ledger'>('matrix');

  // Sorted sizes by sort_order
  const sortedSizes = useMemo(() => {
    return [...state.sizes].sort((a, b) => a.sort_order - b.sort_order);
  }, [state.sizes]);

  // Master map for quick lookups
  const masterMap = useMemo(() => {
    const map = new Map<string, MasterEntity>();
    state.masters.forEach((m) => map.set(m.id, m));
    return map;
  }, [state.masters]);

  // Design map for quick lookups
  const designMap = useMemo(() => {
    const map = new Map<string, DesignEntity>();
    state.designs.forEach((d) => map.set(d.id, d));
    return map;
  }, [state.designs]);

  // Size map
  const sizeMap = useMemo(() => {
    const map = new Map<string, SizeEntity>();
    state.sizes.forEach((s) => map.set(s.id, s));
    return map;
  }, [state.sizes]);

  // Balance lookup key: `${master_id}_${design_id}_${size_id}`
  const balanceMap = useMemo(() => {
    const map = new Map<string, StockBalanceEntity>();
    state.stock_balances.forEach((sb) => {
      map.set(`${sb.master_id}_${sb.design_id}_${sb.size_id}`, sb);
    });
    return map;
  }, [state.stock_balances]);

  // Matrix Row calculation:
  // Each row represents a (Master, Design) pairing or aggregated per Design if viewing ALL
  interface MatrixRow {
    key: string;
    masterId: string;
    masterName: string;
    design: DesignEntity;
    sizeQuantities: Record<string, number>;
    totalPieces: number;
    totalRateValue: number;
    totalMrpValue: number;
  }

  const matrixRows: MatrixRow[] = useMemo(() => {
    const rows: MatrixRow[] = [];

    // Filter masters based on selected master
    const relevantMasters =
      selectedMasterId === 'ALL'
        ? state.masters
        : state.masters.filter((m) => m.id === selectedMasterId);

    relevantMasters.forEach((master) => {
      state.designs.forEach((design) => {
        // Calculate quantities for this master and design across all sizes
        const sizeQuantities: Record<string, number> = {};
        let totalPieces = 0;

        sortedSizes.forEach((size) => {
          const balanceKey = `${master.id}_${design.id}_${size.id}`;
          const qty = balanceMap.get(balanceKey)?.quantity || 0;
          sizeQuantities[size.id] = qty;
          totalPieces += qty;
        });

        if (hideZeroBalances && totalPieces === 0) {
          return;
        }

        // Apply search filter (design number or fabric type or description)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesDesign = design.design_number.toLowerCase().includes(query);
          const matchesFabric = (design.fabric_type || '').toLowerCase().includes(query);
          const matchesDesc = (design.description || '').toLowerCase().includes(query);
          const matchesMaster = master.name.toLowerCase().includes(query);
          if (!matchesDesign && !matchesFabric && !matchesDesc && !matchesMaster) {
            return;
          }
        }

        rows.push({
          key: `${master.id}_${design.id}`,
          masterId: master.id,
          masterName: master.name,
          design,
          sizeQuantities,
          totalPieces,
          totalRateValue: totalPieces * (design.rate || 0),
          totalMrpValue: totalPieces * (design.mrp_sticker || design.rate || 0),
        });
      });
    });

    // Sort rows so designs with non-zero stock come first, then alphabetical by design_number
    return rows.sort((a, b) => {
      if (b.totalPieces !== a.totalPieces) {
        return b.totalPieces - a.totalPieces;
      }
      return a.design.design_number.localeCompare(b.design.design_number);
    });
  }, [
    state.masters,
    state.designs,
    sortedSizes,
    selectedMasterId,
    balanceMap,
    hideZeroBalances,
    searchQuery,
  ]);

  // Overall inventory metrics
  const totalStockPieces = useMemo(() => {
    return state.stock_balances.reduce((acc, sb) => acc + (sb.quantity || 0), 0);
  }, [state.stock_balances]);

  const totalRateValuation = useMemo(() => {
    return state.stock_balances.reduce((acc, sb) => {
      const design = designMap.get(sb.design_id);
      const rate = design?.rate || 0;
      return acc + (sb.quantity || 0) * rate;
    }, 0);
  }, [state.stock_balances, designMap]);

  const totalMrpValuation = useMemo(() => {
    return state.stock_balances.reduce((acc, sb) => {
      const design = designMap.get(sb.design_id);
      const mrp = design?.mrp_sticker || design?.rate || 0;
      return acc + (sb.quantity || 0) * mrp;
    }, 0);
  }, [state.stock_balances, designMap]);

  // Size column sums for the current view
  const sizeColumnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sortedSizes.forEach((s) => (totals[s.id] = 0));
    matrixRows.forEach((row) => {
      sortedSizes.forEach((s) => {
        totals[s.id] = (totals[s.id] || 0) + (row.sizeQuantities[s.id] || 0);
      });
    });
    return totals;
  }, [matrixRows, sortedSizes]);

  // Handle cell edit save
  const handleSaveCellEdit = () => {
    if (!activeCellEdit) return;
    const qty = parseInt(activeCellEdit.newQty, 10);
    if (isNaN(qty) || qty < 0) return;

    setStockBalanceDirect(
      activeCellEdit.masterId,
      activeCellEdit.designId,
      activeCellEdit.sizeId,
      qty,
      activeCellEdit.remarks.trim() || undefined
    );
    setActiveCellEdit(null);
    onRefresh();
  };

  // Sorted transactions for ledger view using strict sortDescending
  const sortedTransactions = useMemo(() => {
    return sortDescending(state.transactions || []);
  }, [state.transactions]);

  return (
    <div className="space-y-6">
      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-500">Total Factory Inventory</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
              {totalStockPieces.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500 font-mono">Pcs</span>
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            Across {state.designs.length} designs
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-500">Valuation (At Rate)</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
              ₹{totalRateValuation.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500 font-mono">INR</span>
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            Manufacturing & cutting value
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-500">Retail MRP Value</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
              ₹{totalMrpValuation.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500 font-mono">MRP</span>
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            Tagged sticker price
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-500">Active Cutting Masters</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
              {state.masters.filter((m) => m.is_active).length}
            </span>
            <span className="text-xs text-neutral-500">
              / {state.masters.length} total
            </span>
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            {sortedSizes.length} standard sizes active
          </div>
        </div>
      </div>

      {/* Control & Filter Strip */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search design number, fabric, or master..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-all placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Master Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Master:</span>
            </div>
            <select
              value={selectedMasterId}
              onChange={(e) => setSelectedMasterId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium text-neutral-800"
            >
              <option value="ALL">All Cutting Masters ({state.masters.length})</option>
              {state.masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {!m.is_active ? '(Inactive)' : ''}
                </option>
              ))}
            </select>

            {/* Zero balance toggle */}
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer ml-1 select-none">
              <input
                type="checkbox"
                checked={hideZeroBalances}
                onChange={(e) => setHideZeroBalances(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span>In-stock only</span>
            </label>

            <div className="flex items-center gap-2 ml-auto">
              {onNavigateToStockList && (
                <button
                  onClick={onNavigateToStockList}
                  className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View formatted WhatsApp copyable feed"
                >
                  <span>WhatsApp View</span>
                </button>
              )}

              {onNavigateToAddStock && (
                <button
                  onClick={onNavigateToAddStock}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Maal Stock Entry</span>
                </button>
              )}
            </div>

            {/* Segmented View Switcher */}
            <div className="flex items-center p-1 bg-neutral-100 rounded-lg">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'matrix'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Stock Matrix
              </button>
              <button
                onClick={() => setViewMode('ledger')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'ledger'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Lot History ({state.transactions?.length || 0})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'matrix' ? (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
          {matrixRows.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900">No stock records found</h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                {state.designs.length === 0
                  ? 'Get started by creating your first garment design or loading sample data.'
                  : 'No stock balances match your current filter criteria.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                {state.designs.length === 0 ? (
                  <button
                    onClick={() => onOpenCuttingModal()}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    + Create First Design / Lot
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenCuttingModal()}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    + Record Cutting Inward
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-44">Design No.</th>
                    <th className="py-3 px-3 w-40">Cutting Master</th>
                    {sortedSizes.map((size) => (
                      <th
                        key={size.id}
                        className="py-3 px-3 text-center min-w-[70px] bg-neutral-50/70"
                      >
                        {size.code}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right font-mono min-w-[80px]">Total Pcs</th>
                    <th className="py-3 px-3 text-right font-mono min-w-[75px]">Rate</th>
                    <th className="py-3 px-3 text-right font-mono min-w-[95px]">Valuation</th>
                    <th className="py-3 px-3 text-right font-mono min-w-[85px]">MRP</th>
                    <th className="py-3 px-4 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                  {matrixRows.map((row) => (
                    <tr
                      key={row.key}
                      className="hover:bg-neutral-50/80 transition-colors group"
                    >
                      {/* Design Number & Fabric */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900 text-sm font-mono tracking-wide">
                          {row.design.design_number}
                        </div>
                        {row.design.fabric_type && (
                          <div className="text-[11px] text-neutral-500 truncate max-w-[170px]">
                            {row.design.fabric_type}
                          </div>
                        )}
                      </td>

                      {/* Cutting Master */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-neutral-900">{row.masterName}</div>
                        <div className="text-[10px] text-neutral-400">In Workshop</div>
                      </td>

                      {/* Size Quantities (Interactive Cells) */}
                      {sortedSizes.map((size) => {
                        const qty = row.sizeQuantities[size.id] || 0;
                        const isEditing =
                          activeCellEdit &&
                          activeCellEdit.masterId === row.masterId &&
                          activeCellEdit.designId === row.design.id &&
                          activeCellEdit.sizeId === size.id;

                        if (isEditing) {
                          return (
                            <td key={size.id} className="p-1 text-center bg-amber-50">
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={activeCellEdit.newQty}
                                  onChange={(e) =>
                                    setActiveCellEdit({
                                      ...activeCellEdit,
                                      newQty: e.target.value,
                                    })
                                  }
                                  className="w-16 px-1.5 py-1 text-center text-xs font-bold font-mono bg-white border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCellEdit();
                                    if (e.key === 'Escape') setActiveCellEdit(null);
                                  }}
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={handleSaveCellEdit}
                                    title="Save balance"
                                    className="p-1 bg-neutral-900 text-white rounded hover:bg-neutral-800"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setActiveCellEdit(null)}
                                    title="Cancel"
                                    className="p-1 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={size.id}
                            onClick={() =>
                              setActiveCellEdit({
                                masterId: row.masterId,
                                designId: row.design.id,
                                sizeId: size.id,
                                currentQty: qty,
                                newQty: qty.toString(),
                                remarks: '',
                              })
                            }
                            title="Click to quickly adjust balance"
                            className="py-3 px-3 text-center cursor-pointer hover:bg-amber-50/60 transition-colors"
                          >
                            <span
                              className={`font-mono tabular-nums text-xs font-semibold ${
                                qty > 0 ? 'text-neutral-900' : 'text-neutral-300'
                              }`}
                            >
                              {qty > 0 ? qty : '—'}
                            </span>
                          </td>
                        );
                      })}

                      {/* Total Pieces */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-mono tabular-nums font-bold text-xs ${
                            row.totalPieces > 0 ? 'text-neutral-900' : 'text-neutral-400'
                          }`}
                        >
                          {row.totalPieces.toLocaleString()}
                        </span>
                      </td>

                      {/* Rate */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-600">
                        ₹{row.design.rate}
                      </td>

                      {/* Valuation */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-neutral-900">
                        ₹{row.totalRateValue.toLocaleString()}
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-500">
                        {row.design.mrp_sticker ? `₹${row.design.mrp_sticker}` : '—'}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenCuttingModal(row.design.id, row.masterId)}
                            title="Add cutting inward lot"
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenDispatchModal(row.design.id, row.masterId)}
                            title="Dispatch from this master"
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onNavigateToStickers(row.design.id)}
                            title="Generate MRP Stickers"
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer with Column Totals */}
                <tfoot>
                  <tr className="bg-neutral-100 font-semibold text-xs text-neutral-900 border-t-2 border-neutral-300">
                    <td className="py-3 px-4" colSpan={2}>
                      Total Balance in View ({matrixRows.length} lots)
                    </td>
                    {sortedSizes.map((size) => (
                      <td
                        key={size.id}
                        className="py-3 px-3 text-center font-mono tabular-nums font-bold"
                      >
                        {sizeColumnTotals[size.id]?.toLocaleString() || 0}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-neutral-950">
                      {matrixRows
                        .reduce((acc, r) => acc + r.totalPieces, 0)
                        .toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-500">
                      —
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-neutral-950">
                      ₹
                      {matrixRows
                        .reduce((acc, r) => acc + r.totalRateValue, 0)
                        .toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-500">
                      —
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onNavigateToChallan(selectedMasterId !== 'ALL' ? selectedMasterId : undefined)}
                        className="text-[11px] text-neutral-700 hover:text-neutral-950 underline font-medium"
                      >
                        Make Challan
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Ledger & Movement History View */
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Cutting & Dispatch Audit Ledger</h3>
              <p className="text-xs text-neutral-500">
                Strict newest-first activity log for cutting entries and dispatches
              </p>
            </div>
            <div className="text-xs font-mono text-neutral-500">
              {sortedTransactions.length} records logged
            </div>
          </div>

          {sortedTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No transactions logged yet. Cutting inward and dispatch actions will record here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Reference No</th>
                    <th className="py-3 px-3">Cutting Master</th>
                    <th className="py-3 px-3">Design</th>
                    <th className="py-3 px-3">Size</th>
                    <th className="py-3 px-3 text-right font-mono">Pcs</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                  {sortedTransactions.map((tx) => {
                    const master = masterMap.get(tx.master_id);
                    const design = designMap.get(tx.design_id);
                    const size = sizeMap.get(tx.size_id);
                    const isInward = tx.type === 'INWARD_CUTTING';

                    return (
                      <tr key={tx.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                          {new Date(tx.created_at).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold text-[11px] ${
                              isInward ? 'text-emerald-700' : 'text-neutral-900'
                            }`}
                          >
                            {isInward ? 'Cutting Inward' : 'Dispatch Outward'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-neutral-700">
                          {tx.reference_no || '—'}
                        </td>
                        <td className="py-3 px-3 font-medium text-neutral-900">
                          {master?.name || tx.master_id}
                        </td>
                        <td className="py-3 px-3 font-bold font-mono text-neutral-900">
                          {design?.design_number || tx.design_id}
                        </td>
                        <td className="py-3 px-3 font-semibold text-neutral-700">
                          {size?.code || tx.size_id}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                          <span className={isInward ? 'text-emerald-700' : 'text-neutral-800'}>
                            {isInward ? `+${tx.quantity}` : `-${tx.quantity}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-500 text-[11px]">
                          {tx.remarks || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
