import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CalendarCheck2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  MessagesSquare,
  Phone,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { Button, Card, Input } from "../components/ui";
import { purgeInvalidAuthSession } from "../utils/authToken";
import { APP_NAME, APP_TAGLINE_PLATFORM } from "../utils/brand";

// Points clés mis en avant sur le panneau de marque. Pas un parcours à étapes :
// trois bénéfices indépendants, donc pas de numérotation.
const VALUE_PROPS = [
  {
    icon: CalendarCheck2,
    label: "Présences et notes en temps réel",
  },
  {
    icon: MessagesSquare,
    label: "Communication directe avec les parents",
  },
  {
    icon: BadgeCheck,
    label: "Bulletins générés en un clic",
  },
];

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
      className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      data-testid="login-page"
    >
      {/* Panneau de marque — visible à partir de lg, masqué en mobile */}
      <section
        className="relative hidden overflow-hidden bg-[#101F3C] lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16"
        aria-hidden="true"
      >
        {/* Texture "carnet à lignes" en fond, très discrète */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent 27px, #E8C579 27px, #E8C579 28px)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#E8C579]/10 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8C579]/40 bg-[#E8C579]/10 text-[#F3D68A]">
              <GraduationCap size={22} />
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F3D68A]/90">
              {APP_NAME}
            </span>
          </div>

          <h1 className="mt-16 max-w-md font-serif text-4xl leading-[1.15] text-white lg:text-[2.6rem]">
            La gestion scolaire,{" "}
            <span className="text-[#F3D68A]">enfin claire.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-slate-300">
            {APP_TAGLINE_PLATFORM} Un seul espace pour piloter la vie de
            l'établissement, du secrétariat aux familles.
          </p>
        </div>

        <ul className="relative space-y-4">
          {VALUE_PROPS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[#F3D68A]">
                <Icon size={16} />
              </span>
              <span className="text-sm text-slate-200">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Panneau de connexion */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <header className="mb-8 text-center lg:hidden">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#101F3C]/10 bg-[#101F3C] text-[#F3D68A] shadow-sm">
              <GraduationCap size={26} />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              {APP_NAME}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {APP_TAGLINE_PLATFORM}
            </p>
          </header>

          <div className="mb-7 hidden text-center lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Espace établissement
            </p>
            <h2 className="mt-2 font-serif text-2xl text-slate-950">
              Connexion à votre compte
            </h2>
          </div>

          <Card className="border-slate-100 p-6 shadow-lg shadow-slate-900/5 sm:p-8">
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
                    className="pl-10 focus-visible:ring-[#101F3C]"
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
                    className="pl-10 pr-11 focus-visible:ring-[#101F3C]"
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
                className="w-full bg-[#101F3C] text-white hover:bg-[#18305c] focus-visible:ring-[#101F3C]"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            Gestion scolaire simplifiée pour votre établissement.
          </p>
        </div>
      </section>
    </main>
  );
}