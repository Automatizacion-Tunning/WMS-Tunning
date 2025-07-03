import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si hay un usuario en localStorage al iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem("currentUser");
      }
    }
    setIsLoading(false);
  }, []);

  // Verificar la sesión con el servidor
  const { data: sessionUser, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (sessionUser) {
      setCurrentUser(sessionUser);
      localStorage.setItem("currentUser", JSON.stringify(sessionUser));
    }
  }, [sessionUser]);

  const login = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem("currentUser", JSON.stringify(user));
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
    
    // Recargar la página para limpiar completamente el estado
    window.location.reload();
  };

  return {
    user: currentUser,
    isAuthenticated,
    isLoading: isLoading || sessionLoading,
    login,
    logout,
  };
}