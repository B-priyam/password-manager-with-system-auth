import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Shield, Key, FolderOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVault } from "@/context/VaultContext";
import { VaultSidebar } from "./VaultSidebar";
import { PasswordCard } from "./PasswordCard";
import { AddPasswordDialog } from "./AddPasswordDialog";

export function VaultDashboard() {
  const { vaultData, selectedGroupId, searchQuery } = useVault();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);

  const entries = vaultData?.entries || [];

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Filter by group
    if (selectedGroupId === "__favorites") {
      result = result.filter((e) => e.favorite);
    } else if (selectedGroupId === "__recent") {
      result = result
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 20);
    } else if (selectedGroupId) {
      result = result.filter((e) => e.groupId === selectedGroupId);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          e.url.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [entries, selectedGroupId, searchQuery]);

  const handleEdit = (id: string) => {
    setEditEntryId(id);
    setShowAddDialog(true);
  };

  const getTitle = () => {
    if (selectedGroupId === "__favorites") return "Favorites";
    if (selectedGroupId === "__recent") return "Recently Added";
    if (selectedGroupId) {
      const group = vaultData?.groups.find((g) => g.id === selectedGroupId);
      return group?.name || "Passwords";
    }
    return "All Passwords";
  };

  return (
    <div className="flex h-screen bg-background">
      <VaultSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm">
          <div>
            <h1 className="text-lg font-semibold">{getTitle()}</h1>
            <p className="text-xs text-muted-foreground">
              {filteredEntries.length} entries
            </p>
          </div>
          <Button
            onClick={() => {
              setEditEntryId(null);
              setShowAddDialog(true);
            }}
            className="vault-gradient text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Password
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {filteredEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                {searchQuery ? (
                  <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Key className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-lg font-semibold mb-1">
                {searchQuery ? "No results found" : "No passwords yet"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : "Add your first password to get started"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="vault-gradient text-primary-foreground gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Password
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-2 max-w-3xl">
              {filteredEntries.map((entry, i) => (
                <PasswordCard
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEdit}
                  index={i}
                />
              ))}
            </div>
          )}
        </main>

        {/* Stats Bar */}
        {entries.length > 0 && (
          <div className="h-10 border-t border-border flex items-center gap-6 px-6 bg-card/50 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              AES-256 Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              {entries.length} passwords stored
            </span>
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              {vaultData?.groups.length || 0} groups
            </span>
          </div>
        )}
      </div>

      <AddPasswordDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        editEntryId={editEntryId}
      />
    </div>
  );
}
