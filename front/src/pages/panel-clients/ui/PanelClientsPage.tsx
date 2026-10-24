import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CLIENTS_PER_PAGE, useClients } from "@/entities/client";
import { useSession } from "@/entities/session";
import { cn } from "@/shared/lib";
import { panelButton, panelControl, panelText } from "@/shared/ui";
import { ClientsTable } from "@/widgets/clients-table";
import { PanelLayout, panelControlGroup, panelControls, panelControlsTitle } from "@/widgets/panel-layout";

/** Los clientes de la barbería. Solo el admin los ve. */
export function PanelClientsPage() {
  const { user, isAdmin } = useSession();
  if (!user) return <Navigate to="/perfil" replace state={{ from: "/panel/clientes" }} />;
  if (!isAdmin) return <Navigate to="/panel" replace />;
  return <Clients />;
}

function Clients() {
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading } = useClients(search, page);

  // Se busca cuando deja de escribir un momento, no con cada letra
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [typed]);

  const pages = data ? Math.max(1, Math.ceil(data.total / CLIENTS_PER_PAGE)) : 1;
  return (
    <PanelLayout summary="Clientes">
      <div className={panelControls}>
        <div className={panelControlGroup}>
          <Link className={panelButton("secondary", "md")} to="/panel">‹ Agenda</Link>
          <h2 className={panelControlsTitle}>Clientes</h2>
          {data && <span className="text-[0.85rem] text-muted">{data.total}</span>}
        </div>
        <div className={panelControlGroup}>
          <input
            className={cn(panelControl, "w-[260px] max-w-full py-2")}
            type="search"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar cliente"
          />
        </div>
      </div>

      {error && <p className={cn(panelText.error, "px-4")}>{error}</p>}
      {!data && !error && <p className={panelText.loading}>Cargando clientes…</p>}
      {data && data.items.length === 0 && (
        <p className={panelText.loading}>{search ? `Nadie coincide con "${search}"` : "Todavía no hay clientes"}</p>
      )}
      {data && data.items.length > 0 && <ClientsTable clients={data.items} />}

      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 pb-6 text-[0.85rem]">
          <button className={panelButton("secondary", "sm")} disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            ‹ Anterior
          </button>
          <span>
            Página {page} de {pages}
          </span>
          <button className={panelButton("secondary", "sm")} disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>
            Siguiente ›
          </button>
        </div>
      )}
    </PanelLayout>
  );
}
