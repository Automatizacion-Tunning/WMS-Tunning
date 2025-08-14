import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar si hay un usuario en localStorage al iniciar
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const user = await apiRequest("/api/auth/me");
          setCurrentUser(user);
          setIsAuthenticated(true);
          localStorage.setItem("currentUser", JSON.stringify(user));
        } catch (err) {
          if (err instanceof Error && err.message.startsWith("401")) {
            localStorage.removeItem("currentUser");
            setCurrentUser(null);
            setIsAuthenticated(false);
          } else {
            setError(err instanceof Error ? err.message : String(err));
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem("currentUser", JSON.stringify(user));
    setError(null);
  };

  const logout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // Si hay error, continuar con el logout local
    }
    
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("currentUser");
    setError(null);

    // Recargar la página para limpiar completamente el estado
    window.location.reload();
  };

  return {
    user: currentUser,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
  };
}