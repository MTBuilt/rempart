import { useState, type FormEvent } from "react";
import { useAuthStore } from "../../state/authStore";
import { Shield } from "lucide-react";

export function LoginPage() {
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuthStore();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      login(password);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.iconWrap}>
          <Shield size={48} color="#3b82f6" />
        </div>
        <h1 style={styles.title}>Rempart</h1>
        <p style={styles.subtitle}>nftables Configuration</p>

        {error && <div style={styles.error}>{error}</div>}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={styles.input}
          autoFocus
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Connecting..." : "Login"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#0f172a",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: 40,
    background: "#1e293b",
    borderRadius: 12,
    border: "1px solid #334155",
    minWidth: 360,
  },
  iconWrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#f1f5f9",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  error: {
    background: "#7f1d1d",
    color: "#fca5a5",
    padding: "8px 16px",
    borderRadius: 6,
    fontSize: 14,
    width: "100%",
    textAlign: "center" as const,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 16,
    background: "#0f172a",
    border: "1px solid #475569",
    borderRadius: 6,
    color: "#e2e8f0",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 16,
    fontWeight: 600,
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
