import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [fullName, setFullName] = useState(null);   // ✅ NEW
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);

        const { data, error } = await supabase
          .from("profiles")
          .select("role, full_name")   // ✅ FETCH BOTH
          .eq("id", session.user.id)
          .maybeSingle();

        if (data) {
          setRole(data.role);
          setFullName(data.full_name);
        }
      }

      setLoading(false);
    };

    getSession();

    // 🔄 Optional: listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);

          const { data } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", session.user.id)
            .maybeSingle();

          setRole(data?.role || null);
          setFullName(data?.full_name || null);
        } else {
          setUser(null);
          setRole(null);
          setFullName(null);
        }

        setLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, fullName, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
