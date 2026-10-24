import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTeam, type TeamMember } from "@/entities/barber";
import { useSession } from "@/entities/session";
import { BarberAccountModal, BarberFormModal, setBarberActive } from "@/features/manage-barber";
import { cn } from "@/shared/lib";
import { panelButton, panelText } from "@/shared/ui";
import { PanelLayout, panelControlGroup, panelControls, panelControlsTitle } from "@/widgets/panel-layout";
import { TeamTable } from "@/widgets/team-table";

/** El equipo con sus horarios. Todos lo ven, solo el admin lo cambia. */
export function PanelBarbersPage() {
  const { user, isTeam } = useSession();
  if (!user) return <Navigate to="/perfil" replace state={{ from: "/panel/barberos" }} />;
  if (!isTeam) return <Navigate to="/" replace />;
  return <Team />;
}

/** null es un barbero nuevo */
type OpenModal = { kind: "form"; member: TeamMember | null } | { kind: "account"; member: TeamMember } | null;

function Team() {
  const { isAdmin } = useSession();
  const { data: team, error: loadError, reload } = useTeam();
  const [modal, setModal] = useState<OpenModal>(null);
  const [error, setError] = useState("");

  async function toggleActive(member: TeamMember) {
    if (
      member.active &&
      !confirm(`¿Desactivar a ${member.name}? Ya no saldrá para reservar ni podrá entrar al panel. Sus citas agendadas se quedan como están.`)
    ) {
      return;
    }
    try {
      await setBarberActive(member.id, !member.active);
      setError("");
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function saved() {
    setModal(null);
    reload();
  }

  const shownError = error || loadError;
  return (
    <PanelLayout summary="Barberos">
      <div className={panelControls}>
        <div className={panelControlGroup}>
          <Link className={panelButton("secondary", "md")} to="/panel">‹ Agenda</Link>
          <h2 className={panelControlsTitle}>Barberos</h2>
        </div>
        {isAdmin && (
          <div className={panelControlGroup}>
            <button className={panelButton("primary", "md")} onClick={() => setModal({ kind: "form", member: null })}>+ Barbero</button>
          </div>
        )}
      </div>

      {shownError && <p className={cn(panelText.error, "px-4")}>{shownError}</p>}
      {!team && !shownError && <p className={panelText.loading}>Cargando barberos…</p>}

      {team && (
        <TeamTable
          team={team}
          actions={
            isAdmin
              ? {
                  onEdit: (member) => setModal({ kind: "form", member }),
                  onAccount: (member) => setModal({ kind: "account", member }),
                  onToggleActive: toggleActive,
                }
              : undefined
          }
        />
      )}

      {modal?.kind === "form" && <BarberFormModal member={modal.member} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.kind === "account" && <BarberAccountModal member={modal.member} onClose={() => setModal(null)} onSaved={saved} />}
    </PanelLayout>
  );
}
