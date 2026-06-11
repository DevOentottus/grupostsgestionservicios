import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { authApi } from "@/api/client.js";

interface AuthUser {
  id: number;
  username: string;
  nombres: string;
  email: string;
  rol: string;
  activo: boolean;
  area_id: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("auth_token")
  );

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await authApi.login(username, password);
    sessionStorage.setItem("auth_token", data.data.token);
    sessionStorage.setItem("auth_user", JSON.stringify(data.data.user));
    setToken(data.data.token);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
