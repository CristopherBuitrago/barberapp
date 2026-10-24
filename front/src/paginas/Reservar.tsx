import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, urlImagen, type Barbero, type HoraDisponible, type Servicio } from "../api";
import { almacen } from "../almacen";
import { esActiva, useCitaGuardada } from "../citaGuardada";
import { useSesion } from "../sesion";
import { Duracion, Marco, Pasos, Precio } from "../componentes/Marco";
import { DIAS_CORTOS, MESES, diaSemana, fechaLarga, hora, hora24, horaCompacta, hoy, inicioSemana, sumarDias, telefonoLocal } from "../formato";
import flechaIzq from "../assets/figma/flecha-izq.svg";
import flechaDer from "../assets/figma/flecha-der.svg";

/** La barbería atiende de lunes a sábado: la semana del calendario muestra esos 6 días. */
const DIAS_SEMANA = 6;
const DIAS_BUSQUEDA = 14;
const FRANJAS = [
  { nombre: "Mañana", desde: 0, hasta: 12 },
  { nombre: "Tarde", desde: 12, hasta: 17 },
  { nombre: "Noche", desde: 17, hasta: 24 },
];

/** Primer día que se puede reservar: hoy, o el lunes si hoy es domingo. */
function primerDiaReservable(): string {
  return diaSemana(hoy()) === 0 ? sumarDias(hoy(), 1) : hoy();
}

export function Reservar() {
  const { servicioId } = useParams();
  const [params] = useSearchParams();
  const navegar = useNavigate();

  const [paso, setPaso] = useState(params.get("paso") === "0" ? 0 : 1);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [barberoId, setBarberoId] = useState<number | undefined>();
  const [fecha, setFecha] = useState(primerDiaReservable());
  const [semana, setSemana] = useState(inicioSemana(primerDiaReservable()));
  const [horas, setHoras] = useState<HoraDisponible[] | null>(null);
  const [franja, setFranja] = useState<string | null>(null);
  const [elegida, setElegida] = useState<HoraDisponible | null>(null);
  const [proxima, setProxima] = useState<string | null>(null);

  // Con cuenta de cliente la cita va a su nombre y teléfono (el back los toma de la sesión).
  const { usuario } = useSesion();
  const conCuenta = usuario?.rol === "CLIENTE";
  const recordado = conCuenta && usuario ? { nombre: usuario.nombre, telefono: telefonoLocal(usuario.telefono) } : almacen.cliente();
  const [nombre, setNombre] = useState(recordado?.nombre ?? "");
  const [telefono, setTelefono] = useState(recordado?.telefono ?? "");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // Con una cita activa no se puede reservar otra: de vuelta al catálogo, donde se ve la agendada.
  const { cita: citaGuardada } = useCitaGuardada();
  useEffect(() => {
    if (esActiva(citaGuardada)) navegar("/", { replace: true });
  }, [citaGuardada, navegar]);

  useEffect(() => {
    api.servicios().then((lista) => setServicio(lista.find((s) => s.id === Number(servicioId)) ?? null));
    api.barberos().then(setBarberos);
  }, [servicioId]);

  // Horas libres del día elegido; si no hay, se busca el próximo día con cupo.
  useEffect(() => {
    if (!servicio) return;
    let vigente = true;
    setHoras(null);
    setFranja(null);
    setElegida(null);
    setProxima(null);
    api.disponibilidad(servicio.id, fecha, barberoId).then(async (lista) => {
      if (!vigente) return;
      setHoras(lista);
      if (lista.length > 0) return;
      for (let i = 1; i <= DIAS_BUSQUEDA; i++) {
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

  if (!servicio) return <Marco><p className="cargando">Cargando…</p></Marco>;

  function irAFecha(nueva: string) {
    setFecha(nueva);
    setSemana(inicioSemana(nueva));
  }

  function moverSemana(dias: number) {
    const lunes = sumarDias(semana, dias);
    setSemana(lunes);
    setFecha(lunes < primerDiaReservable() ? primerDiaReservable() : lunes);
  }

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
        setFranja(null);
        setElegida(null);
        setHoras(null);
        api.disponibilidad(servicio.id, fecha, barberoId).then(setHoras);
      }
    } finally {
      setEnviando(false);
    }
  }

  const dias = Array.from({ length: DIAS_SEMANA }, (_, i) => sumarDias(semana, i));
  const horasDe = (f: (typeof FRANJAS)[number]) =>
    (horas ?? []).filter((h) => {
      const hh = Number(h.inicio.slice(11, 13));
      return hh >= f.desde && hh < f.hasta;
    });
  const abierta = FRANJAS.find((f) => f.nombre === franja);

  const nombreBarbero = barberoId
    ? barberos.find((b) => b.id === barberoId)?.nombre
    : elegida?.barberos[0]?.nombre;

  return (
    <Marco>
      <section className="tarjeta paso">
        <Pasos actual={paso} />

        {paso === 0 && (
          <div className="paso-cuerpo">
            <div className="servicio-cabeza">
              <h2>{servicio.nombre}</h2>
              <Duracion minutos={servicio.duracionMin} />
            </div>
            {servicio.imagenUrl ? (
              <img className="servicio-imagen" src={urlImagen(servicio.imagenUrl)!} alt={servicio.nombre} />
            ) : (
              <div className="servicio-imagen" />
            )}
            <p className="descripcion">{servicio.descripcion}</p>
            <div className="a-la-derecha"><Precio valor={servicio.precio} /></div>
            <div className="acciones">
              <span />
              <button className="boton primario" onClick={() => setPaso(1)}>Siguiente</button>
            </div>
          </div>
        )}

        {paso === 1 && (
          <>
            <div className="recuadro">
              <div className="recuadro-cuerpo">
                <div className="servicio-cabeza">
                  <h2>{servicio.nombre}</h2>
                  <Duracion minutos={servicio.duracionMin} />
                </div>
                <p className="descripcion">{servicio.descripcion}</p>
                <div className="a-la-derecha"><Precio valor={servicio.precio} /></div>
              </div>
            </div>

            {barberos.length > 1 && (
              <>
                <h3>Barbero</h3>
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
              </>
            )}

            <h3>Seleccionar fecha</h3>
            <p className="mes">
              {MESES[Number(fecha.slice(5, 7)) - 1]} {fecha.slice(0, 4)}
            </p>
            <div className="semana">
              <button
                className="flecha"
                aria-label="Semana anterior"
                disabled={semana <= inicioSemana(primerDiaReservable())}
                onClick={() => moverSemana(-7)}
              >
                <img src={flechaIzq} alt="" width={20} height={20} />
              </button>
              {dias.map((d) => (
                <button
                  key={d}
                  className={d === fecha ? "dia activo" : "dia"}
                  disabled={d < primerDiaReservable()}
                  aria-label={fechaLarga(d)}
                  aria-pressed={d === fecha}
                  onClick={() => setFecha(d)}
                >
                  <span>{DIAS_CORTOS[diaSemana(d)]}</span>
                  <span>{Number(d.slice(8, 10))}</span>
                </button>
              ))}
              <button className="flecha" aria-label="Semana siguiente" onClick={() => moverSemana(7)}>
                <img src={flechaDer} alt="" width={20} height={20} />
              </button>
            </div>

            {!horas && <p className="cargando">Buscando horas libres…</p>}
            {horas?.length === 0 && (
              <div className="sin-horas">
                <p>No quedan horas este día.</p>
                {proxima && (
                  <button className="enlace" onClick={() => irAFecha(proxima.slice(0, 10))}>
                    Próxima disponible: {fechaLarga(proxima)}, {hora(proxima)}
                  </button>
                )}
              </div>
            )}
            {horas && horas.length > 0 && (
              <>
                <div className="franjas">
                  {FRANJAS.map((f) => {
                    const libres = horasDe(f);
                    const conHora = elegida && libres.some((h) => h.inicio === elegida.inicio);
                    return (
                      <div key={f.nombre} className="franja">
                        <button
                          className={franja === f.nombre ? "boton primario abierta" : "boton primario"}
                          disabled={libres.length === 0}
                          aria-expanded={franja === f.nombre}
                          onClick={() => setFranja(franja === f.nombre ? null : f.nombre)}
                        >
                          {conHora ? hora24(elegida.inicio) : f.nombre}
                        </button>
                        {libres.length === 0 && <span className="franja-vacia">No hay horarios disponibles para esta jornada</span>}
                      </div>
                    );
                  })}
                </div>
                {abierta && (
                  <div className="chips horas">
                    {horasDe(abierta).map((h) => (
                      <button
                        key={h.inicio}
                        className={elegida?.inicio === h.inicio ? "chip activo" : "chip"}
                        onClick={() => {
                          setElegida(h);
                          setFranja(null);
                        }}
                      >
                        {hora24(h.inicio)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {error && <p className="error">{error}</p>}
            <div className="acciones">
              <button className="boton peligro" onClick={() => (params.get("paso") === "0" ? setPaso(0) : navegar("/"))}>
                Atrás
              </button>
              <button className="boton primario" disabled={!elegida} onClick={() => setPaso(2)}>
                Siguiente
              </button>
            </div>
          </>
        )}

        {paso === 2 && elegida && (
          <>
            <div className="recuadro">
              <div className="recuadro-cabeza">
                <h2>Resumen</h2>
                <span className="total">
                  Total <span className="total-valor"><Precio valor={servicio.precio} /></span>
                </span>
              </div>
              <div className="recuadro-cuerpo">
                <div className="servicio-cabeza">
                  <h2>{servicio.nombre}</h2>
                  <Duracion minutos={servicio.duracionMin} />
                </div>
                <p className="fecha-cita">
                  {elegida.inicio.slice(0, 10)} | {horaCompacta(elegida.inicio)} · {nombreBarbero ?? "El barbero que esté libre"}
                </p>
                <p className="descripcion recortada">{servicio.descripcion}</p>
                <div className="a-la-derecha"><Precio valor={servicio.precio} /></div>
              </div>
            </div>

            <div className="recuadro">
              <div className="recuadro-cuerpo">
                <h2 className="suave">Contacto</h2>
                <p className="texto-contacto">
                  {conCuenta
                    ? "Reservas con tu cuenta. Te confirmamos la cita por WhatsApp."
                    : "Te confirmamos la cita por WhatsApp. Si te registraste, el descuento se aplica automáticamente."}
                </p>
                <input
                  className="entrada"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre"
                  aria-label="Nombre"
                  autoComplete="name"
                  readOnly={conCuenta}
                />
                <input
                  className="entrada"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Teléfono"
                  aria-label="Teléfono (WhatsApp)"
                  inputMode="tel"
                  autoComplete="tel"
                  readOnly={conCuenta}
                />
                {!conCuenta && (
                  <label className="casilla">
                    <input type="checkbox" checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} />
                    Autorizo el tratamiento de mis datos personales para gestionar mis citas (Ley 1581 de 2012).
                  </label>
                )}
              </div>
            </div>

            {error && <p className="error">{error}</p>}
            <div className="acciones">
              <button className="boton peligro" onClick={() => setPaso(1)}>Atrás</button>
              <button
                className="boton exito"
                disabled={enviando || !nombre.trim() || telefono.replace(/\D/g, "").length < 7 || !(aceptaDatos || conCuenta)}
                onClick={confirmar}
              >
                {enviando ? "Reservando…" : "Confirmar"}
              </button>
            </div>
          </>
        )}
      </section>
    </Marco>
  );
}
