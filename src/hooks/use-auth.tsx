import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  isHost: boolean;
  currentStatus: string;
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

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      try {
        const response = await api.post("/GoogleAuth/GetGoogleUser", {
          accessToken: session.access_token
        });

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
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const response = await api.post("/GoogleAuth/GetGoogleUser", {
            accessToken: session.access_token
          });

          setUser(response.data);
        } else {
          await refreshUser();
        }
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
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      await supabase.auth.signOut();
    } else {
      await api.post("/Auth/Logout");
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
