import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { onAuthStateChange } from "@/lib/firebase";
import { User } from "firebase/auth";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user: User | null) => {
      console.log("Firebase auth state changed:", user ? "logged in" : "logged out");
      
      // Check if user manually logged out
      const isLoggedOut = localStorage.getItem('user_logged_out') === 'true';
      
      if (isLoggedOut && user) {
        console.log("User manually logged out - ignoring Firebase auth");
        setFirebaseUser(null);
        setIsFirebaseLoading(false);
        return;
      }

      setFirebaseUser(user);
      setIsFirebaseLoading(false);
      
      if (!user) {
        queryClient.clear();
      } else {
        // When Firebase user is authenticated, sync with backend
        syncWithBackend(user);
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  const syncWithBackend = async (firebaseUser: User) => {
    try {
      // Clear logout flag when syncing with backend
      localStorage.removeItem('user_logged_out');
      sessionStorage.removeItem('user_logged_out');
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          display_name: firebaseUser.displayName,
        }),
      });

      if (response.ok) {
        // Invalidate auth query to refetch user data
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    } catch (error) {
      console.error('Backend sync error:', error);
    }
  };

  // Check if user is logged out
  const isLoggedOut = localStorage.getItem('user_logged_out') === 'true';

  // Fetch user data from our backend - try even if Firebase user doesn't exist
  // because backend session might still be valid
  const { data: backendUser, isLoading: isBackendLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !isLoggedOut, // Only check if not manually logged out
    retry: 1,
    staleTime: 0,
    gcTime: 0,
  });

  // User is authenticated if either Firebase user exists OR backend user exists
  const isAuthenticated = (!!firebaseUser || !!backendUser) && !error && !isLoggedOut;
  const isLoading = isFirebaseLoading || (firebaseUser && isBackendLoading);

  return {
    firebaseUser,
    user: backendUser,
    isAuthenticated,
    isLoading,
    error,
  };
}
