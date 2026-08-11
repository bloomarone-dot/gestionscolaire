import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Lock, Phone } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { Button, Card, Input } from "../components/ui";
import { purgeInvalidAuthSession } from "../utils/authToken";
import { APP_NAME, APP_TAGLINE_PLATFORM } from "../utils/brand";

export default function LoginPage() {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    purgeInvalidAuthSession();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError("Veuillez renseigner le téléphone et le mot de passe.");
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
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10 sm:px-6"
      data-testid="login-page"
    >
      <div className="w-full max-w-sm sm:max-w-md">
        <header className="mb-8 text-center">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/25"
            aria-hidden
          >
            <GraduationCap size={28} />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {APP_TAGLINE_PLATFORM}
          </p>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
            Un espace de gestion pensé pour chaque établissement.
          </p>
        </header>

        <Card className="p-6 sm:p-8">
          {sessionExpired && (
            <div
              className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"
              role="status"
            >
              Votre session a expiré ou le serveur a redémarré. Reconnectez-vous.
            </div>
          )}
          {error && (
            <div
              className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
              role="alert"
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Téléphone
              </span>
              <span className="relative block">
                <Phone
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                  aria-hidden
                />
                <Input
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="6XXXXXXXX"
                  autoComplete="username"
                  inputMode="tel"
                  autoFocus
                  aria-required="true"
                  data-testid="login-phone"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Mot de passe
              </span>
              <span className="relative block">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                  aria-hidden
                />
                <Input
                  className="pl-10 pr-11"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-required="true"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  data-testid="login-toggle-password"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <Button
              className="w-full"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          Gestion scolaire simplifiée
          <br className="sm:hidden" />
          {" "}pour votre établissement.
        </p>
      </div>
    </main>
  );
}
