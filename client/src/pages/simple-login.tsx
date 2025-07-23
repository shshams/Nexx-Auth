import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, LogIn, Info, Building } from "lucide-react";
import { Link } from "wouter";
import AdvancedParticleBackground from "@/components/AdvancedParticleBackground";

export default function SimpleLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
        localStorage.setItem('account_email', `${username}@primeauth.local`);
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
    <div className="min-h-screen bg-background relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Advanced Particle Background */}
      <AdvancedParticleBackground />
      
      <div className="relative z-10 max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center mb-6">
            <Shield className="h-10 w-10 primary-color mr-3" />
            <span className="text-2xl font-bold text-foreground">Prime Auth</span>
          </Link>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Access Your Account
          </h2>
          <p className="text-muted-foreground">
            Sign in to access your authentication environment
          </p>
        </div>

        <Card className="professional-card shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center text-xl font-semibold">
              <Building className="h-5 w-5 mr-2 primary-color" />
              Multi-Tenant Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="professional-card bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Multi-Tenant Authentication
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Secure isolated environments with unique API keys.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-foreground">
                    Enter your username or email
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full professional-button py-3 px-4 rounded-lg font-semibold text-lg transition-all duration-200"
                >
                  <div className="flex items-center justify-center w-full">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <div className="flex items-center">
                        <LogIn className="w-5 h-5 mr-3" />
                        <span>Sign In</span>
                      </div>
                    )}
                  </div>
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}