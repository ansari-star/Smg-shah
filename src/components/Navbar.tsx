import React from 'react';
import { Plus, Send, Database, Scissors, Sparkles, BookOpen } from 'lucide-react';

interface NavbarProps {
  activeTab: 'matrix' | 'stock_list' | 'add_stock' | 'design_master' | 'designs' | 'masters' | 'sizes' | 'stickers' | 'challan' | 'bills' | 'new_bill' | 'invoice_view' | 'statement';
  setActiveTab: (tab: 'matrix' | 'stock_list' | 'add_stock' | 'design_master' | 'designs' | 'masters' | 'sizes' | 'stickers' | 'challan' | 'bills' | 'new_bill' | 'invoice_view' | 'statement') => void;
  onOpenCuttingModal: () => void;
  onOpenDispatchModal: () => void;
  onOpenBackupModal: () => void;
  totalPieces: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCuttingModal,
  onOpenDispatchModal,
  onOpenBackupModal,
  totalPieces,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-semibold text-sm">
              <Scissors className="w-4 h-4 text-amber-400" />
            </div>
            <button
              onClick={() => setActiveTab('matrix')}
              className="text-left group cursor-pointer focus:outline-none"
            >
              <span className="text-base font-bold tracking-tight text-neutral-900 group-hover:text-neutral-700 transition-colors">
                StockView Garment ERP
              </span>
            </button>
          </div>

          {/* Zone 2: Clean navigation links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer ${
                activeTab === 'matrix'
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Stock Matrix
            </button>
            <button
              onClick={() => setActiveTab('stock_list')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'stock_list'
                  ? 'border-emerald-600 text-emerald-800 font-bold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>WhatsApp Stock</span>
            </button>
            <button
              onClick={() => setActiveTab('design_master')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'design_master'
                  ? 'border-amber-500 text-neutral-900 font-bold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-amber-500" />
              <span>Design Master</span>
            </button>
            <button
              onClick={() => setActiveTab('designs')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer ${
                activeTab === 'designs'
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Designs Catalog
            </button>
            <button
              onClick={() => setActiveTab('masters')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer ${
                activeTab === 'masters'
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Cutting Masters
            </button>
            <button
              onClick={() => setActiveTab('sizes')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer ${
                activeTab === 'sizes'
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Sizes
            </button>
            <button
              onClick={() => setActiveTab('stickers')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer ${
                activeTab === 'stickers'
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              MRP Stickers
            </button>
            <button
              onClick={() => setActiveTab('challan')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer ${
                activeTab === 'challan'
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Challan
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`transition-colors pb-1 border-b-2 cursor-pointer font-bold ${
                activeTab === 'bills'
                  ? 'border-blue-600 text-blue-800 font-bold'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Bills
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'statement' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-400" /> Statement
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenBackupModal}
              title="Backup & Restore Data"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setActiveTab('add_stock')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'add_stock'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Maal Entry</span>
            </button>

            <button
              onClick={onOpenDispatchModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch</span>
            </button>

            <button
              onClick={onOpenCuttingModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Cutting Lot</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sub-bar */}
        <div className="flex md:hidden items-center gap-4 overflow-x-auto py-2.5 border-t border-neutral-100 text-xs font-medium">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`whitespace-nowrap ${activeTab === 'matrix' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
          >
            Matrix
          </button>
          <button
            onClick={() => setActiveTab('stock_list')}
            className={`whitespace-nowrap font-bold ${activeTab === 'stock_list' ? 'text-emerald-700 font-bold' : 'text-neutral-700'}`}
          >
            WhatsApp Stock
          </button>
          <button
            onClick={() => setActiveTab('design_master')}
            className={`whitespace-nowrap font-bold ${activeTab === 'design_master' ? 'text-amber-600 font-bold' : 'text-neutral-700'}`}
          >
            ✂ Design Master
          </button>
          <button
            onClick={() => setActiveTab('designs')}
            className={`whitespace-nowrap ${activeTab === 'designs' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
          >
            Catalog
          </button>
          <button
            onClick={() => setActiveTab('masters')}
            className={`whitespace-nowrap ${activeTab === 'masters' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
          >
            Masters
          </button>
          <button
            onClick={() => setActiveTab('sizes')}
            className={`whitespace-nowrap ${activeTab === 'sizes' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
          >
            Sizes
          </button>
          <button
            onClick={() => setActiveTab('stickers')}
            className={`whitespace-nowrap ${activeTab === 'stickers' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
          >
            Stickers
          </button>
          <button
            onClick={() => setActiveTab('challan')}
            className={`whitespace-nowrap ${activeTab === 'challan' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
          >
            Challan
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`whitespace-nowrap font-bold ${activeTab === 'bills' ? 'text-blue-700 font-bold' : 'text-neutral-700'}`}
          >
            Bills
          </button>
          <button
            onClick={() => setActiveTab('statement')}
            className={`whitespace-nowrap font-bold inline-flex items-center gap-1 ${
              activeTab === 'statement' ? 'text-emerald-700 font-bold' : 'text-neutral-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Statement
          </button>
        </div>
      </div>
    </header>
  );
};
