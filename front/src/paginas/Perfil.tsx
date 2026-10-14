import { useState, type InputHTMLAttributes } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiCuenta } from "../api";
import { Marco } from "../componentes/Marco";
import { useVolver } from "../componentes/Navegacion";
import { telefonoLocal } from "../formato";
import { useSesion } from "../sesion";

/** Campo del perfil: etiqueta gris arriba y caja gris (Figma "Perfil"). */
export function CampoPerfil({ etiqueta, ...props }: { etiqueta: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="campo-perfil">
      <span>{etiqueta}</span>
      <input {...props} />
    </label>
  );
}

/** /perfil: inicio de sesión si no hay sesión, o los datos de la cuenta si la hay. */
export function Perfil() {
  const { usuario } = useSesion();
  return <Marco enPerfil>{usuario ? <DatosPerfil /> : <IniciarSesion />}</Marco>;
}

function IniciarSesion() {
  const { iniciar } = useSesion();
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { desde?: string } | null };
  const [telefono, setTelefono] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const sesion = await apiCuenta.login(telefono, clave);
      iniciar(sesion);
      const equipo = sesion.usuario.rol !== "CLIENTE";
      const desde = state?.desde;
      // El equipo vuelve al panel; el cliente a donde estaba (nunca al panel).
      navegar(equipo ? (desde?.startsWith("/panel") ? desde : "/panel") : desde && !desde.startsWith("/panel") ? desde : "/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="tarjeta perfil" onSubmit={entrar}>
      <h1>Inicia sesión o Regístrate</h1>
      <CampoPerfil
        etiqueta="Teléfono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        placeholder="300 123 4567"
        required
      />
      <CampoPerfil
        etiqueta="Contraseña"
        type="password"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button className="boton exito ancho" disabled={enviando}>{enviando ? "Entrando…" : "Iniciar Sesión"}</button>
      <p className="perfil-pie">
        ¿No tienes una cuenta?{" "}
        <Link to="/perfil/registro" state={state} replace>
          Crea una aquí
        </Link>
      </p>
    </form>
  );
}

function DatosPerfil() {
  const { usuario, esEquipo, actualizar, cerrar } = useSesion();
  const navegar = useNavigate();
  const volver = useVolver();
  const [nombre, setNombre] = useState(usuario!.nombre);
  const [fechaNacimiento, setFechaNacimiento] = useState(usuario!.fechaNacimiento ?? "");
  const [estado, setEstado] = useState<"" | "guardando" | "guardado">("");
  const [error, setError] = useState("");

  const cambio = nombre.trim() !== usuario!.nombre || (!esEquipo && fechaNacimiento !== (usuario!.fechaNacimiento ?? ""));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!cambio) return;
    setEstado("guardando");
    setError("");
    try {
      actualizar(
        await apiCuenta.guardar(
          esEquipo ? { nombre: nombre.trim() } : { nombre: nombre.trim(), fechaNacimiento: fechaNacimiento || null },
        ),
      );
      setEstado("guardado");
    } catch (e) {
      setError((e as Error).message);
      setEstado("");
    }
  }

  return (
    <form className="tarjeta perfil" onSubmit={guardar}>
      <h1>Datos de tu perfil</h1>
      <CampoPerfil
        etiqueta="Nombres"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          setEstado("");
        }}
        autoComplete="name"
        required
      />
      <CampoPerfil etiqueta="Teléfono" value={telefonoLocal(usuario!.telefono)} readOnly />
      {!esEquipo && (
        <CampoPerfil
          etiqueta="Fecha de nacimiento"
          type="date"
          value={fechaNacimiento}
          onChange={(e) => {
            setFechaNacimiento(e.target.value);
            setEstado("");
          }}
        />
      )}
      {error && <p className="error">{error}</p>}
      <div className="perfil-botones">
        <button className="boton exito ancho" disabled={estado === "guardando"}>
          {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado ✓" : "Guardar"}
        </button>
        <button
          type="button"
          className="boton peligro ancho"
          onClick={async () => {
            await cerrar();
            navegar("/");
          }}
        >
          Cerrar Sesión
        </button>
        <button type="button" className="boton primario ancho" onClick={volver}>
          {esEquipo ? "Volver al panel" : "Volver al catálogo"}
        </button>
      </div>
    </form>
  );
}
