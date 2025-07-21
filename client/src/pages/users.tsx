import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users as UsersIcon, Eye, EyeOff, MoreHorizontal, Trash2, Pause, Play, CheckSquare, X } from "lucide-react";
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
  createdAt: string;
  updatedAt: string;
}

interface AppUser {
  id: number;
  applicationId: number;
  licenseKeyId?: number;
  username: string;
  password: string;
  email?: string;
  isActive: boolean;
  isPaused: boolean;
  hwid?: string;
  lastLoginIp?: string;
  expiresAt?: string;
  createdAt: string;
  lastLogin?: string;
  loginAttempts: number;
}

interface ApplicationWithUsers {
  application: Application;
  users: AppUser[];
}

export default function Users() {
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<{[appId: number]: Set<number>}>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState<{open: boolean, users: number[], appId: number}>({open: false, users: [], appId: 0});
  const [showHwidDialog, setShowHwidDialog] = useState<{open: boolean, hwid: string}>({open: false, hwid: ""});
  const [showIpDialog, setShowIpDialog] = useState<{open: boolean, ip: string}>({open: false, ip: ""});

  // Fetch all applications and users in one query
  const applicationUsers = useQuery({
    queryKey: ["/api/all-application-users"],
    queryFn: async () => {
      try {
        // First fetch all applications
        const applications = await apiRequest("/api/applications");
        const appUsersData: ApplicationWithUsers[] = [];
        
        // Then fetch users for each application
        for (const app of applications) {
          try {
            const users = await apiRequest(`/api/applications/${app.id}/users`);
            appUsersData.push({
              application: app,
              users: users || []
            });
          } catch (error) {
            console.error(`Failed to fetch users for app ${app.id}:`, error);
            appUsersData.push({
              application: app,
              users: []
            });
          }
        }
        
        return appUsersData;
      } catch (error) {
        console.error("Failed to fetch applications:", error);
        return [];
      }
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, appId }: { userId: number; appId: number }) => {
      return apiRequest(`/api/applications/${appId}/users/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Bulk delete users mutation
  const bulkDeleteUsersMutation = useMutation({
    mutationFn: async ({ userIds, appId }: { userIds: number[]; appId: number }) => {
      return apiRequest(`/api/applications/${appId}/users/bulk-delete`, {
        method: "POST",
        body: { userIds },
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-users"] });
      setSelectedUsers(prev => ({ ...prev, [variables.appId]: new Set() }));
      toast({ title: `${variables.userIds.length} users deleted successfully` });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete users",
        variant: "destructive",
      });
    },
  });

  // Bulk pause users mutation
  const bulkPauseUsersMutation = useMutation({
    mutationFn: async ({ userIds, appId }: { userIds: number[]; appId: number }) => {
      return apiRequest(`/api/applications/${appId}/users/bulk-pause`, {
        method: "POST",
        body: { userIds },
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-users"] });
      setSelectedUsers(prev => ({ ...prev, [variables.appId]: new Set() }));
      toast({ title: `${variables.userIds.length} users paused successfully` });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pause users",
        variant: "destructive",
      });
    },
  });

  // Bulk unpause users mutation
  const bulkUnpauseUsersMutation = useMutation({
    mutationFn: async ({ userIds, appId }: { userIds: number[]; appId: number }) => {
      return apiRequest(`/api/applications/${appId}/users/bulk-unpause`, {
        method: "POST",
        body: { userIds },
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-application-users"] });
      setSelectedUsers(prev => ({ ...prev, [variables.appId]: new Set() }));
      toast({ title: `${variables.userIds.length} users unpaused successfully` });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unpause users",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    const { copyToClipboard: universalCopy } = await import("@/lib/clipboard");
    const success = await universalCopy(text);
    if (success) {
      toast({ title: "Copied to clipboard" });
    } else {
      toast({ 
        title: "Failed to copy", 
        variant: "destructive" 
      });
    }
  };

  const handleUserSelect = (appId: number, userId: number, checked: boolean) => {
    setSelectedUsers(prev => {
      const appSelected = prev[appId] || new Set();
      const newSelected = new Set(appSelected);
      
      if (checked) {
        newSelected.add(userId);
      } else {
        newSelected.delete(userId);
      }
      
      return { ...prev, [appId]: newSelected };
    });
  };

  const handleSelectAllUsers = (appId: number, userIds: number[], checked: boolean) => {
    setSelectedUsers(prev => ({
      ...prev,
      [appId]: checked ? new Set(userIds) : new Set()
    }));
  };

  const handleBulkDelete = (appId: number) => {
    const selected = selectedUsers[appId];
    if (!selected || selected.size === 0) return;
    setShowDeleteDialog({ open: true, users: Array.from(selected), appId });
  };

  const handleBulkPause = (appId: number) => {
    const selected = selectedUsers[appId];
    if (!selected || selected.size === 0) return;
    bulkPauseUsersMutation.mutate({ userIds: Array.from(selected), appId });
  };

  const handleBulkUnpause = (appId: number) => {
    const selected = selectedUsers[appId];
    if (!selected || selected.size === 0) return;
    bulkUnpauseUsersMutation.mutate({ userIds: Array.from(selected), appId });
  };

  const confirmBulkDelete = () => {
    bulkDeleteUsersMutation.mutate({ 
      userIds: showDeleteDialog.users, 
      appId: showDeleteDialog.appId 
    });
    setShowDeleteDialog({ open: false, users: [], appId: 0 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (applicationUsers.isLoading) {
    return (
      <div className="min-h-screen bg-background relative">
        <AdvancedParticleBackground />
        <Header />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          </div>
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
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <UsersIcon className="h-8 w-8" />
              All Users
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage users across all applications
            </p>
          </div>
        </div>

        {/* Applications with Users */}
        <div className="space-y-6">
          {applicationUsers.data?.map(({ application, users }) => {
            const appSelectedUsers = selectedUsers[application.id] || new Set();
            const allUsersSelected = users.length > 0 && appSelectedUsers.size === users.length;
            const someUsersSelected = appSelectedUsers.size > 0 && appSelectedUsers.size < users.length;

            return (
              <Card key={application.id} className="border-border/50 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {application.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {users.length} user{users.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {users.length > 0 && (
                      <div className="flex items-center gap-2">
                        {appSelectedUsers.size > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUsers(prev => ({ ...prev, [application.id]: new Set() }))}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Clear Selection
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4 mr-2" />
                                  Actions ({appSelectedUsers.size})
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleBulkDelete(application.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Selected
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkPause(application.id)}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause Selected
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkUnpause(application.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Unpause Selected
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found for this application
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={allUsersSelected}
                              ref={(el) => {
                                if (el && 'indeterminate' in el) {
                                  (el as any).indeterminate = someUsersSelected;
                                }
                              }}
                              onCheckedChange={(checked) => 
                                handleSelectAllUsers(application.id, users.map(u => u.id), checked === true)
                              }
                            />
                          </TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>HWID</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Checkbox
                                checked={appSelectedUsers.has(user.id)}
                                onCheckedChange={(checked) => 
                                  handleUserSelect(application.id, user.id, checked === true)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {user.username}
                              {user.email && (
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Badge variant={user.isActive ? "default" : "secondary"}>
                                  {user.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {user.isPaused && (
                                  <Badge variant="destructive">Paused</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.lastLoginIp ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowIpDialog({ open: true, ip: user.lastLoginIp! })}
                                  className="font-mono text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Show
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">No IP</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.hwid ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowHwidDialog({ open: true, hwid: user.hwid! })}
                                  className="font-mono text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Show
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">No HWID</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(user.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() => deleteUserMutation.mutate({ userId: user.id, appId: application.id })}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                  {user.isPaused ? (
                                    <DropdownMenuItem
                                      onClick={() => bulkUnpauseUsersMutation.mutate({ userIds: [user.id], appId: application.id })}
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      Unpause
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => bulkPauseUsersMutation.mutate({ userIds: [user.id], appId: application.id })}
                                    >
                                      <Pause className="h-4 w-4 mr-2" />
                                      Pause
                                    </DropdownMenuItem>
                                  )}
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
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog.open} onOpenChange={(open) => setShowDeleteDialog({ ...showDeleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {showDeleteDialog.users.length} user{showDeleteDialog.users.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* HWID Dialog */}
      <Dialog open={showHwidDialog.open} onOpenChange={(open) => setShowHwidDialog({ open, hwid: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hardware ID</DialogTitle>
            <DialogDescription>
              This is the user's hardware identifier used for device locking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">HWID:</Label>
              <div className="mt-2 font-mono text-sm break-all select-all">
                {showHwidDialog.hwid}
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={async () => {
                  const { copyToClipboard: universalCopy } = await import("@/lib/clipboard");
                  const success = await universalCopy(showHwidDialog.hwid);
                  if (success) {
                    toast({ title: "Copied", description: "HWID copied to clipboard" });
                  } else {
                    toast({ title: "Failed to copy", description: "Could not copy HWID", variant: "destructive" });
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* IP Address Dialog */}
      <Dialog open={showIpDialog.open} onOpenChange={(open) => setShowIpDialog({ open, ip: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IP Address</DialogTitle>
            <DialogDescription>
              This is the user's last login IP address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">IP Address:</Label>
              <div className="mt-2 font-mono text-lg break-all select-all">
                {showIpDialog.ip}
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={async () => {
                  const { copyToClipboard: universalCopy } = await import("@/lib/clipboard");
                  const success = await universalCopy(showIpDialog.ip);
                  if (success) {
                    toast({ title: "Copied", description: "IP address copied to clipboard" });
                  } else {
                    toast({ title: "Failed to copy", description: "Could not copy IP address", variant: "destructive" });
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}