import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiPanel, barberia, type Barbero, type Bloqueo, type Cita } from "../api";
import { BotonMenu, BotonPerfil } from "../componentes/Navegacion";
import { useSesion } from "../sesion";
import { DIAS_CORTOS, MESES, diaSemana, hoy, inicioSemana, sumarDias } from "../formato";
import { Calendario } from "./Calendario";
import { DetalleCita } from "./DetalleCita";
import { FormBloqueo } from "./FormBloqueo";
import { FormCita } from "./FormCita";

type Vista = "semana" | "dia";
type Modal = { tipo: "cita"; cita: Cita } | { tipo: "nueva" } | { tipo: "bloqueo" } | null;

/** El panel es solo para barberos y admin: sin sesión del equipo se va a iniciar sesión. */
export function Panel() {
  const { usuario, esEquipo } = useSesion();
  if (!usuario) return <Navigate to="/perfil" replace state={{ desde: "/panel" }} />;
  if (!esEquipo) return <Navigate to="/" replace />;
  return <Agenda />;
}

function Agenda() {
  const api = useMemo(() => apiPanel(), []);
  const angosta = typeof window !== "undefined" && window.innerWidth < 760;
  const [vista, setVista] = useState<Vista>(angosta ? "dia" : "semana");
  const [fecha, setFecha] = useState(hoy());
  const [barberoId, setBarberoId] = useState<number | undefined>();
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState("");

  const dias = useMemo(() => {
    if (vista === "dia") return [fecha];
    const lunes = inicioSemana(fecha);
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  }, [vista, fecha]);

  const cargar = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([
        api.citas(dias[0], dias[dias.length - 1]),
        api.bloqueos(dias[0], dias[dias.length - 1]),
      ]);
      setCitas(c);
      setBloqueos(b);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, dias]);

  useEffect(() => {
    api.barberos().then(setBarberos).catch(() => {});
  }, [api]);

  // Carga al cambiar de rango y refresca cada minuto (citas que entran por WhatsApp o web).
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => clearInterval(t);
  }, [cargar]);

  const visibles = citas.filter(
    (c) => (!barberoId || c.barbero.id === barberoId) && (verCanceladas || c.estado !== "CANCELADA"),
  );
  const bloqueosVisibles = bloqueos.filter((b) => !barberoId || b.barberoId === barberoId);
  const salto = vista === "dia" ? 1 : 7;
  const titulo =
    vista === "dia"
      ? `${DIAS_CORTOS[diaSemana(fecha)]} ${Number(fecha.slice(8, 10))} de ${MESES[Number(fecha.slice(5, 7)) - 1]}`
      : `Semana del ${Number(dias[0].slice(8, 10))} de ${MESES[Number(dias[0].slice(5, 7)) - 1]}`;
  const agendadasHoy = citas.filter((c) => c.inicio.startsWith(hoy()) && c.estado === "AGENDADA").length;

  return (
    <div className="panel">
      <header className="panel-barra">
        <BotonMenu />
        <strong>💈 {barberia.nombre}</strong>
        <span className="panel-resumen">{agendadasHoy} citas pendientes hoy</span>
        <BotonPerfil />
      </header>

      <div className="panel-controles">
        <div className="grupo">
          <button className="boton secundario" onClick={() => setFecha(sumarDias(fecha, -salto))}>‹</button>
          <button className="boton secundario" onClick={() => setFecha(hoy())}>Hoy</button>
          <button className="boton secundario" onClick={() => setFecha(sumarDias(fecha, salto))}>›</button>
          <h2>{titulo}</h2>
        </div>
        <div className="grupo">
          <div className="segmentado">
            <button className={vista === "dia" ? "activo" : ""} onClick={() => setVista("dia")}>Día</button>
            <button className={vista === "semana" ? "activo" : ""} onClick={() => setVista("semana")}>Semana</button>
          </div>
          <select value={barberoId ?? ""} onChange={(e) => setBarberoId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todos los barberos</option>
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
          <label className="casilla en-linea">
            <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} />
            Canceladas
          </label>
          <button className="boton secundario" onClick={() => setModal({ tipo: "bloqueo" })}>⛔ Bloquear</button>
          <button className="boton primario" onClick={() => setModal({ tipo: "nueva" })}>+ Cita</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <Calendario
        dias={dias}
        citas={visibles}
        bloqueos={bloqueosVisibles}
        barberos={barberos}
        onCita={(cita) => setModal({ tipo: "cita", cita })}
        onBloqueo={async (b) => {
          if (confirm(`¿Quitar el bloqueo de ${b.barbero.nombre}${b.motivo ? ` (${b.motivo})` : ""}?`)) {
            await api.borrarBloqueo(b.id);
            cargar();
          }
        }}
      />

      {modal?.tipo === "cita" && (
        <DetalleCita
          cita={modal.cita}
          onCerrar={() => setModal(null)}
          onCambiarEstado={async (estado) => {
            await api.cambiarEstado(modal.cita.id, estado);
            setModal(null);
            cargar();
          }}
        />
      )}
      {modal?.tipo === "nueva" && (
        <FormCita
          api={api}
          barberos={barberos}
          fechaInicial={fecha}
          onCerrar={() => setModal(null)}
          onGuardada={() => {
            setModal(null);
            cargar();
          }}
        />
      )}
      {modal?.tipo === "bloqueo" && (
        <FormBloqueo
          api={api}
          barberos={barberos}
          fechaInicial={fecha}
          onCerrar={() => setModal(null)}
          onGuardado={() => {
            setModal(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
