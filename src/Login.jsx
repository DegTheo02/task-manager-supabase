import { useState } from "react";
import { signIn } from "./auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async e => {
    e.preventDefault();
    setError("");

    const { error } = await signIn(email, password);
    if (error) setError(error.message);
  };

  return (
    <div style={container}>
      <h2>Login</h2>

      <form onSubmit={handleLogin} style={form} autoComplete="off">
        <input
          type="email"
          autoComplete="username"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit">Login</button>
      </form>
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
