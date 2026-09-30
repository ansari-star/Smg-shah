import { supabase } from './supabaseClient';

export interface AppState {
  masters: any[];
  designs: any[];
  sizes: any[];
  stock_balances: any[];
  bills: any[];
  settings?: any;
  transactions?: any[];
  payments?: any[];
  settlements?: any[];
}

export const STORAGE_KEY = 'factory_bill_stock_db_v2';
const STORAGE_CACHE_KEY = 'factory_bill_stock_db_v2';

export const getInitialState = (): AppState => ({
  masters: [],
  designs: [],
  stock_balances: [],
  bills: [],
  sizes: [
    { id: 'sz-1', code: '18/22', sort_order: 1, created_at: new Date().toISOString() },
    { id: 'sz-2', code: '24/34', sort_order: 2, created_at: new Date().toISOString() },
    { id: 'sz-3', code: '36/40', sort_order: 3, created_at: new Date().toISOString() },
  ],
  settings: {},
  transactions: [],
  payments: [],
  settlements: [],
});

// Fast local cache read taaki screen turant render ho
export const getLocalState = (): AppState => {
  if (typeof window === 'undefined') return getInitialState();
  const cached = localStorage.getItem(STORAGE_CACHE_KEY);
  if (!cached) {
    const fresh = getInitialState();
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(fresh));
    return fresh;
  }
  try {
    const parsed = JSON.parse(cached);
    return {
      masters: Array.isArray(parsed.masters) ? parsed.masters : [],
      designs: Array.isArray(parsed.designs) ? parsed.designs : [],
      sizes: Array.isArray(parsed.sizes) && parsed.sizes.length > 0 ? parsed.sizes : getInitialState().sizes,
      stock_balances: Array.isArray(parsed.stock_balances) ? parsed.stock_balances : [],
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      settings: parsed.settings || {},
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      settlements: Array.isArray(parsed.settlements) ? parsed.settlements : [],
    };
  } catch {
    return getInitialState();
  }
};

// Local cache save
export const saveLocalState = (state: AppState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('garment-erp-storage-updated'));
  }
};

export const resetEntireAppDatabase = () => {
  if (typeof window !== 'undefined') {
    const cleanState = getInitialState();
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cleanState));
    window.dispatchEvent(new Event('garment-erp-storage-updated'));
    return cleanState;
  }
  return getInitialState();
};

// -------------------------------------------------------------
// LIVE SUPABASE CLOUD SYNC FUNCTIONS (Permanent Data Safety)
// -------------------------------------------------------------

// 1. Cloud se poora data fetch karna
export const fetchCloudState = async (): Promise<AppState> => {
  try {
    const [mastersRes, designsRes, sizesRes, stocksRes, billsRes] = await Promise.all([
      supabase.from('masters').select('*').order('created_at', { ascending: false }),
      supabase.from('designs').select('*').order('created_at', { ascending: false }),
      supabase.from('sizes').select('*').order('sort_order', { ascending: true }),
      supabase.from('stock_balances').select('*').order('updated_at', { ascending: false }),
      supabase.from('bills').select('*').order('created_at', { ascending: false }),
    ]);

    const localCurrent = getLocalState();
    const cloudState: AppState = {
      masters: mastersRes.data || [],
      designs: designsRes.data || [],
      sizes: (sizesRes.data && sizesRes.data.length > 0) ? sizesRes.data : getInitialState().sizes,
      stock_balances: stocksRes.data || [],
      bills: billsRes.data || [],
      settings: localCurrent.settings || {},
      transactions: localCurrent.transactions || [],
      payments: localCurrent.payments || [],
      settlements: localCurrent.settlements || [],
    };

    saveLocalState(cloudState);
    return cloudState;
  } catch (err) {
    console.error('Supabase fetch error, fallback to cache:', err);
    return getLocalState();
  }
};

// 2. Naya Master Cloud me Save/Delete
export const syncMasterToCloud = async (master: any, action: 'upsert' | 'delete') => {
  try {
    if (action === 'delete') {
      await supabase.from('masters').delete().eq('id', master.id);
    } else {
      await supabase.from('masters').upsert({
        id: master.id,
        name: master.name,
        created_at: master.created_at || new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error('Error syncing master to Supabase:', e);
  }
};

// 3. Naya Design Cloud me Save/Delete
export const syncDesignToCloud = async (design: any, action: 'upsert' | 'delete') => {
  try {
    if (action === 'delete') {
      await supabase.from('designs').delete().eq('id', design.id);
    } else {
      await supabase.from('designs').upsert({
        id: design.id,
        design_number: design.design_number,
        size_id: design.size_id,
        rate: design.rate || 0,
        mrp_sticker: design.mrp_sticker || 0,
        created_at: design.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error('Error syncing design to Supabase:', e);
  }
};

// 4. Stock Balance Cloud me Save/Delete
export const syncStockBalanceToCloud = async (stock: any, action: 'upsert' | 'delete') => {
  try {
    if (action === 'delete') {
      await supabase.from('stock_balances').delete().eq('id', stock.id);
    } else {
      await supabase.from('stock_balances').upsert({
        id: stock.id,
        master_id: stock.master_id,
        design_id: stock.design_id,
        size_id: stock.size_id,
        quantity: stock.quantity,
        remarks: stock.remarks || '',
        created_at: stock.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error('Error syncing stock balance to Supabase:', e);
  }
};

// 5. Bill (Chalan) Cloud me Save
export const syncBillToCloud = async (bill: any) => {
  try {
    await supabase.from('bills').upsert({
      id: bill.id,
      cycle: bill.cycle,
      bill_number: bill.bill_number,
      bill_date: bill.bill_date,
      customer_name: bill.customer_name || 'abc',
      remarks: bill.remarks || '',
      items: bill.items,
      total_pieces: bill.total_pieces,
      total_amount: bill.total_amount,
      status: bill.status || 'ACTIVE',
      created_at: bill.created_at || new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error syncing bill to Supabase:', e);
  }
};

export const sortDescending = (arr: any[]) => {
  return [...arr].sort((a, b) => {
    const da = new Date(a.updated_at || a.created_at || 0).getTime();
    const db = new Date(b.updated_at || b.created_at || 0).getTime();
    return db - da;
  });
};

export const numberToWordsINR = (num: number): string => {
  if (!num || num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str;
  };

  let n = Math.floor(num);
  let crore = Math.floor(n / 10000000);
  n %= 10000000;
  let lakh = Math.floor(n / 100000);
  n %= 100000;
  let thousand = Math.floor(n / 1000);
  n %= 1000;

  let res = '';
  if (crore) res += inWords(crore) + 'Crore ';
  if (lakh) res += inWords(lakh) + 'Lakh ';
  if (thousand) res += inWords(thousand) + 'Thousand ';
  if (n) res += inWords(n);

  return res.trim() + ' Rupees Only';
};

// Re-export entity helper operations for backwards-compatibility
export * from '../services/storage';
export * from '../types/stock';
export * from './auth';
export * from './supabase';
