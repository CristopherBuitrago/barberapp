import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/entities/session";
import { RegisterForm } from "@/features/auth";
import { SiteLayout } from "@/widgets/site-layout";

/** /perfil/registro: crear cuenta de cliente, que da el descuento de bienvenida. */
export function RegisterPage() {
  const { user } = useSession();
  // Si entró ya con sesión no tiene sentido crear otra cuenta. Si la sesión empezó aquí, se queda viendo la bienvenida
  const [hadSessionOnArrival] = useState(!!user);
  if (hadSessionOnArrival) return <Navigate to="/perfil" replace />;
  return (
    <SiteLayout inProfile>
      <RegisterForm />
    </SiteLayout>
  );
}
