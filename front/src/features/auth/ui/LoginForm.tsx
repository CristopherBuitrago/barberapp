import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/entities/session";
import { cn } from "@/shared/lib";
import { ProfileField, profileCard, profileTitle, siteButton, siteText, siteWideButton } from "@/shared/ui";
import { login } from "../api/authApi";


/** Iniciar sesión con teléfono y contraseña. El equipo entra al panel, los clientes vuelven a donde estaban. */
export function LoginForm() {
  const { start } = useSession();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { from?: string } | null };
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const user = await login(phone, password);
      start(user);
      const team = user.role !== "CLIENTE";
      const from = state?.from;
      // El equipo vuelve al panel y el cliente a donde estaba, nunca al panel
      navigate(team ? (from?.startsWith("/panel") ? from : "/panel") : from && !from.startsWith("/panel") ? from : "/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form className={profileCard} onSubmit={submit}>
      <h1 className={profileTitle}>Inicia sesión o Regístrate</h1>
      <ProfileField
        label="Teléfono"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        placeholder="300 123 4567"
        required
      />
      <ProfileField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error && <p className={siteText.error}>{error}</p>}
      <button className={siteButton("success", { extra: cn(siteWideButton, "mt-5") })} disabled={sending}>
        {sending ? "Entrando…" : "Iniciar Sesión"}
      </button>
      <p className="mx-auto mt-1 mb-0 max-w-[140px] text-center text-[10px] font-bold text-[#534c4c]">
        ¿No tienes una cuenta?{" "}
        <Link className="text-db-step-blue no-underline" to="/perfil/registro" state={state} replace>
          Crea una aquí
        </Link>
      </p>
    </form>
  );
}
