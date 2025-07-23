import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Mail, Edit, Save, ArrowLeft } from "lucide-react";
import Header from "@/components/header";
import AdvancedParticleBackground from "@/components/AdvancedParticleBackground";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function AccountSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    userPasswordCurrent: "",
    emailPasswordCurrent: "", 
    passwordCurrent: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Fetch current user data
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Update username mutation
  const updateUsernameMutation = useMutation({
    mutationFn: async (data: { username: string; currentPassword: string }) => {
      return apiRequest("/api/auth/update-username", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingUsername(false);
      setFormData(prev => ({ ...prev, userPasswordCurrent: "", username: "" }));
      toast({ title: "Username updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update username",
        variant: "destructive",
      });
    },
  });

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (data: { email: string; currentPassword: string }) => {
      return apiRequest("/api/auth/update-email", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingEmail(false);
      setFormData(prev => ({ ...prev, emailPasswordCurrent: "", email: "" }));
      toast({ title: "Email updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("/api/auth/update-password", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      setEditingPassword(false);
      setFormData(prev => ({ 
        ...prev, 
        passwordCurrent: "", 
        newPassword: "", 
        confirmPassword: "" 
      }));
      toast({ title: "Password updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const handleUpdateUsername = () => {
    if (!formData.username.trim() || !formData.userPasswordCurrent) {
      toast({
        title: "Error",
        description: "Please enter both username and current password",
        variant: "destructive",
      });
      return;
    }
    updateUsernameMutation.mutate({
      username: formData.username,
      currentPassword: formData.userPasswordCurrent,
    });
  };

  const handleUpdateEmail = () => {
    if (!formData.email.trim() || !formData.emailPasswordCurrent) {
      toast({
        title: "Error",
        description: "Please enter both email and current password",
        variant: "destructive",
      });
      return;
    }
    updateEmailMutation.mutate({
      email: formData.email,
      currentPassword: formData.emailPasswordCurrent,
    });
  };

  const handleUpdatePassword = () => {
    if (!formData.passwordCurrent || !formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    updatePasswordMutation.mutate({
      currentPassword: formData.passwordCurrent,
      newPassword: formData.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background relative">
        <AdvancedParticleBackground />
        <Header />
        <div className="relative z-10 max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <AdvancedParticleBackground />
      <Header />
      
      <div className="relative z-10 max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="h-8 w-8" />
              Account Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your account information and security settings
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* User ID Display */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Unique User ID (UID)</Label>
                <Input
                  value={user?.id || ""}
                  readOnly
                  className="font-mono bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  This is your permanent unique identifier and cannot be changed.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Username Settings */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Username
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Username</Label>
                  <Input
                    value={editingUsername ? formData.username : user?.firstName || ""}
                    readOnly={!editingUsername}
                    className={editingUsername ? "" : "bg-muted cursor-not-allowed"}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder={editingUsername ? "Enter new username" : ""}
                  />
                </div>
                
                {editingUsername && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Password</Label>
                    <Input
                      type="password"
                      value={formData.userPasswordCurrent}
                      onChange={(e) => setFormData(prev => ({ ...prev, userPasswordCurrent: e.target.value }))}
                      placeholder="Enter your current password"
                      autoComplete="current-password-username"
                    />
                  </div>
                )}
                
                <div className="flex gap-2">
                  {!editingUsername ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingUsername(true);
                        setFormData(prev => ({ ...prev, username: user?.firstName || "" }));
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Username
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleUpdateUsername}
                        disabled={updateUsernameMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingUsername(false);
                          setFormData(prev => ({ ...prev, username: "", userPasswordCurrent: "" }));
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Email</Label>
                  <Input
                    value={editingEmail ? formData.email : user?.email || ""}
                    readOnly={!editingEmail}
                    className={editingEmail ? "" : "bg-muted cursor-not-allowed"}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={editingEmail ? "Enter new email" : ""}
                  />
                </div>
                
                {editingEmail && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Password</Label>
                    <Input
                      type="password"
                      value={formData.emailPasswordCurrent}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailPasswordCurrent: e.target.value }))}
                      placeholder="Enter your current password"
                      autoComplete="current-password-email"
                    />
                  </div>
                )}
                
                <div className="flex gap-2">
                  {!editingEmail ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingEmail(true);
                        setFormData(prev => ({ ...prev, email: user?.email || "" }));
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Email
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleUpdateEmail}
                        disabled={updateEmailMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingEmail(false);
                          setFormData(prev => ({ ...prev, email: "", emailPasswordCurrent: "" }));
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Settings */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!editingPassword ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Password</Label>
                    <Input
                      type="password"
                      value="••••••••"
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Current Password</Label>
                      <Input
                        type="password"
                        value={formData.passwordCurrent}
                        onChange={(e) => setFormData(prev => ({ ...prev, passwordCurrent: e.target.value }))}
                        placeholder="Enter your current password"
                        autoComplete="current-password-change"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">New Password</Label>
                      <Input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Confirm New Password</Label>
                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </>
                )}
                
                <div className="flex gap-2">
                  {!editingPassword ? (
                    <Button
                      variant="outline"
                      onClick={() => setEditingPassword(true)}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleUpdatePassword}
                        disabled={updatePasswordMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Update Password
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingPassword(false);
                          setFormData(prev => ({ 
                            ...prev, 
                            passwordCurrent: "", 
                            newPassword: "", 
                            confirmPassword: "" 
                          }));
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


        </div>
      </div>
    </div>
  );
}