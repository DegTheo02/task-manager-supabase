import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async (session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .maybeSingle();

        setRole(profile?.role || "user");
        setFullName(profile?.full_name || null);
      } else {
        setUser(null);
        setRole(null);
        setFullName(null);
      }

      setLoading(false);
    };

    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session);
    });

    // Listen to login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUser(session);
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
