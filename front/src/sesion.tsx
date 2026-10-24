import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { alExpirarSesion, apiCuenta, type SesionGuardada, type Usuario } from "./api";
import { almacen } from "./almacen";

interface ContextoSesion {
  usuario: Usuario | null;
  esEquipo: boolean;
  esAdmin: boolean;
  iniciar: (sesion: SesionGuardada) => void;
  actualizar: (usuario: Usuario) => void;
  cerrar: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

/** Sesión de la web (cliente, barbero o admin). El token se guarda en el navegador. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState(almacen.sesion<SesionGuardada>());

  function guardar(nueva: SesionGuardada | null) {
    almacen.guardarSesion(nueva);
    setSesion(nueva);
  }

  useEffect(() => {
    alExpirarSesion.manejador = () => guardar(null);
    // Al abrir la web se confirma que la sesión sigue vigente y se traen los datos al día.
    if (almacen.sesion<SesionGuardada>()) {
      apiCuenta
        .yo()
        .then((usuario) => {
          const actual = almacen.sesion<SesionGuardada>();
          if (actual) guardar({ ...actual, usuario });
        })
        .catch(() => {});
    }
  }, []);

  const valor: ContextoSesion = {
    usuario: sesion?.usuario ?? null,
    esEquipo: sesion?.usuario.rol === "BARBERO" || sesion?.usuario.rol === "ADMIN",
    esAdmin: sesion?.usuario.rol === "ADMIN",
    iniciar: guardar,
    actualizar: (usuario) => sesion && guardar({ ...sesion, usuario }),
    cerrar: async () => {
      await apiCuenta.logout().catch(() => {});
      // En un equipo compartido, el siguiente no debe ver la cita ni los datos de esta cuenta.
      almacen.guardarUltimaCita(null);
      guardar(null);
    },
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useSesion fuera de SesionProvider");
  return ctx;
}
