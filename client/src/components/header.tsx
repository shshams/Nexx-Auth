import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Users, DollarSign, LogIn, LogOut, Settings, Webhook, Ban, Home, Moon, Sun, Activity, Code, Crown, UserCog } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Header() {
  const { isAuthenticated, user, logout } = useSimpleAuth();
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  // Check if user has owner privileges
  const isOwner = (user as any)?.userPermissions?.role === 'owner';
  const canEditCode = (user as any)?.userPermissions?.permissions?.includes('edit_code') || isOwner;
  const canManageUsers = (user as any)?.userPermissions?.permissions?.includes('manage_users') || isOwner;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    try {
      console.log("Logout button clicked");
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isAuthenticated) {
    return (
      <header className="bg-background dark:bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <span className="text-xl font-bold text-foreground">NEXX AUTH</span>
                  <Badge className="ml-2 bg-primary text-primary-foreground text-xs">
                    Enterprise
                  </Badge>
                </div>
              </Link>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/">
                <Button variant={location === "/" ? "default" : "ghost"} size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant={location === "/dashboard" ? "default" : "ghost"} size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/webhooks">
                <Button variant={location === "/webhooks" ? "default" : "ghost"} size="sm">
                  <Webhook className="h-4 w-4 mr-2" />
                  Webhooks
                </Button>
              </Link>
              <Link href="/blacklist">
                <Button variant={location === "/blacklist" ? "default" : "ghost"} size="sm">
                  <Ban className="h-4 w-4 mr-2" />
                  Blacklist
                </Button>
              </Link>
              <Link href="/activity-logs">
                <Button variant={location === "/activity-logs" ? "default" : "ghost"} size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Activity
                </Button>
              </Link>
              <Link href="/integration">
                <Button variant={location === "/integration" ? "default" : "ghost"} size="sm">
                  <Code className="h-4 w-4 mr-2" />
                  Code
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant={location === "/docs" ? "default" : "ghost"} size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Docs
                </Button>
              </Link>
              
              {/* Owner-specific navigation */}
              {canEditCode && (
                <Link href="/code-editor">
                  <Button variant={location === "/code-editor" ? "default" : "ghost"} size="sm">
                    <Code className="h-4 w-4 mr-2" />
                    Code Editor
                  </Button>
                </Link>
              )}
              
              {canManageUsers && (
                <Link href="/user-management">
                  <Button variant={location === "/user-management" ? "default" : "ghost"} size="sm">
                    <UserCog className="h-4 w-4 mr-2" />
                    Users
                  </Button>
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocation("/")}>
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                    <Users className="h-4 w-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/webhooks")}>
                    <Webhook className="h-4 w-4 mr-2" />
                    Webhooks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/blacklist")}>
                    <Ban className="h-4 w-4 mr-2" />
                    Blacklist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/activity-logs")}>
                    <Activity className="h-4 w-4 mr-2" />
                    Activity Logs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/integration")}>
                    <Code className="h-4 w-4 mr-2" />
                    Integration Examples
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Landing page header for non-authenticated users
  return (
    <header className="bg-background dark:bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <span className="text-xl font-bold text-foreground">Nexx Auth</span>
                <Badge className="ml-2 bg-primary text-primary-foreground text-xs">
                  Enterprise
                </Badge>
              </div>
            </Link>
          </div>
          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              <button 
                onClick={() => scrollToSection('features')}
                className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('docs')}
                className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                <FileText className="h-4 w-4 inline mr-1" />
                Documentation
              </button>
              <button 
                onClick={() => scrollToSection('dashboard')}
                className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                <Users className="h-4 w-4 inline mr-1" />
                Dashboard
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                <DollarSign className="h-4 w-4 inline mr-1" />
                Pricing
              </button>
            </div>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Link href="/firebase-login">
              <Button>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
