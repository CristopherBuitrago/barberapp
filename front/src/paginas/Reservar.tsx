import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, type Barbero, type HoraDisponible, type Servicio } from "../api";
import { almacen } from "../almacen";
import { Marco, Pasos } from "../componentes/Marco";
import { DIAS_CORTOS, MESES, diaSemana, fechaLarga, hora, hoy, precio, sumarDias } from "../formato";

const DIAS_VISIBLES = 14;
const FRANJAS = [
  { nombre: "Mañana", desde: 0, hasta: 12 },
  { nombre: "Tarde", desde: 12, hasta: 17 },
  { nombre: "Noche", desde: 17, hasta: 24 },
];

export function Reservar() {
  const { servicioId } = useParams();
  const [params] = useSearchParams();
  const navegar = useNavigate();

  const [paso, setPaso] = useState(params.get("paso") === "0" ? 0 : 1);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [barberoId, setBarberoId] = useState<number | undefined>();
  const [fecha, setFecha] = useState(hoy());
  const [horas, setHoras] = useState<HoraDisponible[] | null>(null);
  const [elegida, setElegida] = useState<HoraDisponible | null>(null);
  const [proxima, setProxima] = useState<string | null>(null);

  const recordado = almacen.cliente();
  const [nombre, setNombre] = useState(recordado?.nombre ?? "");
  const [telefono, setTelefono] = useState(recordado?.telefono ?? "");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.servicios().then((lista) => setServicio(lista.find((s) => s.id === Number(servicioId)) ?? null));
    api.barberos().then(setBarberos);
  }, [servicioId]);

  // Horas libres del día elegido; si no hay, se busca el próximo día con cupo.
  useEffect(() => {
    if (!servicio) return;
    let vigente = true;
    setHoras(null);
    setElegida(null);
    setProxima(null);
    api.disponibilidad(servicio.id, fecha, barberoId).then(async (lista) => {
      if (!vigente) return;
      setHoras(lista);
      if (lista.length > 0) return;
      for (let i = 1; i <= DIAS_VISIBLES; i++) {
        const otra = sumarDias(fecha, i);
        const libres = await api.disponibilidad(servicio.id, otra, barberoId);
        if (!vigente) return;
        if (libres.length) {
          setProxima(libres[0].inicio);
          return;
        }
      }
    });
    return () => {
      vigente = false;
    };
  }, [servicio, fecha, barberoId]);

  const dias = useMemo(() => Array.from({ length: DIAS_VISIBLES }, (_, i) => sumarDias(hoy(), i)), []);

  if (!servicio) return <Marco compacto><p className="cargando">Cargando…</p></Marco>;

  async function confirmar() {
    if (!elegida || !servicio) return;
    setEnviando(true);
    setError("");
    try {
      const cita = await api.crearCita({
        servicioId: servicio.id,
        barberoId,
        inicio: elegida.inicio,
        cliente: { nombre: nombre.trim(), telefono, aceptaDatos },
      });
      almacen.guardarCliente({ nombre: nombre.trim(), telefono });
      almacen.guardarUltimaCita({ ...cita, telefono });
      navegar("/reserva-confirmada");
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes("disponible")) {
        // Alguien tomó esa hora mientras tanto: volver a elegir con la disponibilidad al día.
        setPaso(1);
        setElegida(null);
        setHoras(null);
        api.disponibilidad(servicio.id, fecha, barberoId).then(setHoras);
      }
    } finally {
      setEnviando(false);
    }
  }

  const nombreBarbero = barberoId
    ? barberos.find((b) => b.id === barberoId)?.nombre
    : elegida?.barberos[0]?.nombre;

  return (
    <Marco compacto>
      <Pasos actual={paso} />

      {paso === 0 && (
        <section className="tarjeta">
          {servicio.imagenUrl ? (
            <img className="servicio-imagen" src={servicio.imagenUrl} alt={servicio.nombre} />
          ) : (
            <div className="servicio-imagen vacia">✂️</div>
          )}
          <div className="servicio-cabeza">
            <h2>{servicio.nombre}</h2>
            <span className="duracion">⏱ {servicio.duracionMin} min</span>
          </div>
          <p className="descripcion">{servicio.descripcion}</p>
          <div className="servicio-pie">
            <span className="precio">{precio(servicio.precio)}</span>
            <button className="boton primario" onClick={() => setPaso(1)}>Siguiente</button>
          </div>
        </section>
      )}

      {paso === 1 && (
        <section className="tarjeta">
          <div className="servicio-cabeza">
            <h2>{servicio.nombre}</h2>
            <span className="precio">{precio(servicio.precio)}</span>
          </div>

          <h3>¿Con quién?</h3>
          <div className="chips">
            <button className={!barberoId ? "chip activo" : "chip"} onClick={() => setBarberoId(undefined)}>
              Cualquiera
            </button>
            {barberos.map((b) => (
              <button key={b.id} className={barberoId === b.id ? "chip activo" : "chip"} onClick={() => setBarberoId(b.id)}>
                {b.nombre}
              </button>
            ))}
          </div>

          <h3>Selecciona fecha · <span className="mes">{MESES[Number(fecha.slice(5, 7)) - 1]}</span></h3>
          <div className="dias">
            {dias.map((d) => (
              <button key={d} className={d === fecha ? "dia activo" : "dia"} onClick={() => setFecha(d)}>
                <span>{DIAS_CORTOS[diaSemana(d)]}</span>
                <strong>{Number(d.slice(8, 10))}</strong>
              </button>
            ))}
          </div>

          <h3>Hora</h3>
          {!horas && <p className="cargando">Buscando horas libres…</p>}
          {horas?.length === 0 && (
            <div className="sin-horas">
              <p>No quedan horas este día.</p>
              {proxima && (
                <button className="boton secundario" onClick={() => setFecha(proxima.slice(0, 10))}>
                  Próxima disponible: {fechaLarga(proxima)}, {hora(proxima)}
                </button>
              )}
            </div>
          )}
          {horas &&
            horas.length > 0 &&
            FRANJAS.map((f) => {
              const enFranja = horas.filter((h) => {
                const hh = Number(h.inicio.slice(11, 13));
                return hh >= f.desde && hh < f.hasta;
              });
              if (enFranja.length === 0) return null;
              return (
                <div key={f.nombre} className="franja">
                  <span className="franja-nombre">{f.nombre}</span>
                  <div className="chips">
                    {enFranja.map((h) => (
                      <button
                        key={h.inicio}
                        className={elegida?.inicio === h.inicio ? "chip activo" : "chip"}
                        onClick={() => setElegida(h)}
                      >
                        {hora(h.inicio)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <button className="boton peligro" onClick={() => (paso === 1 && params.get("paso") === "0" ? setPaso(0) : navegar("/"))}>
              Atrás
            </button>
            <button className="boton primario" disabled={!elegida} onClick={() => setPaso(2)}>
              Siguiente
            </button>
          </div>
        </section>
      )}

      {paso === 2 && elegida && (
        <>
          <section className="tarjeta">
            <div className="servicio-cabeza">
              <h2>Resumen</h2>
              <span className="total">Total {precio(servicio.precio)}</span>
            </div>
            <p className="resumen-linea"><strong>{servicio.nombre}</strong> · {servicio.duracionMin} min</p>
            <p className="resumen-linea">📅 {fechaLarga(elegida.inicio)}, {hora(elegida.inicio)}</p>
            <p className="resumen-linea">💈 {nombreBarbero ?? "El barbero que esté libre"}</p>
            <p className="nota">Si te registraste, el descuento se aplica automáticamente.</p>
          </section>

          <section className="tarjeta">
            <h2>Contacto</h2>
            <label className="campo">
              Nombre
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
            </label>
            <label className="campo">
              Celular (WhatsApp)
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="300 123 4567" />
            </label>
            <label className="casilla">
              <input type="checkbox" checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} />
              Autorizo el tratamiento de mis datos personales para gestionar mis citas (Ley 1581 de 2012).
            </label>
            {error && <p className="error">{error}</p>}
            <div className="acciones">
              <button className="boton peligro" onClick={() => setPaso(1)}>Atrás</button>
              <button
                className="boton exito"
                disabled={enviando || !nombre.trim() || telefono.replace(/\D/g, "").length < 7 || !aceptaDatos}
                onClick={confirmar}
              >
                {enviando ? "Reservando…" : "Confirmar"}
              </button>
            </div>
          </section>
        </>
      )}
    </Marco>
  );
}
