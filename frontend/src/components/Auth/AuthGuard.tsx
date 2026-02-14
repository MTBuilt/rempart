import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "../../state/authStore";
import { LoginPage } from "./LoginPage";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { authenticated, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Connexion à Rempart...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    gap: 16,
    color: "#94a3b8",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid #334155",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
