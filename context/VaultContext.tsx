"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  VaultData,
  PasswordEntry,
  VaultGroup,
  isVaultSetup,
  getMasterHash,
  setMasterHash,
  saveVault,
  loadVault,
  getDefaultGroups,
} from "@/lib/vault-store";
import {
  hashMasterPassword,
  verifyMasterPassword,
  encrypt,
} from "@/lib/passwordCrypto";
import {
  isPlatformAuthenticatorAvailable,
  hasStoredCredential,
  registerBiometric,
  authenticateBiometric,
  removeBiometric,
} from "@/lib/webauthn";
import { toast } from "sonner";

const BIOMETRIC_MP_KEY = "vault_biometric_mp";

interface VaultContextType {
  isLocked: boolean;
  isSetup: boolean;
  vaultData: VaultData | null;
  selectedGroupId: string | null;
  searchQuery: string;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  unlock: (masterPassword: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  setup: (masterPassword: string) => Promise<void>;
  lock: () => void;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  authenticateForReveal: () => Promise<boolean>;
  addEntry: (
    entry: Omit<
      PasswordEntry,
      "id" | "createdAt" | "updatedAt" | "password"
    > & { plainPassword: string },
  ) => Promise<void>;
  updateEntry: (
    id: string,
    updates: Partial<Omit<PasswordEntry, "password">> & {
      plainPassword?: string;
    },
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addGroup: (group: Omit<VaultGroup, "id" | "order">) => Promise<void>;
  updateGroup: (id: string, updates: Partial<VaultGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  setSelectedGroupId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  masterPassword: string | null;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [isSetup, setIsSetup] = useState(isVaultSetup());
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [masterPassword, setMasterPasswordState] = useState<string | null>(
    null,
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(
    hasStoredCredential(),
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check biometric availability on mount
  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setBiometricAvailable);
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
    setMasterPasswordState(null);
    setVaultData(null);
    setSearchQuery("");
  }, []);

  // Auto-lock on inactivity
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!isLocked) {
      timeoutRef.current = setTimeout(() => {
        lock();
        toast.info("Vault locked due to inactivity");
      }, INACTIVITY_TIMEOUT);
    }
  }, [isLocked, lock]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  const persistVault = useCallback(async (data: VaultData, mp: string) => {
    setVaultData(data);
    await saveVault(data, mp);
  }, []);

  const unlock = useCallback(async (mp: string): Promise<boolean> => {
    const hash = getMasterHash();
    if (!hash) return false;
    const valid = await verifyMasterPassword(mp, hash);
    if (!valid) return false;

    try {
      const data = await loadVault(mp);
      setVaultData(data);
      setMasterPasswordState(mp);
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    const storedMp = localStorage.getItem(BIOMETRIC_MP_KEY);
    if (!storedMp) return false;

    const authenticated = await authenticateBiometric();
    if (!authenticated) return false;

    // Decode the stored master password and unlock
    try {
      const mp = atob(storedMp);
      return await unlock(mp);
    } catch {
      return false;
    }
  }, [unlock]);

  const setup = useCallback(async (mp: string) => {
    const hash = await hashMasterPassword(mp);
    setMasterHash(hash);
    const data: VaultData = { entries: [], groups: getDefaultGroups() };
    await saveVault(data, mp);
    setVaultData(data);
    setMasterPasswordState(mp);
    setIsLocked(false);
    setIsSetup(true);
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!masterPassword) return false;
    const success = await registerBiometric("vault-user");
    if (success) {
      // Store master password encoded for biometric unlock
      // Note: In production, use a more secure storage mechanism
      localStorage.setItem(BIOMETRIC_MP_KEY, btoa(masterPassword));
      setBiometricEnabled(true);
      toast.success("Biometric authentication enabled!");
      return true;
    }
    toast.error("Failed to enable biometric authentication");
    return false;
  }, [masterPassword]);

  const disableBiometric = useCallback(() => {
    removeBiometric();
    localStorage.removeItem(BIOMETRIC_MP_KEY);
    setBiometricEnabled(false);
    toast.success("Biometric authentication disabled");
  }, []);

  const authenticateForReveal = useCallback(async (): Promise<boolean> => {
    if (biometricEnabled) {
      const success = await authenticateBiometric();
      return success;
    }
    // If biometric not enabled, allow reveal (already authenticated with master password)
    return true;
  }, [biometricEnabled]);

  const addEntry = useCallback(
    async (
      entry: Omit<
        PasswordEntry,
        "id" | "createdAt" | "updatedAt" | "password"
      > & { plainPassword: string },
    ) => {
      if (!vaultData || !masterPassword) return;
      const encryptedPwd = await encrypt(entry.plainPassword, masterPassword);
      const now = new Date().toISOString();
      const newEntry: PasswordEntry = {
        ...entry,
        id: crypto.randomUUID(),
        password: encryptedPwd,
        createdAt: now,
        updatedAt: now,
      };
      const { plainPassword: _, ...rest } = entry;
      void rest;
      const newData = {
        ...vaultData,
        entries: [...vaultData.entries, newEntry],
      };
      await persistVault(newData, masterPassword);
      toast.success("Password saved securely");
    },
    [vaultData, masterPassword, persistVault],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      updates: Partial<Omit<PasswordEntry, "password">> & {
        plainPassword?: string;
      },
    ) => {
      if (!vaultData || !masterPassword) return;
      const entries = await Promise.all(
        vaultData.entries.map(async (e) => {
          if (e.id !== id) return e;
          let password = e.password;
          if (updates.plainPassword) {
            password = await encrypt(updates.plainPassword, masterPassword);
          }
          const { plainPassword: _, ...rest } = updates;
          void rest;
          return {
            ...e,
            ...rest,
            password,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
      await persistVault({ ...vaultData, entries }, masterPassword);
      toast.success("Entry updated");
    },
    [vaultData, masterPassword, persistVault],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!vaultData || !masterPassword) return;
      const entries = vaultData.entries.filter((e) => e.id !== id);
      await persistVault({ ...vaultData, entries }, masterPassword);
      toast.success("Entry deleted");
    },
    [vaultData, masterPassword, persistVault],
  );

  const addGroup = useCallback(
    async (group: Omit<VaultGroup, "id" | "order">) => {
      if (!vaultData || !masterPassword) return;
      const newGroup: VaultGroup = {
        ...group,
        id: crypto.randomUUID(),
        order: vaultData.groups.length,
      };
      await persistVault(
        { ...vaultData, groups: [...vaultData.groups, newGroup] },
        masterPassword,
      );
      toast.success("Group created");
    },
    [vaultData, masterPassword, persistVault],
  );

  const updateGroup = useCallback(
    async (id: string, updates: Partial<VaultGroup>) => {
      if (!vaultData || !masterPassword) return;
      const groups = vaultData.groups.map((g) =>
        g.id === id ? { ...g, ...updates } : g,
      );
      await persistVault({ ...vaultData, groups }, masterPassword);
    },
    [vaultData, masterPassword, persistVault],
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      if (!vaultData || !masterPassword) return;
      const groups = vaultData.groups.filter((g) => g.id !== id);
      const entries = vaultData.entries.map((e) =>
        e.id === id ? { ...e, groupId: "personal" } : e,
      );
      await persistVault({ ...vaultData, groups, entries }, masterPassword);
      if (selectedGroupId === id) setSelectedGroupId(null);
      toast.success("Group deleted");
    },
    [vaultData, masterPassword, persistVault, selectedGroupId],
  );

  return (
    <VaultContext.Provider
      value={{
        isLocked,
        isSetup,
        vaultData,
        selectedGroupId,
        searchQuery,
        masterPassword,
        biometricAvailable,
        biometricEnabled,
        unlock,
        unlockWithBiometric,
        setup,
        lock,
        enableBiometric,
        disableBiometric,
        authenticateForReveal,
        addEntry,
        updateEntry,
        deleteEntry,
        addGroup,
        updateGroup,
        deleteGroup,
        setSelectedGroupId,
        setSearchQuery,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
