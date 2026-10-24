import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAdminServices, type AdminService } from "@/entities/service";
import { useSession } from "@/entities/session";
import { ServiceFormModal, updateService } from "@/features/manage-service";
import { cn } from "@/shared/lib";
import { panelButton, panelText } from "@/shared/ui";
import { PanelLayout, panelControlGroup, panelControls, panelControlsTitle } from "@/widgets/panel-layout";
import { ServicesTable } from "@/widgets/services-table";

/** Catálogo de servicios del negocio. Solo el admin lo administra. */
export function PanelServicesPage() {
  const { user, isAdmin } = useSession();
  if (!user) return <Navigate to="/perfil" replace state={{ from: "/panel/servicios" }} />;
  if (!isAdmin) return <Navigate to="/panel" replace />;
  return <ServicesAdmin />;
}

/** null es un servicio nuevo, undefined es que no hay formulario abierto */
type Editing = AdminService | null | undefined;

function ServicesAdmin() {
  const { data: services, error: loadError, reload } = useAdminServices();
  const [editing, setEditing] = useState<Editing>(undefined);
  const [error, setError] = useState("");

  async function toggleVisible(service: AdminService) {
    if (service.active && !confirm(`¿Ocultar "${service.name}"? Dejará de aparecer en la web y en WhatsApp.`)) return;
    try {
      await updateService(service.id, { active: !service.active });
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const shownError = error || loadError;
  return (
    <PanelLayout summary="Servicios">
      <div className={panelControls}>
        <div className={panelControlGroup}>
          <Link className={panelButton("secondary", "md")} to="/panel">‹ Agenda</Link>
          <h2 className={panelControlsTitle}>Servicios</h2>
        </div>
        <div className={panelControlGroup}>
          <button className={panelButton("primary", "md")} onClick={() => setEditing(null)}>+ Servicio</button>
        </div>
      </div>

      {shownError && <p className={cn(panelText.error, "px-4")}>{shownError}</p>}
      {!services && !shownError && <p className={panelText.loading}>Cargando servicios…</p>}

      {services && <ServicesTable services={services} onEdit={setEditing} onToggleVisible={toggleVisible} />}

      {editing !== undefined && (
        <ServiceFormModal
          service={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
    </PanelLayout>
  );
}
