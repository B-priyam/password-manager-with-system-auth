import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Star,
  Trash2,
  Edit,
  Globe,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVault } from "@/context/VaultContext";
import { decrypt } from "@/lib/passwordCrypto";
import { assessPasswordStrength } from "@/lib/passwordCrypto";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PasswordCardProps {
  entry: {
    id: string;
    name: string;
    username: string;
    password: string;
    url: string;
    groupId: string;
    favorite: boolean;
    updatedAt: string;
  };
  onEdit: (id: string) => void;
  index: number;
}

export function PasswordCard({ entry, onEdit, index }: PasswordCardProps) {
  const {
    masterPassword,
    updateEntry,
    deleteEntry,
    authenticateForReveal,
    biometricEnabled,
  } = useVault();
  const [revealed, setRevealed] = useState(false);
  const [plainPassword, setPlainPassword] = useState("");
  const [revealTimer, setRevealTimer] = useState<NodeJS.Timeout | null>(null);
  const [strength, setStrength] = useState<{
    score: number;
    label: string;
    color: string;
  } | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    return () => {
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [revealTimer]);

  const handleReveal = async () => {
    if (!masterPassword) return;
    if (revealed) {
      setRevealed(false);
      setPlainPassword("");
      if (revealTimer) clearTimeout(revealTimer);
      return;
    }

    // Require biometric authentication before revealing
    if (biometricEnabled) {
      setAuthenticating(true);
      try {
        const authorized = await authenticateForReveal();
        if (!authorized) {
          toast.error("Biometric authentication required to reveal password");
          setAuthenticating(false);
          return;
        }
      } catch {
        toast.error("Authentication failed");
        setAuthenticating(false);
        return;
      }
      setAuthenticating(false);
    }

    try {
      const pwd = await decrypt(entry.password, masterPassword);
      setPlainPassword(pwd);
      setStrength(assessPasswordStrength(pwd));
      setRevealed(true);

      // Auto-hide after 15 seconds
      const timer = setTimeout(() => {
        setRevealed(false);
        setPlainPassword("");
      }, 15000);
      setRevealTimer(timer);
    } catch {
      toast.error("Failed to decrypt password");
    }
  };

  const handleCopy = async () => {
    if (!masterPassword) return;

    // Require biometric authentication before copying
    if (biometricEnabled) {
      try {
        const authorized = await authenticateForReveal();
        if (!authorized) {
          toast.error("Biometric authentication required");
          return;
        }
      } catch {
        toast.error("Authentication failed");
        return;
      }
    }

    try {
      const pwd = revealed
        ? plainPassword
        : await decrypt(entry.password, masterPassword);
      await navigator.clipboard.writeText(pwd);
      toast.success("Copied to clipboard");

      // Auto-clear clipboard after 30 seconds
      setTimeout(() => {
        navigator.clipboard.writeText("").catch(() => {});
      }, 30000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleToggleFavorite = async () => {
    await updateEntry(entry.id, { favorite: !entry.favorite });
  };

  const handleDelete = async () => {
    await deleteEntry(entry.id);
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url.startsWith("http") ? url : `https://${url}`)
        .hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const favicon = entry.url ? getFaviconUrl(entry.url) : null;

  const strengthColors: Record<string, string> = {
    destructive: "bg-destructive",
    warning: "bg-warning",
    success: "bg-success",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="group bg-card border border-border rounded-xl p-3 md:p-4 shadow-card hover:shadow-elevated transition-all duration-200"
    >
      {/* Desktop layout */}
      <div className="hidden md:flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {favicon ? (
            <img
              src={favicon}
              alt=""
              className="w-5 h-5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (
                  e.target as HTMLImageElement
                ).nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <Globe
            className={cn("w-5 h-5 text-muted-foreground", favicon && "hidden")}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{entry.name}</h3>
            <button
              onClick={handleToggleFavorite}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Star
                className={cn(
                  "w-3.5 h-3.5",
                  entry.favorite
                    ? "fill-warning text-warning"
                    : "text-muted-foreground",
                )}
              />
            </button>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {entry.username}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
              {revealed ? plainPassword : "••••••••••••"}
            </code>
            {revealed && strength && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full text-primary-foreground",
                  strengthColors[strength.color],
                )}
              >
                {strength.label}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReveal}
            disabled={authenticating}
          >
            {authenticating ? (
              <Fingerprint className="w-3.5 h-3.5 animate-pulse text-primary" />
            ) : revealed ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          {entry.url && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a
                href={
                  entry.url.startsWith("http")
                    ? entry.url
                    : `https://${entry.url}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(entry.id)}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {favicon ? (
              <img
                src={favicon}
                alt=""
                className="w-4 h-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (
                    e.target as HTMLImageElement
                  ).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <Globe
              className={cn(
                "w-4 h-4 text-muted-foreground",
                favicon && "hidden",
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm truncate">{entry.name}</h3>
              <button onClick={handleToggleFavorite}>
                <Star
                  className={cn(
                    "w-3.5 h-3.5",
                    entry.favorite
                      ? "fill-warning text-warning"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            </div>
            {entry.username && (
              <p className="text-xs text-muted-foreground truncate">
                {entry.username}
              </p>
            )}
          </div>
        </div>

        {/* Password row */}
        <div className="flex flex-col gap-1">
          <code className="text-xs font-mono bg-muted px-2 py-2 rounded w-full break-all">
            {revealed ? plainPassword : "••••••••••••"}
          </code>
          {revealed && strength && (
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full text-primary-foreground self-start",
                strengthColors[strength.color],
              )}
            >
              {strength.label}
            </span>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-0.5 -mx-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReveal}
            disabled={authenticating}
          >
            {authenticating ? (
              <Fingerprint className="w-4 h-4 animate-pulse text-primary" />
            ) : revealed ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4" />
          </Button>
          {entry.url && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a
                href={
                  entry.url.startsWith("http")
                    ? entry.url
                    : `https://${entry.url}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(entry.id)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
