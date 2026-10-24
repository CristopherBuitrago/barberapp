import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authToken } from "@/shared/api";
import { readStored, writeStored } from "@/shared/lib";
import { getMe, logout } from "../api/sessionApi";
import type { StoredSession, User } from "./types";

const SESSION_KEY = "barberia.session";

interface SessionContext {
  user: User | null;
  isTeam: boolean;
  isAdmin: boolean;
  start: (session: StoredSession) => void;
  update: (user: User) => void;
  /** Cierra la sesión en el back y en el navegador */
  end: () => Promise<void>;
}

const Context = createContext<SessionContext | null>(null);

/** Lo que hay que limpiar al cerrar sesión, por ejemplo la última cita (lo registra quien la guarda) */
const onEndCallbacks: (() => void)[] = [];
export function onSessionEnd(callback: () => void) {
  onEndCallbacks.push(callback);
}

/** Sesión de la web: cliente, barbero o admin. El token se guarda en el navegador. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readStored<StoredSession>(SESSION_KEY));

  function save(next: StoredSession | null) {
    writeStored(SESSION_KEY, next);
    setSession(next);
  }

  useEffect(() => {
    authToken.register({
      read: () => readStored<StoredSession>(SESSION_KEY)?.token ?? null,
      onExpired: () => save(null),
    });
    // Al abrir la web se confirma que la sesión sigue viva y se traen los datos al día
    if (readStored<StoredSession>(SESSION_KEY)) {
      getMe()
        .then((user) => {
          const current = readStored<StoredSession>(SESSION_KEY);
          if (current) save({ ...current, user });
        })
        .catch(() => {});
    }
  }, []);

  const role = session?.user.role;
  const value: SessionContext = {
    user: session?.user ?? null,
    isTeam: role === "BARBERO" || role === "ADMIN",
    isAdmin: role === "ADMIN",
    start: save,
    update: (user) => session && save({ ...session, user }),
    end: async () => {
      await logout().catch(() => {});
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
