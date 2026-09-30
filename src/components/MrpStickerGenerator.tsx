import React, { useState, useMemo } from 'react';
import { StoredState, DesignEntity } from '../types/stock';
import { Printer, Tag, Sparkles, RefreshCw, Barcode } from 'lucide-react';

interface MrpStickerGeneratorProps {
  state: StoredState;
  selectedDesignId?: string;
}

export const MrpStickerGenerator: React.FC<MrpStickerGeneratorProps> = ({
  state,
  selectedDesignId,
}) => {
  const [designId, setDesignId] = useState<string>(selectedDesignId || state.designs[0]?.id || '');
  const [sizeId, setSizeId] = useState<string>(state.sizes[0]?.id || '');
  const [brandName, setBrandName] = useState('S. MOHD GARMENTS');
  const [articleName, setArticleName] = useState('PREMIUM COTTON WEAR');
  const [stickerCount, setStickerCount] = useState<number>(12);
  const [customMrp, setCustomMrp] = useState<string>('');
  const [secretRateCode, setSecretRateCode] = useState<string>('');
  const [labelSize, setLabelSize] = useState<'standard' | 'compact'>('standard');

  const selectedDesign = useMemo(() => {
    return state.designs.find((d) => d.id === designId);
  }, [state.designs, designId]);

  const selectedSize = useMemo(() => {
    return state.sizes.find((s) => s.id === sizeId);
  }, [state.sizes, sizeId]);

  // Sync custom MRP and rate code when design changes
  React.useEffect(() => {
    if (selectedDesign) {
      setCustomMrp(selectedDesign.mrp_sticker ? selectedDesign.mrp_sticker.toString() : '599');
      // Indian garment market rate code helper e.g. R-180 or custom
      setSecretRateCode(`RC-${Math.round(selectedDesign.rate)}`);
      if (selectedDesign.description) {
        setArticleName(selectedDesign.description.toUpperCase());
      }
    }
  }, [selectedDesign]);

  const currentMrp = customMrp || (selectedDesign?.mrp_sticker ? selectedDesign.mrp_sticker.toString() : '599');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Control Configuration Panel (no-print) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 no-print">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Garment MRP & Barcode Sticker Generator</h2>
            <p className="text-xs text-neutral-500">
              Format thermal stickers or multi-up A4 adhesive sheets for polybag packaging and retail tags
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print {stickerCount} Stickers</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Garment Design
            </label>
            <select
              value={designId}
              onChange={(e) => setDesignId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium"
            >
              {state.designs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.design_number} (Rate: ₹{d.rate})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Garment Size
            </label>
            <select
              value={sizeId}
              onChange={(e) => setSizeId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium"
            >
              {state.sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  Size: {s.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              MRP Sticker Price (₹)
            </label>
            <input
              type="number"
              value={customMrp}
              onChange={(e) => setCustomMrp(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Number of Stickers
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={stickerCount}
              onChange={(e) => setStickerCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Manufacturer / Brand Name
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 uppercase font-semibold text-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Style / Article Description
            </label>
            <input
              type="text"
              value={articleName}
              onChange={(e) => setArticleName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Rate Code (Internal Secret Code)
            </label>
            <input
              type="text"
              value={secretRateCode}
              onChange={(e) => setSecretRateCode(e.target.value)}
              placeholder="e.g. RC-180"
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono uppercase"
            />
          </div>
        </div>
      </div>

      {/* Print Sheet Container */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 no-print">
          <span className="text-xs font-semibold text-neutral-700">
            Print Preview ({stickerCount} Stickers Ready)
          </span>
          <span className="text-xs text-neutral-400">
            Standard 50mm x 35mm thermal or 24-up A4 sticker compatible
          </span>
        </div>

        {/* Sticker Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
          {Array.from({ length: stickerCount }).map((_, index) => (
            <div
              key={index}
              className="border-2 border-neutral-900 rounded-md p-3 bg-white print-break-inside-avoid shadow-xs flex flex-col justify-between text-neutral-900 select-none"
              style={{ minHeight: '135px' }}
            >
              {/* Brand Header */}
              <div className="border-b border-neutral-300 pb-1 text-center">
                <div className="text-[11px] font-black tracking-wider uppercase font-sans">
                  {brandName}
                </div>
                <div className="text-[9px] text-neutral-600 font-medium truncate">
                  {articleName}
                </div>
              </div>

              {/* Design & Size Middle Row */}
              <div className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase font-bold text-neutral-500">Design</div>
                  <div className="text-sm font-black font-mono tracking-wider">
                    {selectedDesign?.design_number || 'DN-101'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[9px] uppercase font-bold text-neutral-500">Size</div>
                  <div className="text-sm font-black font-mono px-1.5 py-0.5 bg-neutral-100 rounded border border-neutral-300 inline-block">
                    {selectedSize?.code || '18/22'}
                  </div>
                </div>
              </div>

              {/* Barcode Line */}
              <div className="my-1 flex flex-col items-center">
                <div className="w-full flex items-center justify-center gap-[2px] h-6 overflow-hidden">
                  {/* Visual barcode bars */}
                  {[3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 2, 1, 3].map(
                    (width, i) => (
                      <div
                        key={i}
                        className="bg-neutral-950 h-full"
                        style={{ width: `${width}px` }}
                      />
                    )
                  )}
                </div>
                <div className="text-[9px] font-mono tracking-widest text-neutral-700">
                  {selectedDesign?.design_number}-{selectedSize?.code}
                </div>
              </div>

              {/* MRP & Rate Code Footer */}
              <div className="border-t border-neutral-300 pt-1 flex items-baseline justify-between">
                <div>
                  <span className="text-[9px] font-bold text-neutral-500 mr-1">MRP:</span>
                  <span className="text-base font-black font-mono tabular-nums">
                    ₹{currentMrp}
                  </span>
                  <span className="text-[8px] text-neutral-500 block -mt-1 font-medium">
                    (Incl. of all taxes)
                  </span>
                </div>

                {secretRateCode && (
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-neutral-600 font-bold">
                      {secretRateCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
