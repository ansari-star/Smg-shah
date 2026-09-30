export type UserRole = 'OWNER' | 'MANAGER' | 'MASTER';

export interface AppUser {
  id: string;
  name: string;
  mobile: string;
  password: string;
  role: UserRole;
  master_id?: string; // Agar MASTER role hai to corresponding master section link
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  current_user: AppUser | null;
  owner_profile: {
    mobile: string;
    password: string;
    reset_pin: string; // 6-digit secret pin
  };
  users: AppUser[];
}

const AUTH_STORAGE_KEY = 'mg_erp_auth_state';

const SESSION_USER_KEY = 'mg_erp_active_session';
const LAST_ACTIVITY_KEY = 'mg_erp_last_activity';
const TIMEOUT_DURATION_MS = 30 * 60 * 1000; // 30 Minutes in milliseconds

// Logout helper
export const clearActiveSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    window.dispatchEvent(new Event('garment-erp-auth-updated'));
  }
};

// Current logged in user fetch karein aur timeout check karein
export const getActiveSessionUser = (): any | null => {
  if (typeof window === 'undefined') return null;

  const rawUser = localStorage.getItem(SESSION_USER_KEY);
  if (!rawUser) return null;

  try {
    const user = JSON.parse(rawUser);

    // Agar MASTER hai to hamesha logged-in rahega (No timeout)
    if (user.role === 'MASTER') {
      return user;
    }

    // Agar OWNER ya MANAGER hai to 30 min inactivity check karein
    if (user.role === 'OWNER' || user.role === 'MANAGER') {
      const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!lastActivityStr) {
        clearActiveSession();
        return null;
      }

      const lastActivityTime = parseInt(lastActivityStr, 10);
      const now = Date.now();

      // Agar 30 minutes se zyada inactive raha to auto logout
      if (now - lastActivityTime > TIMEOUT_DURATION_MS) {
        clearActiveSession();
        return null;
      }

      // Agar active hai to time refresh karein
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      return user;
    }

    return user;
  } catch {
    clearActiveSession();
    return null;
  }
};

// Login par session store karein
export const setActiveSession = (user: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    window.dispatchEvent(new Event('garment-erp-auth-updated'));
  }
};

// User activity hone par time update karein
export const recordUserActivity = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }
};

export const getInitialAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      current_user: null,
      owner_profile: {
        mobile: '9769414077',
        password: 'Ansari@2252',
        reset_pin: '225200',
      },
      users: [],
    };
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  let parsed: any = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fallback
    }
  }

  const defaultOwner = {
    mobile: '9769414077',
    password: 'Ansari@2252',
    reset_pin: '225200',
  };

  const ownerProfile = parsed?.owner_profile || defaultOwner;
  const users = Array.isArray(parsed?.users) ? parsed.users : [];

  // Check active session user with 30-min timeout logic
  const sessionUser = getActiveSessionUser();

  const finalState: AuthState = {
    current_user: sessionUser,
    owner_profile: ownerProfile,
    users: users,
  };

  return finalState;
};

export const canAccessTab = (tab: string, role: UserRole) => {
  if (role === 'OWNER') return true;
  if (role === 'MANAGER') {
    return ['dashboard', 'stock', 'add_stock', 'designs', 'bills', 'new_bill', 'statement'].includes(tab);
  }
  if (role === 'MASTER') {
    return ['dashboard', 'stock', 'add_stock', 'designs'].includes(tab);
  }
  return false;
};

export const saveAuthState = (state: AuthState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    if (state.current_user) {
      setActiveSession(state.current_user);
    } else {
      clearActiveSession();
    }
    window.dispatchEvent(new Event('garment-erp-auth-updated'));
  }
};
