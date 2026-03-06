// Local encrypted vault store
// In production, this would sync to a backend. For now, localStorage with encryption.

import { encrypt, decrypt } from "./passwordCrypto";

export interface PasswordEntry {
  id: string;
  name: string;
  username: string;
  password: string; // encrypted
  url: string;
  notes: string;
  groupId: string;
  tags: string[];
  customFields: { key: string; value: string }[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
}

export interface VaultGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
}

export interface VaultData {
  entries: PasswordEntry[];
  groups: VaultGroup[];
}

const VAULT_KEY = "vault_encrypted_data";
const HASH_KEY = "vault_master_hash";
const SETUP_KEY = "vault_is_setup";

export function isVaultSetup(): boolean {
  return localStorage.getItem(SETUP_KEY) === "true";
}

export function getMasterHash(): string | null {
  return localStorage.getItem(HASH_KEY);
}

export function setMasterHash(hash: string): void {
  localStorage.setItem(HASH_KEY, hash);
  localStorage.setItem(SETUP_KEY, "true");
}

export async function saveVault(
  data: VaultData,
  masterPassword: string,
): Promise<void> {
  const json = JSON.stringify(data);
  const encrypted = await encrypt(json, masterPassword);
  localStorage.setItem(VAULT_KEY, encrypted);
}

export async function loadVault(masterPassword: string): Promise<VaultData> {
  const encrypted = localStorage.getItem(VAULT_KEY);
  if (!encrypted) {
    return { entries: [], groups: getDefaultGroups() };
  }

  const json = await decrypt(encrypted, masterPassword);
  return JSON.parse(json);
}

export function getDefaultGroups(): VaultGroup[] {
  return [
    {
      id: "personal",
      name: "Personal",
      icon: "User",
      color: "primary",
      order: 0,
    },
    { id: "work", name: "Work", icon: "Briefcase", color: "accent", order: 1 },
    {
      id: "finance",
      name: "Finance",
      icon: "CreditCard",
      color: "success",
      order: 2,
    },
    {
      id: "social",
      name: "Social",
      icon: "Share2",
      color: "warning",
      order: 3,
    },
  ];
}

export async function exportVault(
  data: VaultData,
  masterPassword: string,
): Promise<string> {
  // Decrypt all passwords for export
  const decryptedEntries = await Promise.all(
    data.entries.map(async (entry) => {
      try {
        const pwd = await decrypt(entry.password, masterPassword);
        return { ...entry, password: pwd };
      } catch {
        return { ...entry, password: "[decryption failed]" };
      }
    }),
  );

  return JSON.stringify({ ...data, entries: decryptedEntries }, null, 2);
}
