import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import AdvancedParticleBackground from "@/components/AdvancedParticleBackground";
import Header from "@/components/header";
import { 
  Users, 
  Key, 
  Shield, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff,
  BarChart3,
  Crown,
  Trash2,
  Settings,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  HardDrive,
  GitBranch
} from "lucide-react";

interface Application {
  id: number;
  name: string;
  description: string;
  apiKey: string;
  version: string;
  isActive: boolean;
  hwidLockEnabled: boolean;
  loginSuccessMessage: string;
  loginFailedMessage: string;
  accountDisabledMessage: string;
  accountExpiredMessage: string;
  versionMismatchMessage: string;
  hwidMismatchMessage: string;
  pauseUserMessage: string;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalApplications: number;
  totalUsers: number;
  activeApplications: number;
  totalActiveSessions: number;
  accountType: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [isNewAppDialogOpen, setIsNewAppDialogOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppDescription, setNewAppDescription] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);
  const [isEditAppDialogOpen, setIsEditAppDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  // Queries
  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Mutations
  const createApplicationMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("/api/applications", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsNewAppDialogOpen(false);
      setNewAppName("");
      setNewAppDescription("");
      toast({
        title: "Success",
        description: "Application created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create application",
        variant: "destructive",
      });
    },
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Application> }) => {
      return apiRequest(`/api/applications/${data.id}`, {
        method: "PATCH",
        body: data.updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsEditAppDialogOpen(false);
      setEditingApp(null);
      toast({
        title: "Success",
        description: "Application updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    },
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/applications/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Application deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete application",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const createApplication = async () => {
    if (!newAppName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an application name",
        variant: "destructive"
      });
      return;
    }
    createApplicationMutation.mutate({ name: newAppName, description: newAppDescription });
  };

  const updateApplication = async () => {
    if (!editingApp?.name?.trim()) {
      toast({
        title: "Error",
        description: "Please enter an application name",
        variant: "destructive"
      });
      return;
    }
    if (editingApp) {
      updateApplicationMutation.mutate({ 
        id: editingApp.id, 
        updates: {
          name: editingApp.name,
          description: editingApp.description,
          version: editingApp.version,
          isActive: editingApp.isActive,
          hwidLockEnabled: editingApp.hwidLockEnabled,
          loginSuccessMessage: editingApp.loginSuccessMessage,
          loginFailedMessage: editingApp.loginFailedMessage,
          accountDisabledMessage: editingApp.accountDisabledMessage,
          accountExpiredMessage: editingApp.accountExpiredMessage,
          versionMismatchMessage: editingApp.versionMismatchMessage,
          hwidMismatchMessage: editingApp.hwidMismatchMessage,
          pauseUserMessage: editingApp.pauseUserMessage
        }
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    const { copyToClipboard: universalCopy } = await import("@/lib/clipboard");
    const success = await universalCopy(text);
    if (success) {
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    } else {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const toggleKeyVisibility = (keyId: number) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const maskKey = (key: string, isVisible: boolean) => {
    if (isVisible) return key;
    return key.substring(0, 12) + "•".repeat(20) + key.substring(key.length - 8);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEditApplication = (app: Application) => {
    setEditingApp({...app}); // Clone the app to avoid mutating the original
    setIsEditAppDialogOpen(true);
  };

  const handleDeleteApplication = (app: Application) => {
    setAppToDelete(app);
    setDeleteConfirmDialogOpen(true);
  };

  const confirmDeleteApplication = () => {
    if (appToDelete) {
      deleteApplicationMutation.mutate(appToDelete.id);
      setDeleteConfirmDialogOpen(false);
      setAppToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Advanced Particle Background */}
      <AdvancedParticleBackground />
      {/* Standard Navigation */}
      <Header />

      <div className="relative z-10 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Applications Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {(user as any)?.firstName || (user as any)?.email || 'User'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <Badge variant="secondary" className="text-sm font-medium">
                {dashboardStats?.accountType || 'Premium'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="phantom-stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.totalApplications || 0}</div>
              <p className="text-xs text-muted-foreground">Total created</p>
            </CardContent>
          </Card>

          <Card className="phantom-stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Across all apps</p>
            </CardContent>
          </Card>

          <Card className="phantom-stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Apps</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold success-color">{dashboardStats?.activeApplications || 0}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card className="phantom-stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.totalActiveSessions || 0}</div>
              <p className="text-xs text-muted-foreground">Live connections</p>
            </CardContent>
          </Card>
        </div>

        {/* Applications Content */}
        <div className="space-y-6">
          <Card className="phantom-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Applications</CardTitle>
                  <CardDescription>
                    Create and manage your authentication applications
                  </CardDescription>
                </div>
                <Dialog open={isNewAppDialogOpen} onOpenChange={setIsNewAppDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="phantom-button">
                      <Plus className="h-4 w-4 mr-2" />
                      New Application
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Application</DialogTitle>
                      <DialogDescription>
                        Create a new application to get an API key for authentication.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={newAppName}
                          onChange={(e) => setNewAppName(e.target.value)}
                          className="col-span-3"
                          placeholder="e.g., My Game App"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={newAppDescription}
                          onChange={(e) => setNewAppDescription(e.target.value)}
                          className="col-span-3"
                          placeholder="Optional description..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={createApplication} 
                        className="phantom-button"
                        disabled={createApplicationMutation.isPending}
                      >
                        {createApplicationMutation.isPending ? "Creating..." : "Create Application"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Applications</h3>
                  <p className="text-muted-foreground mb-4">Create your first application to get started</p>
                  <Button 
                    onClick={() => setIsNewAppDialogOpen(true)}
                    className="phantom-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Application
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app: Application) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{app.name}</div>
                            {app.description && (
                              <div className="text-sm text-muted-foreground">{app.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {maskKey(app.apiKey, visibleKeys.has(app.id))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={app.isActive ? "default" : "secondary"}>
                            {app.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(app.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleKeyVisibility(app.id)}
                              title={visibleKeys.has(app.id) ? "Hide API Key" : "Show API Key"}
                            >
                              {visibleKeys.has(app.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(app.apiKey)}
                              title="Copy API Key"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditApplication(app)}
                              title="Edit Application"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Link href={`/app/${app.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Manage Application"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteApplication(app)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete Application"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Application Dialog */}
        <Dialog open={isEditAppDialogOpen} onOpenChange={setIsEditAppDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Application - {editingApp?.name}</DialogTitle>
              <DialogDescription>
                Configure application settings, version control, HWID locking, and custom messages.
              </DialogDescription>
            </DialogHeader>
            {editingApp && (
              <div className="grid gap-6 py-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="security">Security & HWID</TabsTrigger>
                    <TabsTrigger value="messages">Custom Messages</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-name" className="text-right">Name</Label>
                      <Input
                        id="edit-name"
                        defaultValue={editingApp.name}
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-description" className="text-right">Description</Label>
                      <Textarea
                        id="edit-description"
                        defaultValue={editingApp.description || ""}
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, description: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-version" className="text-right">Version</Label>
                      <Input
                        id="edit-version"
                        defaultValue={editingApp.version}
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, version: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-active" className="text-right">Status</Label>
                      <div className="col-span-3 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-active"
                          checked={editingApp.isActive}
                          onChange={(e) => setEditingApp({...editingApp, isActive: e.target.checked})}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="edit-active" className="text-sm">Application is active</Label>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-hwid-lock" className="text-right">
                        <HardDrive className="h-4 w-4 mr-1 inline" />
                        HWID Lock
                      </Label>
                      <div className="col-span-3 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-hwid-lock"
                          checked={editingApp.hwidLockEnabled}
                          onChange={(e) => setEditingApp({...editingApp, hwidLockEnabled: e.target.checked})}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="edit-hwid-lock" className="text-sm">Enable Hardware ID locking</Label>
                      </div>
                    </div>
                    <div className="col-span-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        When HWID lock is enabled, users will be locked to their first login device. 
                        This prevents account sharing and unauthorized access from different machines.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="messages" className="space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-success-msg" className="text-right">
                        <CheckCircle className="h-4 w-4 mr-1 inline text-green-600" />
                        Login Success
                      </Label>
                      <Input
                        id="edit-success-msg"
                        defaultValue={editingApp.loginSuccessMessage}
                        placeholder="Login successful!"
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, loginSuccessMessage: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-failed-msg" className="text-right">
                        <XCircle className="h-4 w-4 mr-1 inline text-red-600" />
                        Login Failed
                      </Label>
                      <Input
                        id="edit-failed-msg"
                        defaultValue={editingApp.loginFailedMessage}
                        placeholder="Invalid credentials!"
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, loginFailedMessage: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-disabled-msg" className="text-right">
                        <AlertTriangle className="h-4 w-4 mr-1 inline text-orange-600" />
                        Account Disabled
                      </Label>
                      <Input
                        id="edit-disabled-msg"
                        defaultValue={editingApp.accountDisabledMessage}
                        placeholder="Account is disabled!"
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, accountDisabledMessage: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-expired-msg" className="text-right">
                        <Calendar className="h-4 w-4 mr-1 inline text-red-600" />
                        Account Expired
                      </Label>
                      <Input
                        id="edit-expired-msg"
                        defaultValue={editingApp.accountExpiredMessage}
                        placeholder="Account has expired!"
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, accountExpiredMessage: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-version-msg" className="text-right">
                        <GitBranch className="h-4 w-4 mr-1 inline text-blue-600" />
                        Version Mismatch
                      </Label>
                      <Input
                        id="edit-version-msg"
                        defaultValue={editingApp.versionMismatchMessage}
                        placeholder="Please update your application!"
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, versionMismatchMessage: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-hwid-msg" className="text-right">
                        <HardDrive className="h-4 w-4 mr-1 inline text-purple-600" />
                        HWID Mismatch
                      </Label>
                      <Input
                        id="edit-hwid-msg"
                        defaultValue={editingApp.hwidMismatchMessage}
                        placeholder="Hardware ID mismatch detected!"
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, hwidMismatchMessage: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-pause-msg" className="text-right">
                        <AlertTriangle className="h-4 w-4 mr-1 inline text-orange-600" />
                        User Paused
                      </Label>
                      <Input
                        id="edit-pause-msg"
                        defaultValue={editingApp.pauseUserMessage}
                        placeholder="Account Is Paused Temporally. Contract Support"
                        className="col-span-3"
                        onChange={(e) => setEditingApp({...editingApp, pauseUserMessage: e.target.value})}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditAppDialogOpen(false);
                  setEditingApp(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={updateApplication}
                className="phantom-button"
                disabled={updateApplicationMutation.isPending}
              >
                {updateApplicationMutation.isPending ? "Updating..." : "Update Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Application</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{appToDelete?.name}"? This action cannot be undone and will remove all associated users, license keys, and data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmDialogOpen(false);
                  setAppToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDeleteApplication}
                disabled={deleteApplicationMutation.isPending}
              >
                {deleteApplicationMutation.isPending ? "Deleting..." : "Delete Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}