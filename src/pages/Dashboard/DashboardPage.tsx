import React, { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, Clock, CalendarDays, Package, Plus } from 'lucide-react';
import { getLocalState, sortDescending, fetchCloudState } from '../../lib/storage';
import { AppUser } from '../../lib/auth';

interface DashboardPageProps {
  onNavigateAddStock: () => void;
  currentUser?: AppUser | null;
}

type TimeFilterType = 'today' | 'yesterday' | 'last_3_days';

export default function DashboardPage({ onNavigateAddStock, currentUser }: DashboardPageProps) {
  const [state, setState] = useState(getLocalState());
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('today'); // Default: current date only

  const reloadData = () => {
    setState(getLocalState());
  };

  useEffect(() => {
    reloadData();
    fetchCloudState().then((latestState) => {
      setState(latestState);
    });

    const handleStorageUpdate = () => reloadData();
    window.addEventListener('garment-erp-storage-updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('garment-erp-storage-updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const isMaster = currentUser?.role === 'MASTER';

  // Agar currentUser.role === 'MASTER' hai to sirf uske master_id ka stock filter karein:
  const effectiveBalances = useMemo(() => {
    let list = state.stock_balances || [];
    if (currentUser?.role === 'MASTER' && currentUser?.master_id) {
      list = list.filter((b: any) => b.master_id === currentUser.master_id);
    }
    return list;
  }, [state.stock_balances, currentUser]);

  // Time window calculation helpers (Asia/Kolkata date format YYYY-MM-DD)
  const isWithinTimeRange = (dateStr?: string, filter: TimeFilterType = 'today') => {
    if (!dateStr) return false;
    const targetDate = new Date(dateStr);
    const now = new Date();

    const getMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const targetMidnight = getMidnight(targetDate).getTime();
    const todayMidnight = getMidnight(now).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (filter === 'today') {
      return targetMidnight === todayMidnight;
    }
    if (filter === 'yesterday') {
      return targetMidnight === todayMidnight - oneDayMs;
    }
    if (filter === 'last_3_days') {
      const threeDaysAgo = todayMidnight - (3 * oneDayMs);
      return targetMidnight >= threeDaysAgo && targetMidnight <= todayMidnight;
    }
    return false;
  };

  // 1. Filter by selected time window (Default: current date) on effectiveBalances
  const timeFilteredLines = useMemo(() => {
    return effectiveBalances.filter((b) => {
      const lastUpdate = b.updated_at || b.created_at;
      return isWithinTimeRange(lastUpdate, timeFilter);
    });
  }, [effectiveBalances, timeFilter]);

  // 2. Strict De-duplication: Sabse last update entry hi dikhegi per Master + Design + Size
  const latestUniqueLines = useMemo(() => {
    const sorted = sortDescending(timeFilteredLines);
    const map = new Map<string, (typeof state.stock_balances)[0]>();

    sorted.forEach((item) => {
      const key = `${item.master_id}_${item.design_id}_${item.size_id}`;
      if (!map.has(key)) {
        map.set(key, item); // Newest/latest update pehle aayega
      }
    });

    return Array.from(map.values());
  }, [timeFilteredLines]);

  // 3. Search Filter
  const displayItems = useMemo(() => {
    let list = latestUniqueLines;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const des = state.designs.find((d) => d.id === item.design_id);
        const m = state.masters.find((mas) => mas.id === item.master_id);
        return (
          des?.design_number.toLowerCase().includes(q) ||
          m?.name.toLowerCase().includes(q) ||
          item.remarks?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [latestUniqueLines, state.designs, state.masters, searchQuery]);

  // Master-Wise Grouping
  const masterGroups = useMemo(() => {
    const map = new Map<string, { masterName: string; lines: typeof displayItems }>();
    displayItems.forEach((b) => {
      const m = state.masters.find((mas) => mas.id === b.master_id);
      const name = m?.name || 'Master';
      if (!map.has(b.master_id)) map.set(b.master_id, { masterName: name, lines: [] });
      map.get(b.master_id)!.lines.push(b);
    });
    return Array.from(map.values());
  }, [displayItems, state.masters]);

  // Counts for each tab
  const filterCounts = useMemo(() => {
    return {
      today: effectiveBalances.filter((b) => isWithinTimeRange(b.updated_at || b.created_at, 'today')).length,
      yesterday: effectiveBalances.filter((b) => isWithinTimeRange(b.updated_at || b.created_at, 'yesterday')).length,
      last_3_days: effectiveBalances.filter((b) => isWithinTimeRange(b.updated_at || b.created_at, 'last_3_days')).length,
    };
  }, [effectiveBalances]);

  const totalPieces = displayItems.reduce((acc: number, curr) => acc + curr.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-3">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span>Dashboard</span>
          {isMaster && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
              Master Filter Active
            </span>
          )}
        </h1>
        <button
          type="button"
          onClick={onNavigateAddStock}
          className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer transition-colors shadow-2xs"
          title="Add Stock"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Search Bar */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search Design, Size, Master, Remark..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
        />
      </div>

      {/* 2. Compact 3-Tab Filter Bar */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl mb-4 text-xs font-bold font-mono">
        <button
          type="button"
          onClick={() => setTimeFilter('today')}
          className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
            timeFilter === 'today'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Today</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${timeFilter === 'today' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'}`}>
            {filterCounts.today}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTimeFilter('yesterday')}
          className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
            timeFilter === 'yesterday'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Yesterday</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${timeFilter === 'yesterday' ? 'bg-slate-800 text-blue-300' : 'bg-slate-200 text-slate-700'}`}>
            {filterCounts.yesterday}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTimeFilter('last_3_days')}
          className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
            timeFilter === 'last_3_days'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            <span>Last 3 Days</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${timeFilter === 'last_3_days' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200 text-slate-700'}`}>
            {filterCounts.last_3_days}
          </span>
        </button>
      </div>

      {/* 3. Feed List: Master Grouped (WhatsApp-Ready Format) */}
      {masterGroups.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-300 rounded-2xl text-slate-400 text-xs font-mono bg-slate-50/50">
          <Package className="w-6 h-6 mx-auto mb-1 text-slate-300" />
          Is time window me koi stock updates nahi hain.
        </div>
      ) : (
        <div className="space-y-4">
          {masterGroups.map((g) => (
            <div key={g.masterName} className="border-b border-slate-200 pb-3 last:border-b-0">
              <div className="font-bold text-slate-900 text-base leading-tight">
                {g.masterName}
              </div>
              <div className="mt-1 font-mono text-xs text-slate-800 space-y-1">
                {g.lines.map((l) => {
                  const des = state.designs.find((d) => d.id === l.design_id);
                  const sz = state.sizes.find((s) => s.id === l.size_id);
                  return (
                    <div key={l.id} className="py-0.5">
                      <span>{des?.design_number || 'MG-Lot'}</span>
                      <span className="mx-1.5 text-slate-400">=</span>
                      <span>{sz?.code || 'M'}</span>
                      <span className="mx-1.5 text-slate-400">=</span>
                      <span className={l.quantity < 0 ? 'text-red-600 font-bold' : 'font-bold'}>
                        {l.quantity} ps
                      </span>
                      {l.remarks && <span className="text-slate-500 ml-1.5">({l.remarks})</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Total Calculation Footer */}
      <div className="mt-4 p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center text-xs font-mono font-bold shadow-2xs">
        <span>Total Updated Pieces:</span>
        <span className="text-amber-400 text-sm">{totalPieces.toLocaleString()} ps</span>
      </div>
    </div>
  );
}
