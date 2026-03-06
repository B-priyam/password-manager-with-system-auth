"use client";

import { useVault } from "@/context/VaultContext";
import { LockScreen } from "@/components/vault/LockScreen";
import { VaultDashboard } from "@/components/vault/VaultDashboard";

const Index = () => {
  const { isLocked } = useVault();

  return isLocked ? <LockScreen /> : <VaultDashboard />;
};

export default Index;
