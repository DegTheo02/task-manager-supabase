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
  const [role, setRole] = useState(null);  

  useEffect(() => {
    let mounted = true;

    const loadUser = async (session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("permissions, full_name, team, owner_label, role")
          .eq("id", session.user.id)
          .maybeSingle();

        setPermissions(profile?.permissions || {});
        setFullName(profile?.full_name || null);
        setTeam(profile?.team || null);
        setOwnerLabel(profile?.owner_label || null);
        setRole(profile?.role || null); 

      } else {
        setUser(null);
        setPermissions({});
        setFullName(null);
        setRole(null);
      }

      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session);
    });

const { data: listener } = supabase.auth.onAuthStateChange(
  (event, session) => {

    if (event === "SIGNED_IN" && session?.user) {
      // Fire and forget (do NOT await)
      supabase
        .from("profiles")
        .update({ last_login_at: new Date() })
        .eq("id", session.user.id);
        .select()
        .then(res => console.log("Login update result:", res));
    }

    loadUser(session);
  }
);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
  if (!user) return;

  const interval = setInterval(async () => {
    await supabase
      .from("profiles")
      .update({ last_active_at: new Date() })
      .eq("id", user.id);
  }, 300000); // 5 minutes

  return () => clearInterval(interval);
}, [user]);

  return (
   <AuthContext.Provider value={{ user, fullName, permissions, loading, team, ownerLabel, role }}>
      {children}
    </AuthContext.Provider>
  );
}


export const useAuth = () => useContext(AuthContext);
