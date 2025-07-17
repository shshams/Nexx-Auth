import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useSimpleAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if user is logged out
    const isLoggedOut = localStorage.getItem('user_logged_out') === 'true';
    if (isLoggedOut) {
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Check if user is logged out
  const isLoggedOut = localStorage.getItem('user_logged_out') === 'true';

  // Fetch user data from our backend
  const { data: backendUser, isLoading: isBackendLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !isLoggedOut, // Only check if not manually logged out
    retry: false, // Don't retry on auth errors
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Determine if user is authenticated
  const isAuthenticated = !isLoggedOut && !!backendUser;

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
      window.location.href = '/simple-login';
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if backend logout fails
      window.location.href = '/simple-login';
    }
  };

  return {
    user: backendUser,
    isLoading: isLoading || (isBackendLoading && !isLoggedOut),
    isAuthenticated,
    logout,
    error
  };
}