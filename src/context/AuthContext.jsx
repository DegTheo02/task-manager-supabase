import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [fullName, setFullName] = useState(null);   // ✅ NEW
  const [loading, setLoading] = useState(true);


  useEffect(() => {
  let mounted = true;

  const initialize = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    if (!mounted) return;

    if (session?.user) {
      setUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      setRole(profile?.role || null);
      setFullName(profile?.full_name || null);
    } else {
      setUser(null);
      setRole(null);
      setFullName(null);
    }

    setLoading(false);   // ✅ GUARANTEED
  };

  initialize();

  const { data: listener } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .maybeSingle();

        setRole(profile?.role || null);
        setFullName(profile?.full_name || null);
      } else {
        setUser(null);
        setRole(null);
        setFullName(null);
      }

      setLoading(false);   // ✅ GUARANTEED
    }
  );

  return () => {
    mounted = false;
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
