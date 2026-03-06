import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, Eye, EyeOff, KeyRound, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/context/VaultContext";
import { toast } from "sonner";

export function LockScreen() {
  const {
    isSetup,
    unlock,
    setup,
    biometricAvailable,
    biometricEnabled,
    unlockWithBiometric,
  } = useVault();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (attempts >= 5) {
      toast.error("Too many failed attempts. Please wait.");
      return;
    }

    setLoading(true);

    try {
      if (isSetup) {
        const success = await unlock(password);
        if (success) {
          setAttempts(0);
        } else {
          setAttempts((a) => a + 1);
          toast.error(
            `Invalid master password. ${5 - attempts - 1} attempts remaining.`,
          );
        }
      } else {
        if (password.length < 12) {
          toast.error("Master password must be at least 12 characters");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }
        await setup(password);
        toast.success("Vault created successfully!");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const success = await unlockWithBiometric();
      if (!success) {
        toast.error("Biometric authentication failed");
      }
    } catch {
      toast.error("Biometric authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl vault-gradient vault-glow mb-6"
          >
            <Shield className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isSetup ? "Unlock Vault" : "Create Your Vault"}
          </h1>
          <p className="text-muted-foreground">
            {isSetup
              ? "Enter your master password to access your passwords"
              : "Set up a master password to protect your vault"}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl shadow-elevated p-6 border border-border"
        >
          {/* Biometric unlock button */}
          {isSetup && biometricAvailable && biometricEnabled && (
            <div className="mb-5">
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 gap-3 text-base font-medium border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={handleBiometricUnlock}
                disabled={loading}
              >
                <Fingerprint className="w-6 h-6 text-primary" />
                Unlock with Biometrics
              </Button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  or use master password
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                Master Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter master password"
                  className="pr-10 font-mono"
                  autoFocus={!(isSetup && biometricEnabled)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isSetup && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm master password"
                  className="font-mono"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full vault-gradient text-primary-foreground font-semibold h-11"
              disabled={loading || !password}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Lock className="w-4 h-4" />
                </motion.div>
              ) : isSetup ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Unlock
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Create Vault
                </>
              )}
            </Button>
          </form>

          {!isSetup && (
            <div className="mt-4 p-3 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Security Notes:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Use at least 12 characters</li>
                <li>Mix uppercase, lowercase, numbers & symbols</li>
                <li>Your master password cannot be recovered</li>
                <li>All data is encrypted locally with AES-256</li>
              </ul>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
