import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  FolderOpen,
  Star,
  Clock,
  Search,
  User,
  Briefcase,
  CreditCard,
  Share2,
  Folder,
  Settings,
  LogOut,
  Fingerprint,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeftCircle,
  ChevronRightCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/context/VaultContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Briefcase,
  CreditCard,
  Share2,
  Folder,
  Settings,
};

const DEFAULT_GROUP_IDS = ["personal", "work", "finance", "social"];

export function VaultSidebar() {
  const {
    vaultData,
    selectedGroupId,
    setSelectedGroupId,
    searchQuery,
    setSearchQuery,
    lock,
    addGroup,
    updateGroup,
    deleteGroup,
    biometricAvailable,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
  } = useVault();
  const [newGroupName, setNewGroupName] = useState("");
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const groups = vaultData?.groups || [];
  const entries = vaultData?.entries || [];

  const allCount = entries.length;
  const favCount = entries.filter((e) => e.favorite).length;

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    await addGroup({ name: newGroupName, icon: "Folder", color: "primary" });
    setNewGroupName("");
    setShowAddGroup(false);
  };

  const handleRenameGroup = async () => {
    if (!editingGroup || !editingGroup.name.trim()) return;
    await updateGroup(editingGroup.id, { name: editingGroup.name });
    setShowEditGroup(false);
    setEditingGroup(null);
  };

  return (
    <div
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-14" : "w-64",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border relative">
        <div
          className={cn(
            "flex items-center gap-2 mb-4",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg vault-gradient flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg tracking-tight">
                VaultGuard
              </span>
            )}
          </div>
          {
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground transition-colors absolute -right-2.75 z-50 cursor-pointer"
            >
              {!collapsed ? (
                <ChevronLeftCircle className="h-5 w-5" />
              ) : (
                <ChevronRightCircle className="h-5 w-5" />
              )}
            </button>
          }
        </div>

        {collapsed ? (
          <div className="flex justify-center">
            <button
              onClick={() => setCollapsed(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm bg-muted border-0"
            />
          </div>
        )}
      </div>
      {/* Quick Filters */}
      <div className="p-2 space-y-0.5">
        <SidebarItem
          icon={<FolderOpen className="w-4 h-4" />}
          label="All Passwords"
          count={allCount}
          active={selectedGroupId === null}
          onClick={() => setSelectedGroupId(null)}
          collapsed={collapsed}
        />
        <SidebarItem
          icon={<Star className="w-4 h-4" />}
          label="Favorites"
          count={favCount}
          active={selectedGroupId === "__favorites"}
          onClick={() => setSelectedGroupId("__favorites")}
          collapsed={collapsed}
        />
        <SidebarItem
          icon={<Clock className="w-4 h-4" />}
          label="Recently Added"
          active={selectedGroupId === "__recent"}
          onClick={() => setSelectedGroupId("__recent")}
          collapsed={collapsed}
        />
      </div>
      {/* Groups */}
      <div className="flex-1 overflow-auto">
        <div
          className={cn(
            "px-3 py-2 flex items-center",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Groups
            </span>
          )}
          {!collapsed && (
            <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
              <DialogTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>New Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    placeholder="Group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
                    autoFocus
                  />
                  <Button
                    onClick={handleAddGroup}
                    className="w-full vault-gradient text-primary-foreground"
                  >
                    Create Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {collapsed && (
            <div className="w-full flex justify-center py-1">
              <div className="w-4 h-px bg-border" />
            </div>
          )}
        </div>
        <div className="px-2 space-y-0.5">
          <AnimatePresence>
            {groups.map((group) => {
              const Icon = iconMap[group.icon] || Folder;
              const count = entries.filter(
                (e) => e.groupId === group.id,
              ).length;
              const isDefault = DEFAULT_GROUP_IDS.includes(group.id);
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="group/item relative"
                >
                  <SidebarItem
                    icon={<Icon className="w-4 h-4" />}
                    label={group.name}
                    count={count}
                    active={selectedGroupId === group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    collapsed={collapsed}
                  />
                  {!collapsed && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingGroup({
                                id: group.id,
                                name: group.name,
                              });
                              setShowEditGroup(true);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          {!isDefault && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteGroup(group.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      {/* Edit Group Dialog */}
      <Dialog open={showEditGroup} onOpenChange={setShowEditGroup}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={editingGroup?.name || ""}
              onChange={(e) =>
                setEditingGroup((prev) =>
                  prev ? { ...prev, name: e.target.value } : null,
                )
              }
              onKeyDown={(e) => e.key === "Enter" && handleRenameGroup()}
              autoFocus
            />
            <Button
              onClick={handleRenameGroup}
              className="w-full vault-gradient text-primary-foreground"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        {!collapsed && (
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mb-1">
            <ThemeToggle />
          </div>
        )}
        {biometricAvailable && (
          <Button
            variant="ghost"
            onClick={biometricEnabled ? disableBiometric : enableBiometric}
            className={cn(
              "w-full",
              collapsed ? "justify-center px-0" : "justify-start",
              biometricEnabled ? "text-primary" : "text-muted-foreground",
            )}
            title={biometricEnabled ? "Biometrics On" : "Enable Biometrics"}
          >
            <Fingerprint className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="ml-2">
                {biometricEnabled ? "Biometrics On" : "Enable Biometrics"}
              </span>
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={lock}
          className={cn(
            "w-full text-muted-foreground hover:text-destructive",
            collapsed ? "justify-center px-0" : "justify-start",
          )}
          title="Lock Vault"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="ml-2">Lock Vault</span>}
        </Button>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  count,
  active,
  onClick,
  collapsed,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
        collapsed ? "justify-center px-0" : "",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                active
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          )}
        </>
      )}
    </button>
  );
}
