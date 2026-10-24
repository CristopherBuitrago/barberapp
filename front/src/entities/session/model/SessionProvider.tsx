import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { sessionEvents } from "@/shared/api";
import { readStored, writeStored } from "@/shared/lib";
import { getMe, logout } from "../api/sessionApi";
import type { User } from "./types";

/**
 * Aquí solo se recuerda quién es la persona para pintar la web (nombre, rol). El token de la
 * sesión va en una cookie httpOnly que el navegador maneja solo y el front nunca ve.
 */
const USER_KEY = "barberia.user";

interface SessionContext {
  user: User | null;
  isTeam: boolean;
  isAdmin: boolean;
  start: (user: User) => void;
  update: (user: User) => void;
  /** Cierra la sesión en el navegador de una vez y le avisa al back para que borre la cookie */
  end: () => void;
}

const Context = createContext<SessionContext | null>(null);

/** Lo que hay que limpiar al cerrar sesión, por ejemplo la última cita (lo registra quien la guarda) */
const onEndCallbacks: (() => void)[] = [];
export function onSessionEnd(callback: () => void) {
  onEndCallbacks.push(callback);
}

/** Sesión de la web: cliente, barbero o admin. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(readStored<User>(USER_KEY));

  function save(next: User | null) {
    writeStored(USER_KEY, next);
    setUser(next);
  }

  useEffect(() => {
    // Antes la sesión guardaba el token en el navegador. Se borra para no dejarlo ahí
    writeStored("barberia.session", null);
    // Si el back responde que no hay sesión (pasó media hora sin usar la web), se olvida a la persona
    sessionEvents.onExpired(() => {
      if (readStored<User>(USER_KEY)) save(null);
    });
    // Al abrir la web se confirma con el back que la cookie sigue viva y se traen los datos al día
    if (readStored<User>(USER_KEY)) getMe().then(save).catch(() => {});
  }, []);

  const role = user?.role;
  const value: SessionContext = {
    user,
    isTeam: role === "BARBERO" || role === "ADMIN",
    isAdmin: role === "ADMIN",
    start: save,
    update: save,
    end: () => {
      // No se espera al back: la persona sale de una vez aunque la red esté lenta
      logout().catch(() => {});
      // En un equipo compartido, el siguiente no debe ver nada de esta cuenta
      onEndCallbacks.forEach((callback) => callback());
      save(null);
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): SessionContext {
  const context = useContext(Context);
  if (!context) throw new Error("useSession tiene que ir dentro de SessionProvider");
  return context;
}
