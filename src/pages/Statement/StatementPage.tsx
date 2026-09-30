import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { getLocalState, saveLocalState, sortDescending, fetchCloudState } from '../../lib/storage';
import { AppUser } from '../../lib/auth';

interface StatementPageProps {
  userRole?: 'owner' | 'manager' | 'master';
  currentUser?: AppUser | null;
}

export default function StatementPage({ userRole = 'owner', currentUser }: StatementPageProps) {
  const [state, setState] = useState(getLocalState());
  
  // Date Input Refs for direct Calendar Click
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  // Date Filter States
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Clear Hisaab Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCloudState().then((latestState) => {
      setState(latestState);
    });

    const handleStorageUpdate = () => setState(getLocalState());
    window.addEventListener('garment-erp-storage-updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('garment-erp-storage-updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Determine effective role
  const effectiveRole = currentUser ? currentUser.role : (userRole.toUpperCase() as 'OWNER' | 'MANAGER' | 'MASTER');
  const isOwner = effectiveRole === 'OWNER';

  // Factory Settings se hisaab_day prapt karein (Default: 1 = Monday)
  const hisaabAnchorDay = typeof state.settings?.hisaab_day === 'number' ? state.settings.hisaab_day : 1;
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const startDayName = DAY_NAMES[(hisaabAnchorDay + 1) % 7];
  const endDayName = DAY_NAMES[hisaabAnchorDay];

  // 1. Weekly Cutoff Button Function (e.g. Tuesday se Monday tak)
  const handleApplyWeeklyCycle = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 to 6

    // Target end date (Current/Last Anchor Day, e.g., Monday)
    const diffToEnd = (currentDay < hisaabAnchorDay) 
      ? (currentDay + 7 - hisaabAnchorDay) 
      : (currentDay - hisaabAnchorDay);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() - diffToEnd);

    // Start Date: 6 din pehle ka din (e.g., Tuesday)
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    setFromDate(formatDate(startDate));
    setToDate(formatDate(endDate));
  };

  const handleResetDates = () => {
    setFromDate('');
    setToDate('');
  };

  // Filtered Bills based on Date to Date Selection
  const filteredBills = useMemo(() => {
    let list = sortDescending(state.bills || []);

    if (fromDate) {
      list = list.filter((b) => b.bill_date >= fromDate);
    }
    if (toDate) {
      list = list.filter((b) => b.bill_date <= toDate);
    }

    return list;
  }, [state.bills, fromDate, toDate]);

  // KPI calculations
  const totalPieces = useMemo(() => {
    return filteredBills.reduce((acc, curr) => acc + curr.total_pieces, 0);
  }, [filteredBills]);

  const totalAmount = useMemo(() => {
    return filteredBills.reduce((acc, curr) => acc + curr.total_amount, 0);
  }, [filteredBills]);

  // Clear Hisaab button click handler
  const handleClearHisaab = () => {
    if (!isOwner) {
      setFeedbackMsg({ type: 'error', text: 'Access Denied: Sirf Factory Owner hisaab clear kar sakte hain.' });
      return;
    }
    setShowConfirmModal(true);
  };

  // 3. Clear Hisaab: Completely Delete Filtered Bills Permanently
  const handlePermanentClearHisaab = () => {
    if (!isOwner) {
      setFeedbackMsg({ type: 'error', text: 'Access Denied: Sirf Factory Owner hisaab clear kar sakte hain.' });
      setShowConfirmModal(false);
      return;
    }

    if (filteredBills.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'Clear karne ke liye koi bill maujood nahi hai.' });
      setShowConfirmModal(false);
      return;
    }

    const currentState = getLocalState();
    const billIdsToDelete = new Set(filteredBills.map((b) => b.id));

    // Permanently remove matching bills from memory and storage
    currentState.bills = (currentState.bills || []).filter((b) => !billIdsToDelete.has(b.id));

    saveLocalState(currentState);
    setState(currentState);
    setShowConfirmModal(false);

    setFeedbackMsg({
      type: 'success',
      text: `Hisaab Safaltapoorvak Clear! ${billIdsToDelete.size} bills ko permanently delete kar diya gaya hai (No recovery).`,
    });

    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" /> Statement &amp; Hisaab Settlement
          </h1>
          <p className="text-xs text-slate-500">Date-to-date statements &bull; Weekly cutoff reconciliation</p>
        </div>

        {/* Manager poora statement dekh sakega, lekin "Clear Hisaab" button sirf OWNER ke liye active hoga */}
        {effectiveRole === 'OWNER' && (
          <div>
            <button
              type="button"
              onClick={handleClearHisaab}
              disabled={filteredBills.length === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Hisaab</span>
            </button>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div
          className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 font-bold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Date Filter & Weekly Anchor Cutoff Selector Bar */}
      <div className="mt-4 p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* 1. Date to Date Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* From Date */}
            <div className="flex items-center">
              <span className="text-xs font-bold text-slate-500 mr-2">From:</span>
              <div className="relative flex items-center">
                <input
                  ref={fromDateRef}
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-l-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      fromDateRef.current?.showPicker?.();
                    } catch {
                      fromDateRef.current?.focus();
                    }
                  }}
                  className="p-2 border border-l-0 border-slate-300 rounded-r-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  title="Open Calendar"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-700" />
                </button>
              </div>
            </div>

            {/* To Date */}
            <div className="flex items-center">
              <span className="text-xs font-bold text-slate-500 mx-2">To:</span>
              <div className="relative flex items-center">
                <input
                  ref={toDateRef}
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-l-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      toDateRef.current?.showPicker?.();
                    } catch {
                      toDateRef.current?.focus();
                    }
                  }}
                  className="p-2 border border-l-0 border-slate-300 rounded-r-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  title="Open Calendar"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-700" />
                </button>
              </div>
            </div>

            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={handleResetDates}
                className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Reset Date Range"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Weekly Day Cycle Button (Tuesday se Monday Rule) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyWeeklyCycle}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Weekly Hisaab (Last {startDayName} &rarr; {endDayName})</span>
            </button>
          </div>
        </div>

        {/* Selected Window Summary */}
        <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-2 border-t border-slate-100">
          <span>
            Current Range: {fromDate || 'Start'} &rarr; {toDate || 'Till Date'}
          </span>
          <span className="font-bold text-slate-800">
            {filteredBills.length} Bills Shamil Hain
          </span>
        </div>
      </div>

      {/* KPI Cards: Filtered Range Ka Total Kaam */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 font-mono">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Total Statement Pieces
          </span>
          <div className="text-2xl font-black text-slate-900">
            {totalPieces.toLocaleString()} ps
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Total Statement Amount
          </span>
          <div className="text-2xl font-black text-amber-400">
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Statement Ledger Table */}
      <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
        <table className="w-full text-xs text-left font-mono">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3">Bill Date</th>
              <th className="p-3">Bill No</th>
              <th className="p-3">Party</th>
              <th className="p-3 text-right">Pieces</th>
              <th className="p-3 text-right">Amount (₹)</th>
              <th className="p-3">Transfer / Lot Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Is date range me koi bill nahi mila.
                </td>
              </tr>
            ) : (
              filteredBills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="p-3">{b.bill_date}</td>
                  <td className="p-3 font-bold text-slate-900">C{b.cycle}-{b.bill_number}</td>
                  <td className="p-3 font-bold">{b.customer_name}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{b.total_pieces} ps</td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    ₹{b.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-slate-500">{b.remarks || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Modal: Permanent Clear Hisaab Double Confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl border border-red-200">
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-base text-slate-900">Clear Hisaab - Permanent Deletion</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Kya aap sach me statement me dikh rahe in <strong>{filteredBills.length} bills</strong> ko poori tarah delete karna chahte hain?
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 font-mono text-rose-900">
              <div className="flex justify-between">
                <span>Total Bills:</span>
                <strong>{filteredBills.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Pieces:</span>
                <strong>{totalPieces.toLocaleString()} ps</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <strong>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            <p className="text-[11px] text-red-600 font-bold">
              Warning: Ye action irreversible hai. Yeh bills factory database se hamesha ke liye mit jayenge.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentClearHisaab}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Yes, Clear Hisaab Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
