import { useEffect, useState } from "react";
import { Eye, EyeOff, GraduationCap, Lock, Phone } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { Button, Card, Input } from "../components/ui";

function clearDemoSession() {
  const token = localStorage.getItem("access_token") || "";
  if (token.startsWith("demo-")) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedSchool");
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearDemoSession();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError("Veuillez renseigner le telephone et le mot de passe.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || "Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <GraduationCap size={28} />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-950">
            EduGestion
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Connectez-vous a votre espace de gestion scolaire.
          </p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Telephone
              </span>
              <span className="relative block">
                <Phone
                  className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
                  size={18}
                />
                <Input
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: 699112233"
                  autoComplete="username"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Mot de passe
              </span>
              <span className="relative block">
                <Lock
                  className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
                  size={18}
                />
                <Input
                  className="pl-10 pr-10"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <Button className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
