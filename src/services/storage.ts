import { supabase } from '../lib/supabaseClient';

import {
  STORAGE_KEY,
  DEFAULT_STATE,
  SAMPLE_STATE,
  StoredState,
  DesignEntity,
  MasterEntity,
  SizeEntity,
  StockBalanceEntity,
  StockTransactionEntity,
} from '../types/stock';

export function getLocalState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // If nothing saved yet, initialize with default state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw);
    return {
      sizes: Array.isArray(parsed.sizes) ? parsed.sizes : DEFAULT_STATE.sizes,
      masters: Array.isArray(parsed.masters) ? parsed.masters : DEFAULT_STATE.masters,
      designs: Array.isArray(parsed.designs) ? parsed.designs : [],
      stock_balances: Array.isArray(parsed.stock_balances) ? parsed.stock_balances : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      settlements: Array.isArray(parsed.settlements) ? parsed.settlements : [],
    };
  } catch (err) {
    console.error('Failed to read from localStorage:', err);
    return DEFAULT_STATE;
  }
}

export function saveLocalState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('garment_erp_storage_updated'));

    // Cloud Sync to Supabase
    if (supabase) {
      if (state.masters && state.masters.length > 0) {
        supabase.from('masters').upsert(state.masters).then();
      }
      if (state.designs && state.designs.length > 0) {
        supabase.from('designs').upsert(state.designs).then();
      }
      if (state.sizes && state.sizes.length > 0) {
        supabase.from('sizes').upsert(state.sizes).then();
      }
    }
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

      }
      if (state.designs && state.designs.length > 0) {

export function saveLocalState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('garment_erp_storage_updated'));

    // Cloud Sync to Supabase
    if (supabase) {
      if (state.masters && state.masters.length > 0) {
        supabase.from('masters').upsert(state.masters).then();
      }
      if (state.designs && state.designs.length > 0) {
        supabase.from('designs').upsert(state.designs).then();
      }
      if (state.sizes && state.sizes.length > 0) {
        supabase.from('sizes').upsert(state.sizes).then();
      }
    }
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}        

  }
}

// Strict Newest-First Helper (created_at DESC)
export function sortDescending<T extends { created_at?: string; updated_at?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });
}

// Helper to generate IDs
export function generateEntityId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

// Design operations
export function createDesign(data: {
  design_number: string;
  size_id: string;
  rate: number;
  mrp_sticker?: number;
  description?: string;
  fabric_type?: string;
}): DesignEntity {
  const state = getLocalState();
  const newDesign: DesignEntity = {
    id: generateEntityId('des'),
    design_number: data.design_number.trim().toUpperCase(),
    size_id: data.size_id,
    rate: Number(data.rate) || 0,
    mrp_sticker: data.mrp_sticker ? Number(data.mrp_sticker) : undefined,
    description: data.description?.trim(),
    fabric_type: data.fabric_type?.trim(),
    created_at: new Date().toISOString(),
  };

  const updatedState: StoredState = {
    ...state,
    designs: [newDesign, ...state.designs],
  };
  saveLocalState(updatedState);
  return newDesign;
}

export function updateDesign(id: string, updates: Partial<Omit<DesignEntity, 'id' | 'created_at'>>): void {
  const state = getLocalState();
  const designs = state.designs.map((d) =>
    d.id === id
      ? {
          ...d,
          ...updates,
          updated_at: new Date().toISOString(),
        }
      : d
  );
  saveLocalState({ ...state, designs });
}

export function deleteDesign(id: string): void {
  const state = getLocalState();
  const designs = state.designs.filter((d) => d.id !== id);
  const stock_balances = state.stock_balances.filter((sb) => sb.design_id !== id);
  saveLocalState({ ...state, designs, stock_balances });
}

// Master operations
export function createMaster(data: { name: string; phone?: string; notes?: string }): MasterEntity {
  const state = getLocalState();
  const newMaster: MasterEntity = {
    id: generateEntityId('mst'),
    name: data.name.trim(),
    is_active: true,
    phone: data.phone?.trim(),
    notes: data.notes?.trim(),
    created_at: new Date().toISOString(),
  };
  saveLocalState({
    ...state,
    masters: [newMaster, ...state.masters],
  });
  return newMaster;
}

export function toggleMasterStatus(id: string): void {
  const state = getLocalState();
  const masters = state.masters.map((m) =>
    m.id === id ? { ...m, is_active: !m.is_active, updated_at: new Date().toISOString() } : m
  );
  saveLocalState({ ...state, masters });
}

export function updateMaster(id: string, updates: Partial<Omit<MasterEntity, 'id' | 'created_at'>>): void {
  const state = getLocalState();
  const masters = state.masters.map((m) =>
    m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
  );
  saveLocalState({ ...state, masters });
}

// Size operations
export function createSize(code: string, sort_order?: number): SizeEntity {
  const state = getLocalState();
  const maxOrder = state.sizes.reduce((max, s) => Math.max(max, s.sort_order), 0);
  const newSize: SizeEntity = {
    id: generateEntityId('sz'),
    code: code.trim(),
    sort_order: sort_order ?? maxOrder + 1,
    created_at: new Date().toISOString(),
  };
  saveLocalState({
    ...state,
    sizes: [...state.sizes, newSize].sort((a, b) => a.sort_order - b.sort_order),
  });
  return newSize;
}

export function deleteSize(id: string): void {
  const state = getLocalState();
  const sizes = state.sizes.filter((s) => s.id !== id);
  const stock_balances = state.stock_balances.filter((sb) => sb.size_id !== id);
  saveLocalState({ ...state, sizes, stock_balances });
}

// Stock Balance management
export function setStockBalanceDirect(
  master_id: string,
  design_id: string,
  size_id: string,
  quantity: number,
  remarks?: string
): void {
  const state = getLocalState();
  const existingIdx = state.stock_balances.findIndex(
    (sb) => sb.master_id === master_id && sb.design_id === design_id && sb.size_id === size_id
  );

  let updatedBalances = [...state.stock_balances];
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    if (quantity <= 0) {
      // Remove zero balance row or set to 0
      updatedBalances[existingIdx] = {
        ...updatedBalances[existingIdx],
        quantity: 0,
        remarks: remarks ?? updatedBalances[existingIdx].remarks,
        updated_at: now,
      };
    } else {
      updatedBalances[existingIdx] = {
        ...updatedBalances[existingIdx],
        quantity: Math.max(0, quantity),
        remarks: remarks ?? updatedBalances[existingIdx].remarks,
        updated_at: now,
      };
    }
  } else if (quantity > 0) {
    const newRecord: StockBalanceEntity = {
      id: generateEntityId('sb'),
      master_id,
      design_id,
      size_id,
      quantity,
      remarks,
      created_at: now,
    };
    updatedBalances.push(newRecord);
  }

  saveLocalState({ ...state, stock_balances: updatedBalances });
}

// Record Inward Cutting Entry across multiple sizes in one lot
export function recordCuttingInward(data: {
  master_id: string;
  design_id: string;
  quantities: Record<string, number>; // size_id -> quantity
  remarks?: string;
  reference_no?: string;
}): void {
  const state = getLocalState();
  const now = new Date().toISOString();
  let updatedBalances = [...state.stock_balances];
  const newTransactions: StockTransactionEntity[] = [];

  for (const [size_id, qty] of Object.entries(data.quantities)) {
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) continue;

    // 1. Update or create StockBalance
    const existingIdx = updatedBalances.findIndex(
      (sb) => sb.master_id === data.master_id && sb.design_id === data.design_id && sb.size_id === size_id
    );

    if (existingIdx >= 0) {
      updatedBalances[existingIdx] = {
        ...updatedBalances[existingIdx],
        quantity: updatedBalances[existingIdx].quantity + quantity,
        remarks: data.remarks || updatedBalances[existingIdx].remarks,
        updated_at: now,
      };
    } else {
      updatedBalances.push({
        id: generateEntityId('sb'),
        master_id: data.master_id,
        design_id: data.design_id,
        size_id,
        quantity,
        remarks: data.remarks,
        created_at: now,
      });
    }

    // 2. Record transaction
    newTransactions.push({
      id: generateEntityId('tx'),
      type: 'INWARD_CUTTING',
      master_id: data.master_id,
      design_id: data.design_id,
      size_id,
      quantity,
      reference_no: data.reference_no,
      remarks: data.remarks,
      created_at: now,
    });
  }

  saveLocalState({
    ...state,
    stock_balances: updatedBalances,
    transactions: [...newTransactions, ...(state.transactions || [])],
  });
}

// Record Outward Dispatch / Challan deduction
export function recordOutwardDispatch(data: {
  master_id: string;
  design_id: string;
  quantities: Record<string, number>; // size_id -> quantity
  remarks?: string;
  reference_no?: string;
}): { success: boolean; message?: string } {
  const state = getLocalState();
  const now = new Date().toISOString();
  let updatedBalances = [...state.stock_balances];
  const newTransactions: StockTransactionEntity[] = [];

  for (const [size_id, qty] of Object.entries(data.quantities)) {
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) continue;

    const existingIdx = updatedBalances.findIndex(
      (sb) => sb.master_id === data.master_id && sb.design_id === data.design_id && sb.size_id === size_id
    );

    const currentQty = existingIdx >= 0 ? updatedBalances[existingIdx].quantity : 0;
    const newQty = Math.max(0, currentQty - quantity);

    if (existingIdx >= 0) {
      updatedBalances[existingIdx] = {
        ...updatedBalances[existingIdx],
        quantity: newQty,
        remarks: data.remarks || updatedBalances[existingIdx].remarks,
        updated_at: now,
      };
    } else {
      updatedBalances.push({
        id: generateEntityId('sb'),
        master_id: data.master_id,
        design_id: data.design_id,
        size_id,
        quantity: 0,
        remarks: data.remarks,
        created_at: now,
      });
    }

    newTransactions.push({
      id: generateEntityId('tx'),
      type: 'OUTWARD_DISPATCH',
      master_id: data.master_id,
      design_id: data.design_id,
      size_id,
      quantity,
      reference_no: data.reference_no,
      remarks: data.remarks,
      created_at: now,
    });
  }

  saveLocalState({
    ...state,
    stock_balances: updatedBalances,
    transactions: [...newTransactions, ...(state.transactions || [])],
  });

  return { success: true };
}

// Backup & Recovery
export function exportStateJson(): string {
  const state = getLocalState();
  return JSON.stringify(state, null, 2);
}

export function importStateJson(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.sizes) || !Array.isArray(parsed.masters)) {
      return { success: false, message: 'Invalid format: Must contain sizes and masters arrays.' };
    }
    saveLocalState(parsed);
    return { success: true, message: 'Successfully imported garment database.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown JSON parse error';
    return { success: false, message: `JSON parsing error: ${errorMsg}` };
  }
}

export function loadSampleState(): void {
  saveLocalState(SAMPLE_STATE);
}

export function resetToEmptyDefault(): void {
  saveLocalState(DEFAULT_STATE);
}
