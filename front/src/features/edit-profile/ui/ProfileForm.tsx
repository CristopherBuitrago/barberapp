import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/entities/session";
import { cn, localPhone } from "@/shared/lib";
import { ProfileField, profileCard, profileTitle, siteButton, siteText, siteWideButton } from "@/shared/ui";
import { updateProfile } from "../api/updateProfile";

/** Los datos de la cuenta. El teléfono no se cambia porque es con lo que se inicia sesión. */
export function ProfileForm({ onBack }: { onBack: () => void }) {
  const { user, isTeam, update, end } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState(user!.name);
  const [birthDate, setBirthDate] = useState(user!.birthDate ?? "");
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const [error, setError] = useState("");

  const changed = name.trim() !== user!.name || (!isTeam && birthDate !== (user!.birthDate ?? ""));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!changed) return;
    setStatus("saving");
    setError("");
    try {
      update(await updateProfile(isTeam ? { name: name.trim() } : { name: name.trim(), birthDate: birthDate || null }));
      setStatus("saved");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
  }

  const wide = cn(siteWideButton, "mt-0");

  return (
    <form className={profileCard} onSubmit={submit}>
      <h1 className={profileTitle}>Datos de tu perfil</h1>
      <ProfileField
        label="Nombres"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setStatus("");
        }}
        autoComplete="name"
        required
      />
      <ProfileField label="Teléfono" value={localPhone(user!.phone)} readOnly />
      {!isTeam && (
        <ProfileField
          label="Fecha de nacimiento"
          type="date"
          value={birthDate}
          onChange={(e) => {
            setBirthDate(e.target.value);
            setStatus("");
          }}
        />
      )}
      {error && <p className={siteText.error}>{error}</p>}
      <div className="mt-5 flex flex-col gap-3">
        <button className={siteButton("success", { extra: wide })} disabled={status === "saving"}>
          {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado ✓" : "Guardar"}
        </button>
        <button
          type="button"
          className={siteButton("danger", { extra: wide })}
          onClick={() => {
            end();
            navigate("/");
          }}
        >
          Cerrar Sesión
        </button>
        <button type="button" className={siteButton("primary", { extra: wide })} onClick={onBack}>
          {isTeam ? "Volver al panel" : "Volver al catálogo"}
        </button>
      </div>
    </form>
  );
}
