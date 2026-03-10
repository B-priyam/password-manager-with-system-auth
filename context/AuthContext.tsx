import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string;
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = "vault_auth_users";
const SESSION_KEY = "vault_auth_session";

async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 600000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getStoredUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!user;

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const users = getStoredUsers();
      const stored = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      if (!stored) {
        toast.error("Invalid email or password");
        return false;
      }

      const hash = await hashPassword(password, stored.salt);
      if (hash !== stored.passwordHash) {
        toast.error("Invalid email or password");
        return false;
      }

      const sessionUser: User = {
        id: stored.id,
        email: stored.email,
        name: stored.name,
      };
      setUser(sessionUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      toast.success("Welcome back!");
      return true;
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      const users = getStoredUsers();
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        toast.error("An account with this email already exists");
        return false;
      }

      const salt = await generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const newUser: StoredUser = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        name,
        passwordHash,
        salt,
      };

      saveStoredUsers([...users, newUser]);
      const sessionUser: User = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      };
      setUser(sessionUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      toast.success("Account created successfully!");
      return true;
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    toast.info("Logged out");
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
