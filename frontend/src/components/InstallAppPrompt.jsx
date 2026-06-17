import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "./ui";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true
  );
}

export default function InstallDesktopButton() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    function onBeforeInstall(e) {
      e.preventDefault();
      setPrompt(e);
      setHint("");
    }
    function onInstalled() {
      setInstalled(true);
      setPrompt(null);
      setHint("");
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    setHint("");
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setPrompt(null);
      }
      return;
    }
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("edg/")) {
      setHint(
        "Dans Edge : icône « + » ou « … » dans la barre d'adresse → « Installer cette application ».",
      );
    } else if (ua.includes("chrome") && !ua.includes("edg")) {
      setHint(
        "Dans Chrome : icône « Installer » (⊕) à droite de la barre d'adresse, ou menu ⋮ → « Installer EduGestion ».",
      );
    } else if (ua.includes("safari") && !ua.includes("chrome")) {
      setHint(
        "Sur iPhone/iPad : bouton Partager → « Sur l'écran d'accueil ». Sur Mac : Fichier → Ajouter au Dock.",
      );
    } else {
      setHint(
        "Utilisez Chrome ou Edge, puis cherchez « Installer l'application » dans le menu du navigateur.",
      );
    }
  }

  if (installed) return null;

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={install}
      >
        <Download size={18} />
        Installer sur le bureau
      </Button>
      {hint && (
        <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-600">
          {hint}
        </p>
      )}
    </div>
  );
}
