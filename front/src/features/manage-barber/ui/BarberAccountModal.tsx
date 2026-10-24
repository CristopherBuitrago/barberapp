import { useState, type FormEvent } from "react";
import type { TeamMember } from "@/entities/barber";
import { localPhone } from "@/shared/lib";
import { Modal, PanelField, panelButton, panelControl, panelText } from "@/shared/ui";
import { giveBarberAccount } from "../api/barberAdminApi";

const MIN_PASSWORD = 6;

/** Darle cuenta del panel a un barbero, o cambiarle la contraseña si ya tenía. */
export function BarberAccountModal({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await giveBarberAccount(member.id, password);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={member.hasAccount ? "Cambiar contraseña" : "Dar cuenta del panel"} onClose={onClose}>
      {member.phone ? (
        <form onSubmit={save}>
          <p className="mt-2 text-[0.85rem] text-muted">
            {member.name} entra al panel con su teléfono <strong>{localPhone(member.phone)}</strong> y esta contraseña. Puede ver la
            agenda, agendar citas y bloquear horas, pero no cambiar servicios, barberos ni ver los clientes.
          </p>
          <PanelField label="Contraseña">
            <input
              className={panelControl}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              required
            />
          </PanelField>
          {error && <p className={panelText.error}>{error}</p>}
          <button className={panelButton("primary", "lg", "mt-[18px]", true)} disabled={saving || password.length < MIN_PASSWORD}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </form>
      ) : (
        <p className="mt-2 text-[0.85rem] text-muted">
          Primero ponle un teléfono con Editar, porque es con lo que va a entrar al panel.
        </p>
      )}
    </Modal>
  );
}
