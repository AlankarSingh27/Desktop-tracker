import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AdminProfile } from "../types";
import { login as loginApi, fetchMe } from "../api/endpoints";

interface AuthContextValue {
  admin: AdminProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setAdmin)
      .catch(() => {
        localStorage.removeItem("admin_token");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { token, admin: profile } = await loginApi(email, password);
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_profile", JSON.stringify(profile));
    setAdmin(profile);
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_profile");
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
