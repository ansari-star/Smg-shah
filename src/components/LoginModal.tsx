import React, { useState } from 'react';
import { Lock, Phone, KeyRound, ShieldAlert, CheckCircle2, Building2 } from 'lucide-react';
import { AuthState, saveAuthState } from '../lib/auth';

interface LoginModalProps {
  authState: AuthState;
  onLoginSuccess: (user: any) => void;
}

export default function LoginModal({ authState, onLoginSuccess }: LoginModalProps) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Forgot password PIN flow
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMobile = mobile.trim();
    const cleanPass = password.trim();

    // 1. Check Owner
    if (
      cleanMobile === authState.owner_profile.mobile &&
      cleanPass === authState.owner_profile.password
    ) {
      const ownerUser = {
        id: 'usr-owner',
        name: 'Factory Owner',
        mobile: authState.owner_profile.mobile,
        password: authState.owner_profile.password,
        role: 'OWNER' as const,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      onLoginSuccess(ownerUser);
      return;
    }

    // 2. Check Manager/Master Users
    const foundUser = authState.users.find(
      (u) => u.mobile.trim() === cleanMobile && u.password === cleanPass
    );

    if (foundUser) {
      if (!foundUser.is_active) {
        setError('Aapka account Inactive/Band hai. Kripya Factory Owner se sampark karein.');
        return;
      }
      onLoginSuccess(foundUser);
      return;
    }

    setError('Galat Mobile Number ya Password. Kripya dobara check karein.');
  };

  const handleResetPasswordWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPinSuccess(null);

    if (pin.trim() !== authState.owner_profile.reset_pin) {
      setError('Galat 6-Digit PIN! Reset access denied.');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      setError('Naya password kam se kam 6 akshar ka hona chahiye.');
      return;
    }

    // Reset Owner Password
    const updated = { ...authState };
    updated.owner_profile.password = newPassword.trim();
    saveAuthState(updated);

    setPinSuccess('Password safaltapoorvak reset ho gaya! Ab naye password se login karein.');
    setTimeout(() => {
      setIsForgotOpen(false);
      setPin('');
      setNewPassword('');
      setPinSuccess(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">MOHD GARMENT</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Staff &amp; Master Authentication</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {pinSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{pinSuccess}</span>
          </div>
        )}

        {!isForgotOpen ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Mobile Number
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs font-mono font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs font-mono font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md uppercase tracking-wider cursor-pointer active:scale-98 transition"
            >
              Sign In
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsForgotOpen(true);
                }}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Owner Forgot Password? (Use 6-Digit PIN)
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPasswordWithPin} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed font-medium">
              Owner security PIN dalein jo pehle Setting me set kiya gaya tha (Default: <code>225200</code>).
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" /> 6-Digit Security PIN *
              </label>
              <input
                type="password"
                maxLength={6}
                required
                placeholder="Enter 6-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full p-2.5 border border-amber-300 rounded-xl text-center text-sm font-mono tracking-widest font-black bg-amber-50/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Naya Password Banayein *
              </label>
              <input
                type="text"
                required
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="w-1/2 py-2.5 border rounded-xl text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
              >
                Wapas Login
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer"
              >
                Reset Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
