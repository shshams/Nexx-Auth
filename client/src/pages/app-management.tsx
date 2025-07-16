import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Settings, ArrowLeft, Users, Activity, Eye, EyeOff, MoreHorizontal, Trash2, Pause, Play, Key, Shield, Plus, UserPlus } from "lucide-react";
import Header from "@/components/header";
import AdvancedParticleBackground from "@/components/AdvancedParticleBackground";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Application {
  id: number;
  userId: string;
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
  createdAt: string;
  updatedAt: string;
}

interface AppUser {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isPaused: boolean;
  hwid?: string;
  expiresAt?: string;
  createdAt: string;
  lastLogin?: string;
  loginAttempts: number;
  lastLoginAttempt?: string;
}

interface LicenseKey {
  id: number;
  licenseKey: string;
  maxUsers: number;
  currentUsers: number;
  validityDays: number;
  expiresAt: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppStats {
  totalUsers: number;
  activeUsers: number;
  registeredUsers: number;
  activeSessions: number;
  loginSuccessRate: number;
  totalApiRequests: number;
  lastActivity: string | null;
  applicationStatus: 'online' | 'offline';
  hwidLockEnabled: boolean;
}

export default function AppManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditAppDialogOpen, setIsEditAppDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [editAppData, setEditAppData] = useState<Partial<Application>>({});
  const [createUserData, setCreateUserData] = useState({
    username: "",
    password: "",
    email: "",
    licenseKey: "",
    expiresAt: "",
    hwid: ""
  });

  // Get application ID from URL
  const appId = window.location.pathname.split('/')[2];

  // Fetch application data
  const { data: application, isLoading: isLoadingApp, error: applicationError } = useQuery<Application>({
    queryKey: [`/api/applications/${appId}`],
    enabled: !!appId,
    retry: 2,
    staleTime: 0,
  });

  // Fetch app users
  const { data: appUsers = [], isLoading: isLoadingUsers } = useQuery<AppUser[]>({
    queryKey: [`/api/applications/${appId}/users`],
    enabled: !!appId,
  });

  // Fetch app stats
  const { data: appStats } = useQuery<AppStats>({
    queryKey: [`/api/applications/${appId}/stats`],
    enabled: !!appId,
  });

  // Fetch license keys for user creation
  const { data: licenseKeys = [] } = useQuery<LicenseKey[]>({
    queryKey: [`/api/applications/${appId}/licenses`],
    enabled: !!appId,
  });

  // Update application mutation
  const updateApplicationMutation = useMutation({
    mutationFn: (data: Partial<Application>) => 
      apiRequest(`/api/applications/${appId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/stats`] });
      setIsEditAppDialogOpen(false);
      toast({ title: "Application updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update application", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/applications/${appId}/users/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/users`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/stats`] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete user", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Pause user mutation
  const pauseUserMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/applications/${appId}/users/${userId}/pause`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/users`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/stats`] });
      toast({ title: "User paused successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to pause user", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Unpause user mutation
  const unpauseUserMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/applications/${appId}/users/${userId}/unpause`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/users`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/stats`] });
      toast({ title: "User unpaused successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to unpause user", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Reset HWID mutation
  const resetHwidMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/applications/${appId}/users/${userId}/reset-hwid`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/users`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/stats`] });
      toast({ title: "HWID reset successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to reset HWID", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => 
      apiRequest(`/api/applications/${appId}/users`, {
        method: 'POST',
        body: userData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/users`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/licenses`] });
      setIsCreateUserDialogOpen(false);
      setCreateUserData({
        username: "",
        password: "",
        email: "",
        licenseKey: "",
        expiresAt: "",
        hwid: ""
      });
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create user", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  useEffect(() => {
    if (application) {
      console.log('Application data received:', application);
      setEditAppData(application);
    }
  }, [application]);

  // Debug logging
  useEffect(() => {
    console.log('App Management Debug:', {
      appId,
      application,
      isLoadingApp,
      applicationError,
      appUsers,
      appStats
    });
  }, [appId, application, isLoadingApp, applicationError, appUsers, appStats]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch (err) {
      toast({ 
        title: "Failed to copy", 
        variant: "destructive" 
      });
    }
  };

  const handleUpdateApp = () => {
    updateApplicationMutation.mutate(editAppData);
  };

  const handleCreateUser = () => {
    if (!createUserData.username.trim()) {
      toast({
        title: "Error",
        description: "Username is required",
        variant: "destructive"
      });
      return;
    }
    if (!createUserData.password.trim()) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive"
      });
      return;
    }
    
    // Remove licenseKey from data for admin creation - it's optional
    const userData: any = { ...createUserData };
    if (!userData.licenseKey || !userData.licenseKey.trim()) {
      userData.licenseKey = undefined;
    }
    
    createUserMutation.mutate(userData);
  };

  if (isLoadingApp) {
    return (
      <div className="min-h-screen bg-background relative">
        <AdvancedParticleBackground />
        <Header />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="text-center">Loading application...</div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background relative">
        <AdvancedParticleBackground />
        <Header />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="text-center">Application not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <AdvancedParticleBackground />
      <Header />
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                {application.name}
                <Badge variant={application.isActive ? "default" : "secondary"}>
                  {application.isActive ? "Active" : "Inactive"}
                </Badge>
              </h1>
              <p className="text-muted-foreground">{application.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setLocation(`/app/${appId}/licenses`)}
              variant="outline"
            >
              <Key className="mr-2 h-4 w-4" />
              License Keys
            </Button>
            <Dialog open={isEditAppDialogOpen} onOpenChange={setIsEditAppDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Application Settings</DialogTitle>
                  <DialogDescription>Update your application configuration</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Application Name</Label>
                      <Input
                        id="name"
                        value={editAppData.name || ""}
                        onChange={(e) => setEditAppData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="version">Version</Label>
                      <Input
                        id="version"
                        value={editAppData.version || ""}
                        onChange={(e) => setEditAppData(prev => ({ ...prev, version: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editAppData.description || ""}
                      onChange={(e) => setEditAppData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={editAppData.isActive || false}
                      onCheckedChange={(checked) => setEditAppData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Application Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hwidLockEnabled"
                      checked={editAppData.hwidLockEnabled || false}
                      onCheckedChange={(checked) => setEditAppData(prev => ({ ...prev, hwidLockEnabled: checked }))}
                    />
                    <Label htmlFor="hwidLockEnabled">HWID Lock Enabled</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditAppDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateApp} disabled={updateApplicationMutation.isPending}>
                      {updateApplicationMutation.isPending ? "Updating..." : "Update Application"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users ({appUsers.length})</TabsTrigger>
            <TabsTrigger value="api">API Configuration</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Application Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-muted-foreground">{application?.name || "Loading..."}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Version</Label>
                    <p className="text-sm text-muted-foreground">{application?.version || "Loading..."}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground">{application?.description || "No description"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm text-muted-foreground">
                      {application?.createdAt ? new Date(application.createdAt).toLocaleDateString() + ' ' + new Date(application.createdAt).toLocaleTimeString() : "Loading..."}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="text-sm text-muted-foreground">
                      {application?.updatedAt ? new Date(application.updatedAt).toLocaleDateString() + ' ' + new Date(application.updatedAt).toLocaleTimeString() : "Loading..."}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">API Key</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {application?.apiKey ? `${application.apiKey.substring(0, 8)}...` : "Loading..."}
                      </span>
                      {application?.apiKey && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(application.apiKey)}
                          title="Copy API Key"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={application?.isActive ? "default" : "secondary"}>
                      {application?.isActive ? "Online" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">HWID Lock</Label>
                    <Badge variant={application?.hwidLockEnabled ? "default" : "secondary"}>
                      {application?.hwidLockEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">User Count</Label>
                    <span className="text-sm font-medium">{appStats?.totalUsers || appUsers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Active Users</Label>
                    <span className="text-sm font-medium">{appStats?.activeUsers || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Real-time Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Live Sessions</Label>
                    <p className="text-lg font-bold text-green-600">{appStats?.activeSessions || 0}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">API Requests</Label>
                    <p className="text-lg font-bold">{appStats?.totalApiRequests || 0}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Success Rate</Label>
                    <p className="text-lg font-bold text-blue-600">{appStats?.loginSuccessRate || 0}%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Last Activity</Label>
                    <p className="text-xs text-muted-foreground">
                      {appStats?.lastActivity ? new Date(appStats.lastActivity).toLocaleString() : "No recent activity"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Application Users ({appUsers.length})
                  </div>
                  <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                          Add a new user to your application using a license key
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            value={createUserData.username}
                            onChange={(e) => setCreateUserData(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Enter username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={createUserData.password}
                            onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={createUserData.email}
                            onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email (optional)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="license-key">License Key (Optional)</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Leave empty for direct admin creation or select a license key to assign
                          </p>
                          {licenseKeys.length > 0 ? (
                            <Select 
                              value={createUserData.licenseKey} 
                              onValueChange={(value) => setCreateUserData(prev => ({ ...prev, licenseKey: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a license key (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No license key</SelectItem>
                                {licenseKeys
                                  .filter(key => key.isActive && key.currentUsers < key.maxUsers && new Date(key.expiresAt) > new Date())
                                  .map((key) => (
                                    <SelectItem key={key.id} value={key.licenseKey}>
                                      {key.licenseKey.substring(0, 16)}...
                                      ({key.currentUsers}/{key.maxUsers} users)
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={createUserData.licenseKey}
                              onChange={(e) => setCreateUserData(prev => ({ ...prev, licenseKey: e.target.value }))}
                              placeholder="Enter license key (optional)"
                            />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="expires-at">Expires At</Label>
                          <Input
                            id="expires-at"
                            type="datetime-local"
                            value={createUserData.expiresAt}
                            onChange={(e) => setCreateUserData(prev => ({ ...prev, expiresAt: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="hwid">Hardware ID</Label>
                          <Input
                            id="hwid"
                            value={createUserData.hwid}
                            onChange={(e) => setCreateUserData(prev => ({ ...prev, hwid: e.target.value }))}
                            placeholder="Enter HWID (optional)"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : appUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users registered yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>HWID</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appUsers.map((user: AppUser) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant={user.isActive ? "default" : "secondary"}>
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {user.isPaused && (
                                <Badge variant="outline">Paused</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">
                              {user.hwid ? `${user.hwid.substring(0, 8)}...` : "Not set"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : "Never"}
                          </TableCell>
                          <TableCell>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => user.isPaused ? unpauseUserMutation.mutate(user.id) : pauseUserMutation.mutate(user.id)}
                                >
                                  {user.isPaused ? (
                                    <>
                                      <Play className="mr-2 h-4 w-4" />
                                      Unpause
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="mr-2 h-4 w-4" />
                                      Pause
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {user.hwid && (
                                  <DropdownMenuItem onClick={() => resetHwidMutation.mutate(user.id)}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Reset HWID
                                  </DropdownMenuItem>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {user.username}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUserMutation.mutate(user.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Configuration Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={application.apiKey}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(application.apiKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Base URL</Label>
                  <Input value={`${window.location.origin}/api/auth`} readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium">Login Endpoint</Label>
                  <Input value={`${window.location.origin}/api/auth/login`} readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium">Register Endpoint</Label>
                  <Input value={`${window.location.origin}/api/auth/register`} readOnly />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Messages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Login Success Message</Label>
                  <Input value={application.loginSuccessMessage} readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium">Login Failed Message</Label>
                  <Input value={application.loginFailedMessage} readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium">Account Disabled Message</Label>
                  <Input value={application.accountDisabledMessage} readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium">Account Expired Message</Label>
                  <Input value={application.accountExpiredMessage} readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium">Version Mismatch Message</Label>
                  <Input value={application.versionMismatchMessage} readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium">HWID Mismatch Message</Label>
                  <Input value={application.hwidMismatchMessage} readOnly />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
