import { useState, type FormEvent } from "react";
import type { AdminService, ServiceFields } from "@/entities/service";
import { resolveImageUrl } from "@/shared/api";
import { cn } from "@/shared/lib";
import { Modal, PanelField, panelButton, panelControl, panelLink, panelText } from "@/shared/ui";
import { createService, updateService, uploadImage } from "../api/serviceAdminApi";

const EMPTY: ServiceFields = { name: "", description: "", durationMin: 30, price: 0, imageUrl: null, active: true };

/** Crear o editar un servicio, con su imagen. Sin servicio es uno nuevo. */
export function ServiceFormModal({
  service,
  onClose,
  onSaved,
}: {
  service: AdminService | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fields, setFields] = useState<ServiceFields>(service ?? EMPTY);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const change = (part: Partial<ServiceFields>) => setFields({ ...fields, ...part });

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      change({ imageUrl: await uploadImage(file) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const { name, description, durationMin, price, imageUrl, active } = fields;
    const data = { name, description, durationMin, price, imageUrl, active };
    try {
      if (service) await updateService(service.id, data);
      else await createService(data);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title={service ? "Editar servicio" : "Nuevo servicio"} onClose={onClose}>
      <form onSubmit={save}>
        <PanelField label="Nombre">
          <input className={panelControl} value={fields.name} onChange={(e) => change({ name: e.target.value })} maxLength={60} required />
        </PanelField>
        <PanelField label="Descripción">
          <textarea
            className={cn(panelControl, "resize-y")}
            value={fields.description}
            onChange={(e) => change({ description: e.target.value })}
            maxLength={300}
            rows={3}
          />
        </PanelField>
        <div className="flex gap-[10px]">
          <PanelField label="Duración (min)">
            <input
              className={panelControl}
              type="number"
              min={5}
              max={480}
              step={5}
              value={fields.durationMin}
              onChange={(e) => change({ durationMin: Number(e.target.value) })}
              required
            />
          </PanelField>
          <PanelField label="Precio (COP)">
            <input
              className={panelControl}
              type="number"
              min={0}
              step={1000}
              value={fields.price}
              onChange={(e) => change({ price: Number(e.target.value) })}
              required
            />
          </PanelField>
        </div>
        <PanelField label="Imagen" as="div">
          {fields.imageUrl && (
            <img className="h-[140px] w-full rounded-[10px] bg-[#f4f4f5] object-cover" src={resolveImageUrl(fields.imageUrl)!} alt="" />
          )}
          <div className="flex gap-[10px]">
            <label className={panelButton("secondary", "lg", "text-center")}>
              {uploading ? "Subiendo…" : fields.imageUrl ? "Cambiar imagen" : "Subir imagen"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={uploading}
                onChange={(e) => pickImage(e.target.files?.[0])}
              />
            </label>
            {fields.imageUrl && (
              <button type="button" className={panelLink} onClick={() => change({ imageUrl: null })}>Quitar</button>
            )}
          </div>
        </PanelField>
        <label className={panelText.checkbox}>
          <input type="checkbox" checked={fields.active} onChange={(e) => change({ active: e.target.checked })} />
          Visible en la web y en WhatsApp
        </label>
        {error && <p className={panelText.error}>{error}</p>}
        <button className={panelButton("primary", "lg", "mt-[18px]", true)} disabled={uploading}>Guardar</button>
      </form>
    </Modal>
  );
}
