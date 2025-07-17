import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, LogIn, CheckCircle, Info, Users, Building, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

export default function SimpleLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useSimpleAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Login successful!",
          variant: "default"
        });
        
        // Store account info
        localStorage.setItem('account_id', result.account_id);
        localStorage.setItem('account_email', `${username}@nexxauth.local`);
        localStorage.setItem('simple_username', username);
        
        // Clear any logout flags
        localStorage.removeItem('user_logged_out');
        sessionStorage.removeItem('user_logged_out');
        
        // Force a page refresh to reinitialize auth state
        window.location.href = '/';
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nexx-primary via-nexx-secondary to-nexx-accent relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[calc(100vh-4rem)]">
          {/* Left side - Login Form */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="text-center lg:text-left">
              <Link href="/">
                <div className="flex items-center justify-center lg:justify-start space-x-2 mb-6">
                  <Shield className="h-8 w-8 text-white" />
                  <span className="text-2xl font-bold text-white">Nexx Auth</span>
                </div>
              </Link>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-lg text-white/80 mb-8">
                Sign in to your account to continue
              </p>
            </div>

            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center text-nexx-primary">
                  Sign In
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nexx-primary focus:border-transparent text-base"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nexx-primary focus:border-transparent text-base"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-nexx-primary hover:bg-nexx-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>{loading ? "Signing in..." : "Continue with Nexx Auth"}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right side - Hero Section */}
          <div className="hidden lg:flex flex-col justify-center space-y-6 text-white">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">
                Multi-Tenant Authentication System
              </h2>
              <p className="text-xl text-white/90">
                Secure, scalable, and easy to integrate authentication solution for your applications.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Enterprise Security</h3>
                  <p className="text-white/80">
                    Hardware ID locking, version control, and comprehensive blacklisting
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="h-6 w-6 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">User Management</h3>
                  <p className="text-white/80">
                    Complete user lifecycle management with role-based permissions
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Building className="h-6 w-6 text-purple-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Multi-Application</h3>
                  <p className="text-white/80">
                    Manage multiple applications with isolated user environments
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Globe className="h-6 w-6 text-cyan-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Global Integration</h3>
                  <p className="text-white/80">
                    RESTful API with webhooks for seamless third-party integration
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}