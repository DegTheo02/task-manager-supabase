import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {

  const [permissions, setPermissions] = useState({});
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [loading, setLoading] = useState(true);

  const [team, setTeam] = useState(null);
  const [ownerLabel, setOwnerLabel] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async (session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("permissions, full_name, team, owner_label")
          .eq("id", session.user.id)
          .maybeSingle();

        setPermissions(profile?.permissions || {});
        setFullName(profile?.full_name || null);
        setTeam(profile?.team || null);
        setOwnerLabel(profile?.owner_label || null);

      } else {
        setUser(null);
        setPermissions({});
        setFullName(null);
      }

      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session);
    });

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
   <AuthContext.Provider value={{ user, fullName, permissions, loading, team, ownerLabel }}>
      {children}
    </AuthContext.Provider>
  );
}


export const useAuth = () => useContext(AuthContext);
