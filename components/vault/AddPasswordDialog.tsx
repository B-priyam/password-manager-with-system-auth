import { useState } from "react";
import { Eye, EyeOff, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useVault } from "@/context/VaultContext";
import { generatePassword, assessPasswordStrength } from "@/lib/passwordCrypto";
import { cn } from "@/lib/utils";

interface AddPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEntryId?: string | null;
}

export function AddPasswordDialog({
  open,
  onOpenChange,
  editEntryId,
}: AddPasswordDialogProps) {
  const { vaultData, addEntry, updateEntry, masterPassword } = useVault();
  const editEntry = editEntryId
    ? vaultData?.entries.find((e) => e.id === editEntryId)
    : null;

  const [name, setName] = useState(editEntry?.name || "");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState(editEntry?.notes || "");
  const [groupId, setGroupId] = useState(editEntry?.groupId || "personal");
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  // Generator options
  const [genLength, setGenLength] = useState(20);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);

  const strength = password ? assessPasswordStrength(password) : null;
  const groups = vaultData?.groups || [];

  const strengthColors: Record<string, string> = {
    destructive: "bg-destructive",
    warning: "bg-warning",
    success: "bg-success",
  };

  const handleGenerate = () => {
    const pwd = generatePassword(genLength, {
      uppercase: genUpper,
      lowercase: genLower,
      numbers: genNumbers,
      symbols: genSymbols,
    });
    setPassword(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;

    if (editEntryId) {
      await updateEntry(editEntryId, {
        name,
        notes,
        groupId,
        ...(password ? { plainPassword: password } : {}),
      });
    } else {
      await addEntry({
        name,
        username: "",
        plainPassword: password,
        url: "",
        notes,
        groupId,
        tags: [],
        customFields: [],
        favorite: false,
      });
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setPassword("");
    setNotes("");
    setGroupId("personal");
    setShowPassword(false);
    setShowGenerator(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editEntryId ? "Edit Password" : "Add Password"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google Account"
              autoFocus
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Password *
              </label>
              <button
                type="button"
                onClick={() => setShowGenerator(!showGenerator)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Wand2 className="w-3 h-3" />
                Generator
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  editEntryId ? "Leave empty to keep current" : "Enter password"
                }
                className="pr-20 font-mono"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleGenerate}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Strength Bar */}
            {strength && (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i <= strength.score
                          ? strengthColors[strength.color]
                          : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Generator Panel */}
          {showGenerator && (
            <div className="bg-muted rounded-lg p-3 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Length: {genLength}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerate}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Generate
                </Button>
              </div>
              <Slider
                value={[genLength]}
                onValueChange={([v]) => setGenLength(v)}
                min={8}
                max={64}
                step={1}
              />
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Uppercase (A-Z)",
                    value: genUpper,
                    set: setGenUpper,
                  },
                  {
                    label: "Lowercase (a-z)",
                    value: genLower,
                    set: setGenLower,
                  },
                  {
                    label: "Numbers (0-9)",
                    value: genNumbers,
                    set: setGenNumbers,
                  },
                  {
                    label: "Symbols (!@#)",
                    value: genSymbols,
                    set: setGenSymbols,
                  },
                ].map((opt) => (
                  <label
                    key={opt.label}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Switch
                      checked={opt.value}
                      onCheckedChange={opt.set}
                      className="scale-75"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Group */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Group
            </label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full vault-gradient text-primary-foreground font-semibold"
          >
            {editEntryId ? "Update Password" : "Save Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
