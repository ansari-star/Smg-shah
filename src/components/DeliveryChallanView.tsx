import React, { useState, useMemo } from 'react';
import { StoredState, DesignEntity } from '../types/stock';
import { Printer, FileText, Plus, Trash2, Check, RefreshCw } from 'lucide-react';

interface DeliveryChallanViewProps {
  state: StoredState;
  initialMasterId?: string;
}

interface ChallanItem {
  id: string;
  designId: string;
  sizeId: string;
  quantity: number;
  rate: number;
  description?: string;
}

export const DeliveryChallanView: React.FC<DeliveryChallanViewProps> = ({
  state,
  initialMasterId,
}) => {
  const [challanNo, setChallanNo] = useState(`DC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [consigneeName, setConsigneeName] = useState('M/s Classic Apparels & Trading Co.');
  const [consigneeAddress, setConsigneeAddress] = useState('Shop #14, Wholesale Textile Market, Gandhi Nagar');
  const [vehicleNo, setVehicleNo] = useState('DL-1L-8824');
  const [masterId, setMasterId] = useState(initialMasterId || state.masters[0]?.id || '');
  const [dispatchType, setDispatchType] = useState('Goods Delivery / Issue for Stitching');

  // Design map
  const designMap = useMemo(() => {
    const map = new Map<string, DesignEntity>();
    state.designs.forEach((d) => map.set(d.id, d));
    return map;
  }, [state.designs]);

  // Size map
  const sizeMap = useMemo(() => {
    const map = new Map<string, string>();
    state.sizes.forEach((s) => map.set(s.id, s.code));
    return map;
  }, [state.sizes]);

  // Items in this challan
  const [items, setItems] = useState<ChallanItem[]>(() => {
    // Populate with first 2-3 available balances if present
    const initialItems: ChallanItem[] = [];
    const relevantBalances = initialMasterId
      ? state.stock_balances.filter((sb) => sb.master_id === initialMasterId && sb.quantity > 0)
      : state.stock_balances.filter((sb) => sb.quantity > 0);

    relevantBalances.slice(0, 4).forEach((sb, idx) => {
      const design = state.designs.find((d) => d.id === sb.design_id);
      if (design) {
        initialItems.push({
          id: `item-${idx}`,
          designId: sb.design_id,
          sizeId: sb.size_id,
          quantity: Math.min(sb.quantity, 60),
          rate: design.rate,
          description: design.fabric_type || design.description,
        });
      }
    });

    if (initialItems.length === 0 && state.designs.length > 0) {
      initialItems.push({
        id: 'item-0',
        designId: state.designs[0].id,
        sizeId: state.sizes[0]?.id || 'sz-1',
        quantity: 120,
        rate: state.designs[0].rate,
        description: state.designs[0].fabric_type || 'Cotton Knit',
      });
    }

    return initialItems;
  });

  const handleAddItem = () => {
    const defaultDesign = state.designs[0];
    if (!defaultDesign) return;
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        designId: defaultDesign.id,
        sizeId: state.sizes[0]?.id || 'sz-1',
        quantity: 50,
        rate: defaultDesign.rate,
        description: defaultDesign.fabric_type,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<ChallanItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...updates };
        if (updates.designId) {
          const des = designMap.get(updates.designId);
          if (des) {
            updated.rate = des.rate;
            updated.description = des.fabric_type || des.description;
          }
        }
        return updated;
      })
    );
  };

  const totalQuantity = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const totalAmount = items.reduce((sum, it) => sum + (it.quantity || 0) * (it.rate || 0), 0);

  const selectedMaster = state.masters.find((m) => m.id === masterId);

  return (
    <div className="space-y-6">
      {/* Challan Config Strip (no-print) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Garment Delivery Challan Generator</h2>
            <p className="text-xs text-neutral-500">
              Generate and print factory delivery challans for goods transfer or outward delivery
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Challan (A4)</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Challan Number</label>
            <input
              type="text"
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Date</label>
            <input
              type="date"
              value={challanDate}
              onChange={(e) => setChallanDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Cutting Master / From</label>
            <select
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded font-medium"
            >
              {state.masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Vehicle / Transporter</label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded font-mono"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Consignee Name</label>
            <input
              type="text"
              value={consigneeName}
              onChange={(e) => setConsigneeName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded font-medium"
            />
          </div>
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Consignee Address</label>
            <input
              type="text"
              value={consigneeAddress}
              onChange={(e) => setConsigneeAddress(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded font-medium"
            />
          </div>
        </div>
      </div>

      {/* Printable Challan Document */}
      <div className="bg-white border-2 border-neutral-900 rounded-xl p-8 max-w-4xl mx-auto shadow-md text-neutral-950 font-sans print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-neutral-900 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                S. MOHD GARMENTS & APPARELS
              </h1>
              <p className="text-xs text-neutral-700 font-medium mt-0.5">
                Garment Manufacturers & Exporters · Industrial Estate, Sector 5
              </p>
              <p className="text-[11px] text-neutral-600 font-mono">
                Email: s.mohdgarment@gmail.com · Phone: +91 98201 44521
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block border-2 border-neutral-900 px-3 py-1 font-black text-sm tracking-wider uppercase bg-neutral-100">
                DELIVERY CHALLAN
              </div>
              <div className="mt-2 text-xs font-mono">
                <span className="font-bold">Original:</span> Consignee Copy
              </div>
            </div>
          </div>
        </div>

        {/* Challan Meta & Consignee Box */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-neutral-300 text-xs">
          <div>
            <div className="font-bold uppercase text-[10px] text-neutral-500 mb-1">
              Consignee Details:
            </div>
            <div className="font-bold text-sm text-neutral-950">{consigneeName}</div>
            <div className="text-neutral-700 mt-0.5">{consigneeAddress}</div>
            <div className="mt-2 text-[11px] text-neutral-600">
              <span className="font-semibold">Dispatch Purpose:</span> {dispatchType}
            </div>
          </div>

          <div className="text-right space-y-1 font-mono">
            <div>
              <span className="text-neutral-500 font-sans text-xs">Challan No: </span>
              <span className="font-bold text-sm text-neutral-950">{challanNo}</span>
            </div>
            <div>
              <span className="text-neutral-500 font-sans text-xs">Date: </span>
              <span className="font-semibold">{challanDate}</span>
            </div>
            <div>
              <span className="text-neutral-500 font-sans text-xs">Cutting Master: </span>
              <span className="font-semibold">{selectedMaster?.name || 'In-House'}</span>
            </div>
            <div>
              <span className="text-neutral-500 font-sans text-xs">Vehicle / Transporter: </span>
              <span className="font-semibold">{vehicleNo}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-neutral-900 bg-neutral-100 font-bold uppercase text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                <th className="py-2.5 px-3">Design Number</th>
                <th className="py-2.5 px-3">Description & Fabric</th>
                <th className="py-2.5 px-3 text-center">Size</th>
                <th className="py-2.5 px-3 text-right font-mono">Qty (Pcs)</th>
                <th className="py-2.5 px-3 text-right font-mono">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right font-mono">Amount (₹)</th>
                <th className="py-2.5 px-2 text-center w-12 no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((item, index) => {
                const design = designMap.get(item.designId);
                const sizeName = sizeMap.get(item.sizeId) || item.sizeId;
                const lineTotal = (item.quantity || 0) * (item.rate || 0);

                return (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="py-2 px-3 text-center font-mono font-medium">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={item.designId}
                        onChange={(e) => handleUpdateItem(item.id, { designId: e.target.value })}
                        className="bg-transparent font-bold font-mono focus:outline-none no-print"
                      >
                        {state.designs.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.design_number}
                          </option>
                        ))}
                      </select>
                      <span className="print-only font-bold font-mono">
                        {design?.design_number || item.designId}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                        className="bg-transparent w-full focus:outline-none text-neutral-700 no-print"
                      />
                      <span className="print-only text-neutral-700">
                        {item.description || design?.fabric_type || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <select
                        value={item.sizeId}
                        onChange={(e) => handleUpdateItem(item.id, { sizeId: e.target.value })}
                        className="bg-transparent font-bold text-center focus:outline-none no-print"
                      >
                        {state.sizes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code}
                          </option>
                        ))}
                      </select>
                      <span className="print-only font-bold">{sizeName}</span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            quantity: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-16 text-right font-mono font-bold bg-transparent focus:outline-none no-print"
                      />
                      <span className="print-only font-mono font-bold">
                        {item.quantity.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.5"
                        value={item.rate}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            rate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 text-right font-mono bg-transparent focus:outline-none no-print"
                      />
                      <span className="print-only font-mono">
                        ₹{item.rate.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      ₹{lineTotal.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-center no-print">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-neutral-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-900 bg-neutral-100 font-bold">
                <td className="py-2.5 px-3 text-center" colSpan={4}>
                  TOTAL SUMMARY
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sm font-black">
                  {totalQuantity.toLocaleString()} Pcs
                </td>
                <td className="py-2.5 px-3 text-right font-mono">—</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sm font-black">
                  ₹{totalAmount.toLocaleString()}
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>

          {/* Add item button (no-print) */}
          <div className="mt-3 no-print">
            <button
              onClick={handleAddItem}
              className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Item Line</span>
            </button>
          </div>
        </div>

        {/* Declaration & Signatures */}
        <div className="mt-8 pt-4 border-t border-neutral-300">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="font-bold text-[10px] uppercase text-neutral-500 mb-1">
                Terms & Conditions:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-neutral-600 space-y-0.5">
                <li>Goods once cut or delivered must be checked at the time of receipt.</li>
                <li>Any discrepancy must be reported within 24 hours of delivery.</li>
                <li>This is an internal delivery document for stock movement.</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center mt-6">
              <div className="border-t border-neutral-400 pt-2">
                <p className="text-[11px] font-semibold text-neutral-700">Received By</p>
                <p className="text-[9px] text-neutral-400 mt-1">(Sign & Stamp)</p>
              </div>
              <div className="border-t border-neutral-400 pt-2">
                <p className="text-[11px] font-semibold text-neutral-700">For S. Mohd Garments</p>
                <p className="text-[9px] text-neutral-400 mt-1">(Authorized Signatory)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
