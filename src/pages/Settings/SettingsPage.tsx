import React, { useState } from 'react';
import { Settings, UserPlus, Shield, KeyRound, Trash2, Power, Check, RefreshCw, Calendar } from 'lucide-react';
import { AuthState, saveAuthState, AppUser, UserRole } from '../../lib/auth';
import { getLocalState, saveLocalState, resetEntireAppDatabase } from '../../lib/storage';

interface SettingsPageProps {
  authState: AuthState;
  onAuthUpdate: (nextAuth: AuthState) => void;
  onBackToDashboard?: () => void;
}

const HISAAB_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday (Factory Cycle Anchor)' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function SettingsPage({ authState, onAuthUpdate, onBackToDashboard }: SettingsPageProps) {
  const [state, setState] = useState(getLocalState());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Owner profile states (Password aur PIN hamesha EMPTY rahenge)
  const [ownerMobile, setOwnerMobile] = useState(authState.owner_profile.mobile);
  const [ownerPassword, setOwnerPassword] = useState(''); // Empty rakha gaya hai
  const [ownerResetPin, setOwnerResetPin] = useState(''); // Empty rakha gaya hai

  // New staff form (Bina unnecessary master selection dropdown ke)
  const [staffName, setStaffName] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('MASTER');

  // Hisaab day setting
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    return typeof state.settings?.hisaab_day === 'number'
      ? state.settings.hisaab_day
      : 1;
  });

  // 1. Save Owner Credentials
  const handleSaveOwnerSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Agar naya PIN dala hai to 6 digits ka hi hona chahiye
    if (ownerResetPin.trim() && ownerResetPin.trim().length !== 6) {
      alert('Security Reset PIN pure 6 digits ka hona chahiye!');
      return;
    }

    const nextAuth: AuthState = {
      ...authState,
      owner_profile: {
        mobile: ownerMobile.trim() || authState.owner_profile.mobile,
        // Agar naya password type kiya hai to update karein, warna purana hi barkarar rahe
        password: ownerPassword.trim() ? ownerPassword.trim() : authState.owner_profile.password,
        // Agar naya PIN type kiya hai to update karein, warna purana hi barkarar rahe
        reset_pin: ownerResetPin.trim() ? ownerResetPin.trim() : authState.owner_profile.reset_pin,
      },
    };

    saveAuthState(nextAuth);
    onAuthUpdate(nextAuth);

    // Save hone ke baad fields ko wapas khali kar dein
    setOwnerPassword('');
    setOwnerResetPin('');

    setFeedback('Owner profile credentials safaltapoorvak update ho gaye!');
    setTimeout(() => setFeedback(null), 3000);
  };

  // 2. Add New Staff (Master ya Manager)
  const handleAddStaffUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = staffMobile.trim();
    const cleanName = staffName.trim();
    const cleanPass = staffPassword.trim();

    if (!cleanMobile || !cleanPass || !cleanName) {
      alert('Kripya sabhi fields bhariye.');
      return;
    }

    if (
      cleanMobile === authState.owner_profile.mobile ||
      authState.users.some((u) => u.mobile === cleanMobile)
    ) {
      alert('Yeh mobile number pehle se registered hai!');
      return;
    }

    const now = new Date().toISOString();
    const currentState = getLocalState();
    let masterSectionId: string | undefined = undefined;

    // Agar MASTER role choose kiya hai, toh uske naam se automatically master create karein
    if (staffRole === 'MASTER') {
      masterSectionId = `m-${Date.now()}`;
      currentState.masters.unshift({
        id: masterSectionId,
        name: cleanName,
        created_at: now,
      });
      saveLocalState(currentState);
      setState({ ...currentState });
    }

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      mobile: cleanMobile,
      password: cleanPass,
      role: staffRole,
      master_id: masterSectionId,
      is_active: true,
      created_at: now,
    };

    const nextAuth: AuthState = {
      ...authState,
      users: [newUser, ...authState.users],
    };

    saveAuthState(nextAuth);
    onAuthUpdate(nextAuth);

    setStaffName('');
    setStaffMobile('');
    setStaffPassword('');
    setFeedback(`Naya ${staffRole} "${cleanName}" (${cleanMobile}) safaltapoorvak add ho gaya!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // 3. Toggle Active / Inactive
  const handleToggleActive = (userId: string) => {
    const nextUsers = authState.users.map((u) =>
      u.id === userId ? { ...u, is_active: !u.is_active } : u
    );
    const nextAuth = { ...authState, users: nextUsers };
    saveAuthState(nextAuth);
    onAuthUpdate(nextAuth);
  };

  // 4. Delete Staff User
  const handleDeleteStaff = (userId: string, name: string, masterId?: string) => {
    if (!window.confirm(`Kya aap "${name}" ka account delete karna chahte hain?`)) return;

    // Agar master linked tha to use bhi master list se delete karein
    if (masterId) {
      const currentState = getLocalState();
      currentState.masters = currentState.masters.filter((m: any) => m.id !== masterId);
      currentState.stock_balances = currentState.stock_balances.filter((b: any) => b.master_id !== masterId);
      saveLocalState(currentState);
      setState({ ...currentState });
    }

    const nextUsers = authState.users.filter((u) => u.id !== userId);
    const nextAuth = { ...authState, users: nextUsers };
    saveAuthState(nextAuth);
    onAuthUpdate(nextAuth);
  };

  // 5. Complete Hard Reset Button
  const handleResetEntireData = () => {
    const isConfirmed = window.confirm(
      'Kya aap sach me poora data reset karna chahte hain?\nSare purane Masters, Designs, Bills aur Stocks permanently delete ho jayenge aur app bilkul naya ho jayega.'
    );
    if (!isConfirmed) return;

    const fresh = resetEntireAppDatabase();
    setState(fresh);
    setFeedback('App ka sara purana data reset ho gaya! Ab sab kuch bilkul clean hai.');
    setTimeout(() => setFeedback(null), 3500);
  };

  // 6. Save Factory Hisaab Day Settings
  const handleSaveHisaabDay = (e: React.FormEvent) => {
    e.preventDefault();
    const currentState = getLocalState();
    currentState.settings = {
      ...(currentState.settings || {}),
      hisaab_day: selectedDay,
    };
    saveLocalState(currentState);
    setState({ ...currentState });
    setFeedback('Factory Hisaab Day setting update ho gayi!');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-5 font-sans space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" /> Owner Settings &amp; Staff Access
          </h1>
          <p className="text-xs text-slate-500">Staff login management &amp; Database reset</p>
        </div>

        {/* Hard Reset Button */}
        <button
          type="button"
          onClick={handleResetEntireData}
          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          title="Reset All Masters, Designs & Bills"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset All Data
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. OWNER SECURITY SETTINGS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" /> Owner Login &amp; Security PIN
        </h3>

        <form onSubmit={handleSaveOwnerSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Owner Mobile Number
            </label>
            <input
              type="tel"
              value={ownerMobile}
              onChange={(e) => setOwnerMobile(e.target.value)}
              className="w-full p-2 border rounded-xl text-xs font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Owner Password
            </label>
            <input
              type="text"
              placeholder="Leave empty to keep unchanged"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className="w-full p-2 border rounded-xl text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> 6-Digit Reset PIN
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="••••••"
              value={ownerResetPin}
              onChange={(e) => setOwnerResetPin(e.target.value)}
              className="w-full p-2 border border-amber-300 bg-amber-50/50 rounded-xl text-xs font-mono font-bold tracking-widest text-center"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Save Owner Credentials
            </button>
          </div>
        </form>
      </div>

      {/* 2. ADD NEW MANAGER / MASTER USER (Without extra Master dropdown box) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-600" /> Naya Master / Manager Add Karein
        </h3>

        <form onSubmit={handleAddStaffUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Staff Ka Naam *
            </label>
            <input
              type="text"
              placeholder="e.g. Munsef, Saleem"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full p-2.5 border rounded-xl text-xs font-bold bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Mobile Number (Login ID) *
            </label>
            <input
              type="tel"
              placeholder="10 digit number"
              value={staffMobile}
              onChange={(e) => setStaffMobile(e.target.value)}
              className="w-full p-2.5 border rounded-xl text-xs font-mono font-bold bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Password Assign Karein *
            </label>
            <input
              type="text"
              placeholder="Assign password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="w-full p-2.5 border rounded-xl text-xs font-mono font-bold bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Role Choose Karein *
            </label>
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as UserRole)}
              className="w-full p-2.5 border rounded-xl text-xs font-bold bg-white cursor-pointer"
            >
              <option value="MASTER">MASTER (Sirf apna stock/dashboard)</option>
              <option value="MANAGER">MANAGER (Bina Rate/Clear Hisaab ke)</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm active:scale-98 transition"
            >
              + Create Staff Login
            </button>
          </div>
        </form>
      </div>

      {/* 3. REGISTERED STAFF USERS LIST (Sirf Master aur Manager dikhenge, Owner nahi) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex justify-between items-center">
          <span>
            Staff Members &amp; Logins (
            {authState.users.filter((u) => u.role !== 'OWNER').length}
            )
          </span>
          <span className="text-[11px] text-slate-400 font-normal">Masters &amp; Managers only</span>
        </div>

        <div className="divide-y divide-slate-100">
          {authState.users.filter((u) => u.role !== 'OWNER').length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-mono">
              Koi Master ya Manager add nahi kiya gaya hai. Upar diye gaye form se naya staff add karein.
            </div>
          ) : (
            authState.users
              .filter((u) => u.role !== 'OWNER') // <-- OWNER ko yahan se filter karke hide kar diya
              .map((u) => (
                <div
                  key={u.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{u.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'MANAGER'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {u.role}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive / Blocked'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1 flex gap-4">
                      <span>
                        Mobile: <strong>{u.mobile}</strong>
                      </span>
                      <span>
                        Password: <strong>{u.password}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                        u.is_active
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{u.is_active ? 'Deactivate' : 'Activate'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(u.id, u.name, u.master_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* 4. FACTORY CYCLE & HISAAB DAY SETTINGS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" /> Factory Weekly Hisaab Cycle
        </h3>

        <form onSubmit={handleSaveHisaabDay} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Select Weekly Cycle Cutoff Day
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-full p-2.5 border rounded-xl text-xs font-bold bg-white cursor-pointer"
            >
              {HISAAB_DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Save Cycle Day
          </button>
        </form>
      </div>
    </div>
  );
}
