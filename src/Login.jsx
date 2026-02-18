import { useState } from "react";
import { useEffect } from "react";
import { signIn } from "./auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(
  localStorage.getItem("rememberEmail") === "true"
);

  useEffect(() => {
  const savedEmail = localStorage.getItem("savedEmail");
  if (savedEmail) setEmail(savedEmail);
}, []);

const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  if (remember) {
    localStorage.setItem("savedEmail", email);
    localStorage.setItem("rememberEmail", "true");
  } else {
    localStorage.removeItem("savedEmail");
    localStorage.removeItem("rememberEmail");
  }

  const { error } = await signIn(email, password);

  if (error) {
    setError(error.message);
    setLoading(false);
  }
};


  return (
    <div style={page}>
      
      {/* LEFT PANEL */}
      <div style={leftPanel}>
        <div style={animatedBg}></div>
        <div style={brandingContent}>
          <img
            src="/logo.png"   // 🔥 Put your logo file in /public folder
            alt="Company Logo"
            style={logo}
          />

          <h1 style={headline}>
            BI & CVM EXECUTION MANAGER
          </h1>

          <p style={description}>
            Enterprise workflow platform designed to manage operational
            execution, track KPIs, and ensure SLA compliance across teams.
          </p>

          <div style={featureList}>
            <div>✔ Role-based access control</div>
            <div>✔ Real-time performance monitoring</div>
            <div>✔ Secure & encrypted sessions</div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={rightPanel}>
        <div style={card}>
          <h2 style={loginTitle}>Secure Login</h2>

          <form onSubmit={handleLogin} style={form}>
            <div style={fieldGroup}>
              <label style={label}>Corporate Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => e.target.style.border = "1px solid #1E3A8A"}
              onBlur={(e) => e.target.style.border = "1px solid #CBD5E1"}
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

            <div style={rememberRow}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
          </div>

            
            {error && <div style={errorBox}>{error}</div>}

          <button
            type="submit"
            style={button}
            disabled={loading}
            onMouseEnter={(e) => !loading && (e.target.style.background = "#1D4ED8")}
            onMouseLeave={(e) => !loading && (e.target.style.background = "#1E3A8A")}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          </form>

          <div style={footer}>
            © {new Date().getFullYear()} BI & CVM • All rights reserved
          </div>
        </div>
      </div>
    </div>
  );
}


const rememberRow = {
  fontSize: 13,
  color: "#475569",
};


const container = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh"
};

const page = {
  display: "flex",
  height: "100vh",
  fontFamily: "Inter, system-ui, sans-serif",
  flexWrap: "wrap",
};


const leftPanel = {
  flex: 1,
  minWidth: "400px",
  position: "relative",
  overflow: "hidden",
  background: "linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 60,
};


const brandingContent = {
  maxWidth: 420,
};

const logo = {
  width: 140,
  marginBottom: 30,
};

const headline = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 20,
};

const description = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#CBD5E1",
  marginBottom: 30,
};

const featureList = {
  fontSize: 14,
  lineHeight: 1.8,
  color: "#E2E8F0",
};

const rightPanel = {
  flex: 1,
  minWidth: "400px",
  background: "#F8FAFC",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const card = {
  width: 380,
  background: "white",
  padding: "40px 35px",
  borderRadius: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
  display: "flex",
  flexDirection: "column",
};

const loginTitle = {
  marginBottom: 25,
  fontSize: 20,
  fontWeight: 700,
  color: "#0F172A",
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
  transition: "all 0.2s ease",
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
  transition: "all 0.2s ease",
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

const animatedBg = {
  position: "absolute",
  top: "-150px",
  left: "-150px",
  width: "700px",
  height: "700px",
  background:
    "radial-gradient(circle at center, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0) 70%)",
  animation: "float 12s ease-in-out infinite",
  filter: "blur(60px)",
};



