import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import {
  Cloud,
  Eye,
  EyeOff,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import {
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getBackupManager,
  BackupConfig,
  SyncStatus,
  ConflictInfo,
} from "@/lib/backup-manager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function NavBackupSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<BackupConfig>({
    githubToken: "",
    gistId: "",
    autoBackup: false,
    backupInterval: 30,
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isEnabled: false,
    lastBackupTime: null,
    lastSyncTime: null,
    isInProgress: false,
    error: null,
  });
  const [showToken, setShowToken] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  const backupManager = getBackupManager();

  useEffect(() => {
    // 监听同步状态变化
    const unsubscribe = backupManager.onSyncStatusChange(setSyncStatus);

    return unsubscribe;
  }, [backupManager]);

  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // 加载配置
      const savedConfig = backupManager.getConfig();
      if (savedConfig) {
        setConfig(savedConfig);
        setTokenValid(true);
      }

      // 加载同步状态
      setSyncStatus(backupManager.getSyncStatus());
    }
  };

  const handleTokenChange = (value: string) => {
    setConfig((prev) => ({ ...prev, githubToken: value }));
    setTokenValid(null);
  };

  const validateToken = async () => {
    if (!config.githubToken.trim()) {
      toast.error("Please enter a GitHub token");
      return;
    }

    setIsValidatingToken(true);
    try {
      const tempManager = getBackupManager();
      const tempConfig = { ...config, githubToken: config.githubToken.trim() };
      await tempManager.configureGitHubSync(tempConfig);

      setTokenValid(true);
      toast.success("GitHub token is valid and configured");
    } catch (error) {
      setTokenValid(false);
      toast.error(
        error instanceof Error ? error.message : "Token validation failed",
      );
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleBackupNow = async () => {
    if (!syncStatus.isEnabled) {
      toast.error("GitHub sync is not configured");
      return;
    }

    try {
      await backupManager.backupToGitHub();
      toast.success("Backup completed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backup failed");
    }
  };

  const handleRestoreFromGitHub = async () => {
    if (!syncStatus.isEnabled) {
      toast.error("GitHub sync is not configured");
      return;
    }

    try {
      const result = await backupManager.restoreFromGitHub(false);

      if (result.hasConflict) {
        setConflictInfo(result);
        setShowConflictDialog(true);
      } else {
        toast.success("Data restored successfully from GitHub");
        // 刷新页面以重新加载数据
        window.location.reload();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    }
  };

  const handleResolveConflicts = async (mergeStrategy: "replace" | "merge") => {
    try {
      // Fix: Pass the correct boolean parameter for the merge strategy
      // true = merge conflicts, false = replace local data completely
      await backupManager.restoreFromGitHub(mergeStrategy === "merge");
      setShowConflictDialog(false);
      setConflictInfo(null);

      toast.success(
        `Data restored successfully using ${mergeStrategy} strategy`,
      );
      // 刷新页面以重新加载数据
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Conflict resolution failed",
      );
    }
  };

  const handleDisableSync = () => {
    backupManager.disableGitHubSync();
    setConfig({
      githubToken: "",
      gistId: "",
      autoBackup: false,
      backupInterval: 30,
    });
    setTokenValid(null);
    toast.success("GitHub sync disabled");
  };

  const exportLocalData = () => {
    try {
      const data = backupManager.exportLocalData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-forge-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch (_error) {
      toast.error("Failed to export data");
    }
  };

  const importLocalData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          backupManager.importLocalData(data);
          toast.success("Data imported successfully");
          window.location.reload();
        } catch (_error) {
          toast.error("Failed to import data: Invalid file format");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = () => {
    if (!syncStatus.isEnabled) return "bg-gray-500";
    if (syncStatus.error) return "bg-red-500";
    if (syncStatus.isInProgress) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (!syncStatus.isEnabled) return "Disabled";
    if (syncStatus.error) return "Error";
    if (syncStatus.isInProgress) return "Syncing";
    return "Ready";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
        <DialogTrigger asChild>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem key="Data Backup">
                <SidebarMenuButton asChild size="sm">
                  <a className="cursor-pointer">
                    <Cloud />
                    <span>Data Backup</span>
                    <Badge
                      className={`ml-2 w-2 h-2 p-0 ${getStatusColor()}`}
                      title={getStatusText()}
                    />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Data Backup Settings
            </DialogTitle>
            <DialogDescription>
              Backup your projects and test sets to GitHub Gist. Your data stays
              private and secure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* GitHub Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">GitHub Integration</h3>

              <div className="space-y-2">
                <Label htmlFor="github-token">
                  GitHub Personal Access Token
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="github-token"
                    type={showToken ? "text" : "password"}
                    value={config.githubToken}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={validateToken}
                    disabled={isValidatingToken || !config.githubToken.trim()}
                  >
                    {isValidatingToken ? "Validating..." : "Configure"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <a
                    href="https://github.com/settings/tokens/new?description=Prompt%20Forge%20Backup&scopes=gist"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Create a token with &apos;gist&apos; permission
                  </a>
                </p>
                {tokenValid === false && (
                  <p className="text-xs text-red-500">
                    Invalid token or missing gist permission
                  </p>
                )}
                {tokenValid === true && (
                  <p className="text-xs text-green-500">
                    Token validated successfully
                  </p>
                )}
              </div>

              {syncStatus.isEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-backup">Auto Backup</Label>
                    <Switch
                      id="auto-backup"
                      checked={config.autoBackup}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, autoBackup: checked }))
                      }
                    />
                  </div>

                  {config.autoBackup && (
                    <div className="space-y-2">
                      <Label>
                        Backup Interval: {config.backupInterval} minutes
                      </Label>
                      <Slider
                        value={[config.backupInterval]}
                        onValueChange={(value) =>
                          setConfig((prev) => ({
                            ...prev,
                            backupInterval: value[0],
                          }))
                        }
                        min={10}
                        max={120}
                        step={10}
                        className="w-full"
                      />
                    </div>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisableSync}
                  >
                    Disable GitHub Sync
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Sync Status */}
            {syncStatus.isEnabled && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Sync Status</h3>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${getStatusColor()}`}
                        />
                        {getStatusText()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Backup</p>
                      <p>{formatTimestamp(syncStatus.lastBackupTime)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Sync</p>
                      <p>{formatTimestamp(syncStatus.lastSyncTime)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Auto Backup</p>
                      <p>
                        {config.autoBackup
                          ? `Every ${config.backupInterval}min`
                          : "Disabled"}
                      </p>
                    </div>
                  </div>

                  {syncStatus.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-700 text-sm">{syncStatus.error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleBackupNow}
                      disabled={syncStatus.isInProgress}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {syncStatus.isInProgress ? "Backing up..." : "Backup Now"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRestoreFromGitHub}
                      disabled={syncStatus.isInProgress}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Restore from GitHub
                    </Button>
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Local Backup */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Local Backup</h3>
              <p className="text-sm text-muted-foreground">
                Export or import your data as a JSON file
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={exportLocalData}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Export Data
                </Button>
                <Button
                  variant="outline"
                  onClick={importLocalData}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Import Data
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <AlertDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Data Conflicts Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  There are conflicts between your local data and the backup
                  data. Choose how to resolve them:
                </p>

                {conflictInfo && (
                  <div className="space-y-2 text-sm">
                    {conflictInfo.conflictDetails.projects.localOnly.length >
                      0 && (
                      <p>
                        •{" "}
                        {conflictInfo.conflictDetails.projects.localOnly.length}{" "}
                        projects exist only locally
                      </p>
                    )}
                    {conflictInfo.conflictDetails.projects.remoteOnly.length >
                      0 && (
                      <p>
                        •{" "}
                        {
                          conflictInfo.conflictDetails.projects.remoteOnly
                            .length
                        }{" "}
                        projects exist only in backup
                      </p>
                    )}
                    {conflictInfo.conflictDetails.projects.modified.length >
                      0 && (
                      <p>
                        •{" "}
                        {conflictInfo.conflictDetails.projects.modified.length}{" "}
                        projects have been modified in both places
                      </p>
                    )}
                    {conflictInfo.conflictDetails.testSets.localOnly.length >
                      0 && (
                      <p>
                        •{" "}
                        {conflictInfo.conflictDetails.testSets.localOnly.length}{" "}
                        test sets exist only locally
                      </p>
                    )}
                    {conflictInfo.conflictDetails.testSets.remoteOnly.length >
                      0 && (
                      <p>
                        •{" "}
                        {
                          conflictInfo.conflictDetails.testSets.remoteOnly
                            .length
                        }{" "}
                        test sets exist only in backup
                      </p>
                    )}
                    {conflictInfo.conflictDetails.testSets.modified.length >
                      0 && (
                      <p>
                        •{" "}
                        {conflictInfo.conflictDetails.testSets.modified.length}{" "}
                        test sets have been modified in both places
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                  <div className="text-sm space-y-2">
                    <p><strong>Replace Local Data:</strong> Completely overwrites all your local projects and test sets with the backup data. Local-only items will be lost.</p>
                    <p><strong>Merge Data:</strong> Combines local and backup data. Keeps local-only items and uses backup versions for conflicts.</p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResolveConflicts("replace")}
              className="bg-red-600 hover:bg-red-700"
            >
              Replace Local Data
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleResolveConflicts("merge")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Merge Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
