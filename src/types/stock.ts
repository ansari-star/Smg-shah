export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface DesignEntity extends BaseEntity {
  design_number: string;
  size_id: string;
  rate: number;
  mrp_sticker?: number;
  description?: string;
  fabric_type?: string;
}

export interface SizeEntity extends BaseEntity {
  code: string;
  sort_order: number;
}

export interface MasterEntity extends BaseEntity {
  name: string;
  is_active: boolean;
  phone?: string;
  notes?: string;
}

export interface StockBalanceEntity extends BaseEntity {
  master_id: string;
  design_id: string;
  size_id: string;
  quantity: number;
  remarks?: string;
}

export interface StockTransactionEntity extends BaseEntity {
  type: 'INWARD_CUTTING' | 'OUTWARD_DISPATCH' | 'ADJUSTMENT' | 'TRANSFER';
  master_id: string;
  target_master_id?: string;
  design_id: string;
  size_id: string;
  quantity: number;
  reference_no?: string;
  remarks?: string;
}

export interface BillLineItem {
  id: string;
  master_id: string;
  master_name?: string;
  design_id: string;
  design_number?: string;
  size_id: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Bill {
  id: string;
  cycle: number;
  bill_number: number;
  bill_date: string;
  customer_name: string;
  customer_phone?: string;
  remarks?: string;
  items: BillLineItem[];
  total_pieces: number;
  total_amount: number;
  status: 'ACTIVE' | 'CANCELLED';
  created_at: string;
}

export interface Payment {
  id: string;
  master_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  remarks?: string;
  created_at: string;
}

export interface HisaabSettlement {
  id: string;
  master_id: string;
  settled_date: string;
  cleared_amount: number;
  cleared_pieces: number;
  notes?: string;
  created_at: string;
}

export interface FactorySettings {
  hisaab_day?: number;
  [key: string]: any;
}

export interface StoredState {
  designs: Array<DesignEntity>;
  sizes: Array<SizeEntity>;
  masters: Array<MasterEntity>;
  stock_balances: Array<StockBalanceEntity>;
  transactions?: Array<StockTransactionEntity>;
  bills?: Array<Bill>;
  payments?: Payment[];
  settlements?: HisaabSettlement[];
  settings?: FactorySettings;
}

export function numberToWordsINR(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n: number): string => {
    if (n === 0) return '';
    let str = '';
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) str += a[n];
      else str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    }
    return str;
  };
  const integerPart = Math.floor(num);
  const words = inWords(integerPart);
  return words ? `Rupees ${words.trim()} Only` : 'Rupees Zero Only';
}

export const STORAGE_KEY = 'factory_bill_stock_db_v2';

export const DEFAULT_STATE: StoredState = {
  sizes: [
    { id: 'sz-1', code: '18/22', sort_order: 1, created_at: new Date().toISOString() },
    { id: 'sz-2', code: '24/34', sort_order: 2, created_at: new Date().toISOString() },
    { id: 'sz-3', code: '36/40', sort_order: 3, created_at: new Date().toISOString() },
  ],
  masters: [],        // Bilkul empty (Naya master aap settings se add karenge)
  designs: [],        // Bilkul empty (Design Catalog se aap add karenge)
  stock_balances: [], // Bilkul empty
  bills: [],          // Bilkul empty
  transactions: [],
  payments: [],
  settlements: [],
};

// Rich initial seed data for immediate demonstration if user chooses to load samples
export const SAMPLE_STATE: StoredState = {
  sizes: [
    { id: 'sz-1', code: '18/22', sort_order: 1, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'sz-2', code: '24/34', sort_order: 2, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'sz-3', code: '36/40', sort_order: 3, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'sz-4', code: '42/44', sort_order: 4, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  ],
  masters: [
    { id: 'm-1', name: 'Master Saleem', is_active: true, phone: '+91 98201 44521', notes: 'Top kids wear cutting specialist', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'm-2', name: 'Master Rafiq', is_active: true, phone: '+91 98450 12890', notes: 'Suit & Kurta pattern expert', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 'm-3', name: 'Master Tariq', is_active: true, phone: '+91 98112 77341', notes: 'Shirt & Denim cutting master', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  ],
  designs: [
    { id: 'd-101', design_number: 'DN-101', size_id: 'sz-2', rate: 185, mrp_sticker: 599, description: 'Kids Boys Printed Cotton Set', fabric_type: '100% Pure Cotton Hosiery', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 'd-102', design_number: 'DN-102', size_id: 'sz-2', rate: 210, mrp_sticker: 699, description: 'Denim Wash Dungaree Style', fabric_type: 'Soft Denim Lycra', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'd-205', design_number: 'DN-205', size_id: 'sz-3', rate: 260, mrp_sticker: 849, description: 'Mens Striped Casual Shirt', fabric_type: 'Linen Cotton Blend', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'd-304', design_number: 'DN-304', size_id: 'sz-1', rate: 140, mrp_sticker: 449, description: 'Toddler Baba Suit Embroidered', fabric_type: 'Interlock Cotton', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'd-408', design_number: 'DN-408', size_id: 'sz-3', rate: 320, mrp_sticker: 1099, description: 'Party Wear Kurta Pajama', fabric_type: 'Jacquard Silk Finish', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
  ],
  stock_balances: [
    { id: 'sb-1', master_id: 'm-1', design_id: 'd-101', size_id: 'sz-1', quantity: 120, remarks: 'Lot #42 - Blue & Yellow mix', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'sb-2', master_id: 'm-1', design_id: 'd-101', size_id: 'sz-2', quantity: 240, remarks: 'Lot #42 - Red & Navy', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'sb-3', master_id: 'm-1', design_id: 'd-101', size_id: 'sz-3', quantity: 80, remarks: 'Lot #42 - Olive', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'sb-4', master_id: 'm-1', design_id: 'd-102', size_id: 'sz-2', quantity: 150, remarks: 'Lot #44 - Indigo wash', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'sb-5', master_id: 'm-1', design_id: 'd-304', size_id: 'sz-1', quantity: 95, remarks: 'Lot #45 - Baby pastel tones', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'sb-6', master_id: 'm-2', design_id: 'd-205', size_id: 'sz-2', quantity: 180, remarks: 'Lot #38 - White/Navy stripe', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'sb-7', master_id: 'm-2', design_id: 'd-205', size_id: 'sz-3', quantity: 210, remarks: 'Lot #38 - Beige/Charcoal', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'sb-8', master_id: 'm-2', design_id: 'd-408', size_id: 'sz-3', quantity: 60, remarks: 'Lot #51 - Maroon & Gold', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'sb-9', master_id: 'm-3', design_id: 'd-102', size_id: 'sz-3', quantity: 110, remarks: 'Lot #48 - Dark stone wash', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
  ],
  transactions: [
    { id: 'tx-1', type: 'INWARD_CUTTING', master_id: 'm-1', design_id: 'd-101', size_id: 'sz-2', quantity: 240, reference_no: 'CUT-2026-081', remarks: 'Fresh cutting lot received', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'tx-2', type: 'INWARD_CUTTING', master_id: 'm-2', design_id: 'd-205', size_id: 'sz-3', quantity: 210, reference_no: 'CUT-2026-082', remarks: 'Bulk cutting roll #12', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'tx-3', type: 'OUTWARD_DISPATCH', master_id: 'm-1', design_id: 'd-101', size_id: 'sz-2', quantity: 40, reference_no: 'DC-2026-019', remarks: 'Dispatched to Stitching Unit 2', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
  ],
};
