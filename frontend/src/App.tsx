import { AuthGuard } from "./components/Auth/AuthGuard";
import { AppShell } from "./components/Layout/AppShell";

export function App() {
  return (
    <AuthGuard>
      <AppShell />
    </AuthGuard>
  );
}
