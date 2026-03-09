import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Shield,
  Key,
  FolderOpen,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useVault } from "@/context/VaultContext";
import { VaultSidebar } from "./VaultSidebar";
import { PasswordCard } from "./PasswordCard";
import { AddPasswordDialog } from "./AddPasswordDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMemo } from "react";

export function VaultDashboard() {
  const { vaultData, selectedGroupId, searchQuery } = useVault();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const entries = vaultData?.entries || [];

  const filteredEntries = useMemo(() => {
    let result = [...entries];

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

  const sidebarContent = (
    <VaultSidebar onNavigate={() => setSidebarOpen(false)} />
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      {!isMobile && sidebarContent}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            )}
            <div>
              <h1 className="text-base md:text-lg font-semibold">
                {getTitle()}
              </h1>
              <p className="text-xs text-muted-foreground">
                {filteredEntries.length} entries
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditEntryId(null);
              setShowAddDialog(true);
            }}
            className="vault-gradient text-primary-foreground gap-2 h-9 md:h-10 text-sm"
            size={isMobile ? "sm" : "default"}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Password</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {filteredEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
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
          <div className="h-10 border-t border-border flex items-center gap-4 md:gap-6 px-4 md:px-6 bg-card/50 text-xs text-muted-foreground overflow-x-auto">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AES-256 Encrypted</span>
              <span className="sm:hidden">Encrypted</span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Key className="w-3.5 h-3.5" />
              {entries.length} passwords
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
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
