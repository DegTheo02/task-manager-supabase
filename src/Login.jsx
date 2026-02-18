import { useState } from "react";
import { signIn } from "./auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={logoSection}>
          <div style={logoCircle}>BI</div>
          <h2 style={title}>BI & CVM Task Manager</h2>
          <p style={subtitle}>Enterprise Workflow Platform</p>
        </div>

        <form onSubmit={handleLogin} style={form}>
          <div style={fieldGroup}>
            <label style={label}>Corporate Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={input}
            />
          </div>

          <div style={fieldGroup}>
            <label style={label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={input}
            />
          </div>

          {error && <div style={errorBox}>{error}</div>}

          <button type="submit" style={button} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={footer}>
          Secure access • Role-based permissions • Encrypted session
        </div>
      </div>
    </div>
  );
}



const container = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh"
};

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  width: 280
};

const page = {
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)",
  fontFamily: "Inter, system-ui, sans-serif",
};

const card = {
  background: "#ffffff",
  width: 420,
  padding: "45px 40px",
  borderRadius: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  display: "flex",
  flexDirection: "column",
};

const logoSection = {
  textAlign: "center",
  marginBottom: 30,
};

const logoCircle = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  background: "#1E3A8A",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 12px auto",
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: 1,
};

const title = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  color: "#0F172A",
};

const subtitle = {
  marginTop: 6,
  fontSize: 13,
  color: "#64748B",
};

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const fieldGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const label = {
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
};

const input = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  fontSize: 14,
  outline: "none",
  transition: "border 0.2s ease",
};

const button = {
  marginTop: 10,
  padding: "13px",
  borderRadius: 8,
  border: "none",
  background: "#1E3A8A",
  color: "white",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  letterSpacing: 0.5,
};

const errorBox = {
  background: "#FEE2E2",
  color: "#991B1B",
  padding: "10px 12px",
  borderRadius: 6,
  fontSize: 13,
};

const footer = {
  marginTop: 30,
  fontSize: 11,
  color: "#94A3B8",
  textAlign: "center",
};
