import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { rememberedContact, useSession } from "@/entities/session";
import { cn } from "@/shared/lib";
import {
  ProfileField,
  ResultBox,
  profileCard,
  profileTitle,
  resultText,
  siteActions,
  siteButton,
  siteStepCard,
  siteText,
  siteWideButton,
} from "@/shared/ui";
import { register } from "../api/authApi";


/** Crear cuenta de cliente. Al terminar muestra la bienvenida con su descuento. */
export function RegisterForm() {
  const { start } = useSession();
  const remembered = rememberedContact.read();
  const [name, setName] = useState(remembered?.name ?? "");
  const [phone, setPhone] = useState(remembered?.phone ?? "");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [acceptsDataPolicy, setAcceptsDataPolicy] = useState(false);
  const [sending, setSending] = useState(false);
  const [welcome, setWelcome] = useState<{ name: string; discountPct: number } | null>(null);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const result = await register({ name: name.trim(), phone, password, birthDate: birthDate || undefined });
      rememberedContact.save({ name: name.trim(), phone });
      setWelcome({ name: result.user.name, discountPct: result.welcomeDiscountPct });
      start(result.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (welcome) {
    return (
      <section className={siteStepCard}>
        <ResultBox title={`¡Bienvenido, ${welcome.name.split(" ")[0]}!`}>
          <p className={resultText}>
            {welcome.discountPct > 0
              ? `Tu ${welcome.discountPct}% de descuento se aplica en tu próxima reserva, por la web o por WhatsApp.`
              : "Tu cuenta quedó lista. ¡Gracias por volver!"}
          </p>
        </ResultBox>
        <div className={cn(siteActions, "justify-center")}>
          <Link to="/" className={siteButton("primary")}>Reservar ahora</Link>
        </div>
      </section>
    );
  }

  return (
    <form className={profileCard} onSubmit={submit}>
      <h1 className={profileTitle}>Estás a punto de unirte a la Recocha</h1>
      <ProfileField label="Nombres" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
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
        autoComplete="new-password"
        minLength={6}
        required
      />
      <ProfileField label="Fecha de nacimiento" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      <label className={cn(siteText.checkbox, "mt-[6px]!")}>
        <input type="checkbox" checked={acceptsDataPolicy} onChange={(e) => setAcceptsDataPolicy(e.target.checked)} />
        Autorizo el tratamiento de mis datos personales para gestionar mis citas y recibir promociones (Ley 1581 de 2012).
      </label>
      {error && <p className={siteText.error}>{error}</p>}
      <button className={siteButton("success", { extra: cn(siteWideButton, "mt-5") })} disabled={!acceptsDataPolicy || sending}>
        {sending ? "Creando…" : "Crear Cuenta"}
      </button>
    </form>
  );
}
