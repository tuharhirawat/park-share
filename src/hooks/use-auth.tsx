import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  isHost: boolean;
  currentStatus: string;
  hasGoogleProvider: boolean;
  hasEmailProvider: boolean;
  canChangeEmail: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => { },
  refreshUser: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const getSupabaseSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const establishBackendSession = async (session: Session) => {
    await api.post("/Auth/EstablishSession", {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
    });
  };

  const refreshUser = async () => {
    const session = await getSupabaseSession();

    if (session) {
      try {
        await establishBackendSession(session);

        const response = await api.get("/Auth/Me");

        setUser(response.data);
        return;
      } catch (error) {
        setUser(null);
        throw error;
      }
    }

    try {
      const response = await api.get("/Auth/Me");
      setUser(response.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await refreshUser();
      } catch (error) {
        console.error("Auth initialization failed:", error);

        await supabase.auth.signOut();

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const signOut = async () => {
    const session = await getSupabaseSession();

    if (session) {
      await supabase.auth.signOut();
    }

    await api.post("/Auth/Logout");

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
