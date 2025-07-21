import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSimpleAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Quick initialization check
    const checkAuth = async () => {
      const isLoggedOut = localStorage.getItem('user_logged_out') === 'true';
      
      if (isLoggedOut) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check if user has valid session
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Don't use continuous polling - only check on mount and after login

  // Logout function
  const logout = async () => {
    try {
      // Set logout flag immediately
      localStorage.setItem('user_logged_out', 'true');
      sessionStorage.setItem('user_logged_out', 'true');
      
      // Clear account info
      localStorage.removeItem('account_id');
      localStorage.removeItem('account_email');
      localStorage.removeItem('simple_username');
      
      // Clear query cache
      queryClient.clear();
      
      // Call backend logout
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if backend logout fails
      window.location.href = '/login';
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    logout
  };
}