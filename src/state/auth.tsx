import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User, Role } from "../data/types";
import { Storage } from "../data/storage";

type LoginResult = { ok: true; user: User } | { ok: false; message: string };

type SignupArgs = {
  name: string;
  email: string;
  password: string;
  role?: Role;        // typically "employee" or "manager"
  phone?: string;     // optional
};

type SignupResult = { ok: true; user: User } | { ok: false; message: string };

type AuthCtx = {
  user: User | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  signup: (args: SignupArgs) => Promise<SignupResult>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refresh: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

const SESSION_KEY = "tw_current_user_id";

// Your dev admin defaults (matches the login prefill you set)
const DEV_ADMIN = {
  email: "admin@tidalwave.local",
  password: "Admin123!",
  name: "Admin",
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

// Ensure there's an admin to log into (dev convenience).
function ensureDevAdminExists() {
  const users = Storage.getUsers();
  const adminEmail = normalizeEmail(DEV_ADMIN.email);

  const already = users.some((u) => normalizeEmail(u.email) === adminEmail);
  if (already) return;

  const admin: User = {
    id: `u_${Math.random().toString(16).slice(2)}_${Date.now()}`,
    name: DEV_ADMIN.name,
    email: adminEmail,
    password: DEV_ADMIN.password,
    role: "admin",
    status: "active",
    createdAt: nowIso(),
    phone: undefined,
  } as any; // if your User type doesn’t include phone yet, this keeps compile safe

  Storage.saveUsers([admin, ...users]);
}

function loadSessionUser(): User | null {
  try {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    const users = Storage.getUsers();
    return users.find((u) => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Seed admin (dev only behavior, but harmless)
    ensureDevAdminExists();

    // Hydrate session
    const u = loadSessionUser();
    setUser(u);
    setHydrated(true);
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const e = normalizeEmail(email);
    const p = password;

    const users = Storage.getUsers();
    const found = users.find((u) => normalizeEmail(u.email) === e);

    if (!found) return { ok: false, message: "No account found for that email." };
    if (found.password !== p) return { ok: false, message: "Incorrect password." };

    // Prevent login if not active (unless admin)
    if (found.role !== "admin" && found.status !== "active") {
      return { ok: false, message: "Account pending approval by admin." };
    }

    // ✅ This is the critical part: set state + persist
    setUser(found);
    localStorage.setItem(SESSION_KEY, found.id);

    return { ok: true, user: found };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  };

  const refresh = () => {
    // Reload current user from storage and re-set state
    try {
      const userId = localStorage.getItem("tw_current_user_id".replace(/"/g,""));
      if (!userId) {
        setUser(null);
        return;
      }
      const users = Storage.getUsers();
      const next = users.find((u) => u.id === userId) ?? null;
      setUser(next);
    } catch {
      // ignore
    }
  };

  const signup = async (args: SignupArgs): Promise<SignupResult> => {
    const name = args.name.trim();
    const email = normalizeEmail(args.email);
    const password = args.password;
    const role: Role = args.role === "manager" ? "manager" : "employee";

    if (!name) return { ok: false, message: "Name is required." };
    if (!email) return { ok: false, message: "Email is required." };
    if (!password || password.length < 6) return { ok: false, message: "Password must be at least 6 characters." };

    const users = Storage.getUsers();
    if (users.some((u) => normalizeEmail(u.email) === email)) {
      return { ok: false, message: "That email is already registered." };
    }

    const newUser: User = {
      id: `u_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      name,
      email,
      password,
      role,
      status: "pending",
      createdAt: nowIso(),
      phone: (args.phone?.trim() || undefined),
    } as any; // safe if phone not yet in type

    Storage.saveUsers([newUser, ...users]);

    return { ok: true, user: newUser };
  };

  const value = useMemo<AuthCtx>(
    () => ({ user, hydrated, login, logout, signup, setUser, refresh }),
    [user, hydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
