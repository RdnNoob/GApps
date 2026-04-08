import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister, setToken, User } from "@/api/geonode";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (kode: string, password: string) => Promise<void>;
  register: (nama: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem("gl_token");
        if (savedToken) {
          setToken(savedToken);
          setTokenState(savedToken);
          const me = await getMe();
          setUser(me);
        }
      } catch {
        await AsyncStorage.removeItem("gl_token");
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (kode: string, password: string) => {
    const res = await apiLogin(kode, password);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    await AsyncStorage.setItem("gl_token", res.token);
    await AsyncStorage.setItem("gl_user", JSON.stringify(res.user));
  };

  const register = async (nama: string, email: string, password: string) => {
    const res = await apiRegister(nama, email, password);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    await AsyncStorage.setItem("gl_token", res.token);
    await AsyncStorage.setItem("gl_user", JSON.stringify(res.user));
  };

  const logout = async () => {
    try { await apiLogout(); } catch {}
    setToken(null);
    setTokenState(null);
    setUser(null);
    await AsyncStorage.removeItem("gl_token");
    await AsyncStorage.removeItem("gl_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
