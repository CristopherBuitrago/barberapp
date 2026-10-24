import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider } from "@/entities/session";
import { BookingPage } from "@/pages/booking";
import { BookingConfirmedPage } from "@/pages/booking-confirmed";
import { CatalogPage } from "@/pages/catalog";
import { PanelAgendaPage } from "@/pages/panel-agenda";
import { PanelBarbersPage } from "@/pages/panel-barbers";
import { PanelClientsPage } from "@/pages/panel-clients";
import { PanelServicesPage } from "@/pages/panel-services";
import { ProfilePage } from "@/pages/profile";
import { RegisterPage } from "@/pages/register";

/** Las rutas de la web. Las direcciones siguen en español porque son las que ve la gente. */
export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/reservar/:serviceId" element={<BookingPage />} />
          <Route path="/reserva-confirmada" element={<BookingConfirmedPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/perfil/registro" element={<RegisterPage />} />
          <Route path="/registro" element={<Navigate to="/perfil/registro" replace />} />
          <Route path="/panel" element={<PanelAgendaPage />} />
          <Route path="/panel/servicios" element={<PanelServicesPage />} />
          <Route path="/panel/barberos" element={<PanelBarbersPage />} />
          <Route path="/panel/clientes" element={<PanelClientsPage />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
