import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Package, Plus, Scissors, FileText, BookOpen, Building2, LogOut, User as UserIcon } from 'lucide-react';
import DashboardPage from './pages/Dashboard/DashboardPage';
import StockPage from './app/stock/page';
import AddStockPage from './app/stock/add/page';
import DesignMasterPage from './app/designs/page';
import BillsPage from './app/bills/page';
import NewBillPage from './app/bills/new/page';
import InvoicePage from './app/bills/[id]/invoice/page';
import StatementPage from './app/statement/page';
import SettingsPage from './app/settings/page';
import LoginModal from './components/LoginModal';
import { 
  getInitialAuthState, 
  saveAuthState, 
  canAccessTab, 
  AuthState, 
  AppUser, 
  UserRole, 
  recordUserActivity, 
  getActiveSessionUser, 
  setActiveSession,
  clearActiveSession 
} from './lib/auth';
import { fetchCloudState } from './lib/storage';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(getInitialAuthState());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getActiveSessionUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');

  // App mount hone par active session check karein aur Supabase cloud data sync karein
  useEffect(() => {
    const user = getActiveSessionUser();
    setCurrentUser(user);

    // Live Supabase sync
    fetchCloudState().catch((err) => console.error('Cloud state fetch error:', err));
  }, []);

  const handleLogout = useCallback(() => {
    clearActiveSession();
    setCurrentUser(null);
    const updated: AuthState = { ...authState, current_user: null };
    setAuthState(updated);
  }, [authState]);

  useEffect(() => {
    const handleAuthSync = () => {
      const freshAuth = getInitialAuthState();
      setAuthState(freshAuth);
      setCurrentUser(freshAuth.current_user);
    };
    window.addEventListener('garment-erp-auth-updated', handleAuthSync);
    return () => window.removeEventListener('garment-erp-auth-updated', handleAuthSync);
  }, []);

  // 30 Minutes Inactivity Listener (Sirf OWNER & MANAGER ke liye, MASTER ke liye no timeout)
  useEffect(() => {
    if (!currentUser) return;
    
    // Master ke liye koi timeout nahi lagega
    if (currentUser.role === 'MASTER') return;

    // Activity check timer jo har 15 second me verify karega
    const intervalTimer = setInterval(() => {
      const activeUser = getActiveSessionUser();
      if (!activeUser) {
        alert('30 minutes se koi activity nahi hui. Suraksha ke liye aap logout ho gaye hain.');
        handleLogout();
      }
    }, 15000);

    // User interactions capture karein aur timestamp refresh karein
    const onUserInteraction = () => {
      recordUserActivity();
    };

    window.addEventListener('mousemove', onUserInteraction, { passive: true });
    window.addEventListener('mousedown', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('scroll', onUserInteraction, { passive: true });

    return () => {
      clearInterval(intervalTimer);
      window.removeEventListener('mousemove', onUserInteraction);
      window.removeEventListener('mousedown', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('scroll', onUserInteraction);
    };
  }, [currentUser, handleLogout]);

  const currentRole: UserRole = currentUser?.role || 'OWNER';

  // If activeTab is no longer accessible with current role, fallback to 'dashboard'
  useEffect(() => {
    if (currentUser && !canAccessTab(activeTab, currentRole)) {
      setActiveTab('dashboard');
    }
  }, [currentUser, currentRole, activeTab]);

  // Login handler
  const handleLoginSuccess = (user: AppUser) => {
    setActiveSession(user);
    setCurrentUser(user);
    const updated: AuthState = { ...authState, current_user: user };
    saveAuthState(updated);
    setAuthState(updated);
    setActiveTab('dashboard');
  };

  const handleViewInvoice = (billId: string) => {
    setSelectedInvoiceId(billId);
    setActiveTab('invoice');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Login Screen Modal if not logged in */}
      {!currentUser && (
        <LoginModal authState={authState} onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Top Header */}
      <header className="bg-white border-b-2 border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-2.5">
            {/* Settings button: Sirf OWNER ke liye visible */}
            {currentRole === 'OWNER' && (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs cursor-pointer transition active:scale-95"
                title="Open Factory Settings"
              >
                <Building2 className="w-5 h-5" />
              </button>
            )}
            
            {/* Title Click -> Goes back to Dashboard */}
            <div 
              onClick={() => setActiveTab('dashboard')} 
              className="cursor-pointer select-none"
              title="Go to Dashboard"
            >
              <span className="text-base font-black tracking-tight text-slate-950 block leading-tight">
                STOCK VIEW
              </span>
              <span className="text-[10px] text-amber-700 font-black tracking-wider uppercase">
                MOHD GARMENT
              </span>
            </div>
          </div>

          {/* User profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentUser.name}</span>
                </div>
                <div className="text-[10px] font-mono font-bold text-amber-700 uppercase">
                  {currentUser.role} ({currentUser.mobile})
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 border border-slate-300 hover:border-red-300 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}

        </div>
      </header>

      {/* Navigation Sub-Tabs filtered by Role */}
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-40 print:hidden overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 flex gap-2 py-2">
          {canAccessTab('dashboard', currentRole) && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" /> Dashboard
            </button>
          )}

          {canAccessTab('stock', currentRole) && (
            <button
              onClick={() => setActiveTab('stock')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'stock' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" /> STOCK VIEW
            </button>
          )}

          {canAccessTab('add_stock', currentRole) && (
            <button
              onClick={() => setActiveTab('add_stock')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'add_stock' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Add Stock
            </button>
          )}

          {canAccessTab('designs', currentRole) && (
            <button
              onClick={() => setActiveTab('designs')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'designs' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Scissors className="w-4 h-4 text-purple-300" /> Design Catalog
            </button>
          )}

          {canAccessTab('bills', currentRole) && (
            <button
              onClick={() => setActiveTab('bills')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'bills' || activeTab === 'invoice' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-300" /> Factory Bills
            </button>
          )}

          {canAccessTab('new_bill', currentRole) && (
            <button
              onClick={() => setActiveTab('new_bill')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'new_bill' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> New Bill
            </button>
          )}

          {canAccessTab('statement', currentRole) && (
            <button
              onClick={() => setActiveTab('statement')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'statement' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-300" /> Statement
            </button>
          )}
        </div>
      </nav>

      {/* Body Content */}
      <main className="flex-1 py-4">
        {activeTab === 'dashboard' && canAccessTab('dashboard', currentRole) && (
          <DashboardPage
            onNavigateAddStock={() => setActiveTab('add_stock')}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'stock' && canAccessTab('stock', currentRole) && (
          <StockPage
            onNavigateAddStock={() => setActiveTab('add_stock')}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'add_stock' && canAccessTab('add_stock', currentRole) && (
          <AddStockPage onBackToStock={() => setActiveTab('stock')} />
        )}
        {activeTab === 'designs' && canAccessTab('designs', currentRole) && (
          <DesignMasterPage currentUser={currentUser} />
        )}
        {activeTab === 'bills' && canAccessTab('bills', currentRole) && (
          <BillsPage
            onNavigateNewBill={() => setActiveTab('new_bill')}
            onViewInvoice={handleViewInvoice}
          />
        )}
        {activeTab === 'new_bill' && canAccessTab('new_bill', currentRole) && (
          <NewBillPage
            onBackToBills={() => setActiveTab('bills')}
            onViewInvoice={handleViewInvoice}
          />
        )}
        {activeTab === 'invoice' && canAccessTab('bills', currentRole) && (
          <InvoicePage
            billId={selectedInvoiceId}
            onBack={() => setActiveTab('bills')}
          />
        )}
        {activeTab === 'statement' && canAccessTab('statement', currentRole) && (
          <StatementPage
            userRole={currentRole.toLowerCase() as any}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'settings' && currentRole === 'OWNER' && (
          <SettingsPage
            authState={authState}
            onAuthUpdate={setAuthState}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}
      </main>
    </div>
  );
}
