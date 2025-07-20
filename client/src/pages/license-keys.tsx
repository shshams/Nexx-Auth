import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Copy, Key, Users, Calendar, Zap, CheckSquare } from "lucide-react";
import Header from "@/components/header";
import AdvancedParticleBackground from "@/components/AdvancedParticleBackground";

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

export default function LicenseKeys() {
  const { id: applicationId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    licenseKey: "",
    amountOfKeys: 1,
    maxUsers: 1,
    expiresAt: "",
    description: ""
  });

  // Bulk selection state for license keys
  const [selectedLicenses, setSelectedLicenses] = useState<Set<number>>(new Set());
  const [isAllLicensesSelected, setIsAllLicensesSelected] = useState(false);
  const [isBulkDeleteLicensesDialogOpen, setIsBulkDeleteLicensesDialogOpen] = useState(false);

  // Fetch application details
  const { data: application } = useQuery({
    queryKey: [`/api/applications/${applicationId}`],
  });

  // Fetch license keys
  const { data: licenseKeys = [], isLoading } = useQuery<LicenseKey[]>({
    queryKey: [`/api/applications/${applicationId}/licenses`],
    enabled: !!applicationId,
  });

  // Create license key mutation
  const createLicenseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest(`/api/applications/${applicationId}/licenses`, {
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}/licenses`] });
      setFormData({ licenseKey: "", amountOfKeys: 1, maxUsers: 1, expiresAt: "", description: "" });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "License key created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create license key",
        variant: "destructive",
      });
    },
  });

  // Generate license key mutation
  const generateLicenseMutation = useMutation({
    mutationFn: async (data: { amountOfKeys: number; maxUsers: number; expiresAt: string; description?: string }) => {
      return apiRequest(`/api/applications/${applicationId}/licenses/generate`, {
        method: "POST",
        body: data
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}/licenses`] });
      setFormData({ licenseKey: "", amountOfKeys: 1, maxUsers: 1, expiresAt: "", description: "" });
      setIsGenerateDialogOpen(false);
      toast({
        title: "Success",
        description: data?.message || `License key${data?.count > 1 ? 's' : ''} generated successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate license key",
        variant: "destructive",
      });
    },
  });

  // Delete license key mutation
  const deleteLicenseMutation = useMutation({
    mutationFn: async (licenseId: number) => {
      return apiRequest(`/api/applications/${applicationId}/licenses/${licenseId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}/licenses`] });
      toast({
        title: "Success",
        description: "License key deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete license key",
        variant: "destructive",
      });
    },
  });

  // Bulk delete license keys mutation
  const bulkDeleteLicensesMutation = useMutation({
    mutationFn: async (licenseIds: number[]) => {
      return apiRequest(`/api/applications/${applicationId}/licenses/bulk-delete`, {
        method: "POST",
        body: { licenseIds }
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}/licenses`] });
      setSelectedLicenses(new Set());
      setIsAllLicensesSelected(false);
      setIsBulkDeleteLicensesDialogOpen(false);
      toast({
        title: "Success",
        description: `${data?.deletedCount || selectedLicenses.size} license key(s) deleted successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete license keys",
        variant: "destructive",
      });
    },
  });

  // Handle bulk license selection
  const handleLicenseSelection = (licenseId: number, checked: boolean) => {
    const newSelected = new Set(selectedLicenses);
    if (checked) {
      newSelected.add(licenseId);
    } else {
      newSelected.delete(licenseId);
    }
    setSelectedLicenses(newSelected);
    setIsAllLicensesSelected(newSelected.size === licenseKeys.length && licenseKeys.length > 0);
  };

  const handleSelectAllLicenses = (checked: boolean) => {
    if (checked) {
      const allLicenseIds = new Set(licenseKeys.map(license => license.id));
      setSelectedLicenses(allLicenseIds);
      setIsAllLicensesSelected(true);
    } else {
      setSelectedLicenses(new Set());
      setIsAllLicensesSelected(false);
    }
  };

  const handleBulkDeleteLicenses = () => {
    if (selectedLicenses.size === 0) return;
    bulkDeleteLicensesMutation.mutate(Array.from(selectedLicenses));
  };

  const handleCreateLicense = () => {
    if (!formData.licenseKey.trim()) {
      toast({
        title: "Error",
        description: "Please provide a license key",
        variant: "destructive"
      });
      return;
    }
    if (!formData.expiresAt) {
      toast({
        title: "Error",
        description: "Please select an expiration date",
        variant: "destructive"
      });
      return;
    }
    if (new Date(formData.expiresAt) <= new Date()) {
      toast({
        title: "Error",
        description: "Expiration date must be in the future",
        variant: "destructive"
      });
      return;
    }
    createLicenseMutation.mutate(formData);
  };

  const handleGenerateLicense = () => {
    if (!formData.expiresAt) {
      toast({
        title: "Error",
        description: "Please select an expiration date",
        variant: "destructive"
      });
      return;
    }
    if (new Date(formData.expiresAt) <= new Date()) {
      toast({
        title: "Error",
        description: "Expiration date must be in the future",
        variant: "destructive"
      });
      return;
    }
    if (formData.amountOfKeys < 1 || formData.amountOfKeys > 100) {
      toast({
        title: "Error",
        description: "Amount of keys must be between 1 and 100",
        variant: "destructive"
      });
      return;
    }
    generateLicenseMutation.mutate({
      amountOfKeys: formData.amountOfKeys,
      maxUsers: formData.maxUsers,
      expiresAt: formData.expiresAt,
      description: formData.description
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "License key copied to clipboard",
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getRemainingDays = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AdvancedParticleBackground />
      <Header />
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Key className="h-8 w-8" />
              License Keys - {application?.name || 'Application'}
            </h1>
            <p className="text-muted-foreground">Manage license keys for user registration</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New License Key</DialogTitle>
                  <DialogDescription>
                    Automatically generate a secure license key with your specifications
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="gen-amount">Amount of Keys</Label>
                    <Input
                      id="gen-amount"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.amountOfKeys}
                      onChange={(e) => setFormData(prev => ({ ...prev, amountOfKeys: parseInt(e.target.value) || 1 }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate multiple license keys with the same specifications (max 100)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="gen-max-users">Maximum Users</Label>
                    <Input
                      id="gen-max-users"
                      type="number"
                      min="1"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gen-expires-at">Expires At</Label>
                    <Input
                      id="gen-expires-at"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gen-description">Description (Optional)</Label>
                    <Input
                      id="gen-description"
                      placeholder="License description..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateLicense} disabled={generateLicenseMutation.isPending}>
                    {generateLicenseMutation.isPending ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Custom Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Custom License Key</DialogTitle>
                  <DialogDescription>
                    Create a license key with your own custom key string
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="license-key">License Key</Label>
                    <Input
                      id="license-key"
                      placeholder="YOUR-CUSTOM-LICENSE-KEY"
                      value={formData.licenseKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, licenseKey: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-users">Maximum Users</Label>
                    <Input
                      id="max-users"
                      type="number"
                      min="1"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expires-at">Expires At</Label>
                    <Input
                      id="expires-at"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="License description..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLicense} disabled={createLicenseMutation.isPending}>
                    {createLicenseMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* License Keys Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{licenseKeys.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
              <Key className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {licenseKeys.filter(key => key.isActive && !isExpired(key.expiresAt)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {licenseKeys.reduce((sum, key) => sum + key.currentUsers, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Keys</CardTitle>
              <Calendar className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {licenseKeys.filter(key => isExpired(key.expiresAt)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* License Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>License Keys</CardTitle>
            <CardDescription>
              Manage license keys for user registration and access control
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading license keys...</p>
              </div>
            ) : licenseKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No license keys created</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first license key to enable user registration
                </p>
                <Button onClick={() => setIsGenerateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate License Key
                </Button>
              </div>
            ) : (
              <>
                {/* Bulk Actions Bar */}
                {selectedLicenses.size > 0 && (
                  <div className="flex items-center justify-between p-4 mb-4 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedLicenses.size} license key{selectedLicenses.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedLicenses(new Set())}
                      >
                        Clear Selection
                      </Button>
                      <AlertDialog open={isBulkDeleteLicensesDialogOpen} onOpenChange={setIsBulkDeleteLicensesDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete License Keys</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {selectedLicenses.size} license key{selectedLicenses.size > 1 ? 's' : ''}? This action cannot be undone and users with these licenses will lose access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleBulkDeleteLicenses}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={bulkDeleteLicensesMutation.isPending}
                            >
                              {bulkDeleteLicensesMutation.isPending ? "Deleting..." : "Delete License Keys"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllLicensesSelected}
                          onCheckedChange={handleSelectAllLicenses}
                          aria-label="Select all license keys"
                        />
                      </TableHead>
                      <TableHead>License Key</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenseKeys.map((license) => {
                      const expired = isExpired(license.expiresAt);
                      const remainingDays = getRemainingDays(license.expiresAt);
                      
                      return (
                        <TableRow key={license.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLicenses.has(license.id)}
                              onCheckedChange={(checked) => handleLicenseSelection(license.id, checked as boolean)}
                              aria-label={`Select license ${license.licenseKey}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-sm">
                                {license.licenseKey}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(license.licenseKey)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            {license.description && (
                              <p className="text-sm text-muted-foreground mt-1">{license.description}</p>
                            )}
                          </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{license.currentUsers}/{license.maxUsers}</span>
                            <span className="text-sm text-muted-foreground">
                              {license.maxUsers - license.currentUsers} remaining
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{license.validityDays} days</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              expired ? "destructive" : 
                              !license.isActive ? "secondary" : 
                              license.currentUsers >= license.maxUsers ? "outline" :
                              "default"
                            }
                          >
                            {expired ? "Expired" : 
                             !license.isActive ? "Inactive" :
                             license.currentUsers >= license.maxUsers ? "Full" :
                             "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {new Date(license.expiresAt).toLocaleDateString()}
                            </span>
                            {!expired && (
                              <span className={`text-xs ${remainingDays <= 7 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {remainingDays} days left
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete License Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this license key? This action cannot be undone.
                                  Any users currently using this license will lose access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteLicenseMutation.mutate(license.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}