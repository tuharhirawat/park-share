import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api from "@/services/api";

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

  const refreshUser = async () => {
    try {
      const response = await api.get("/Auth/Me");
      setUser(response.data);
    }
    catch (err: any) {
      setUser(null);
      throw err;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await refreshUser();
      }
      finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const signOut = async () => {
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
