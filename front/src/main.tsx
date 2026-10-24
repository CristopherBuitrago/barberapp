import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./estilos.css";
import { SesionProvider } from "./sesion";
import { Catalogo } from "./paginas/Catalogo";
import { Reservar } from "./paginas/Reservar";
import { Exito } from "./paginas/Exito";
import { Perfil } from "./paginas/Perfil";
import { Registro } from "./paginas/Registro";
import { Panel } from "./panel/Panel";
import { Servicios } from "./panel/Servicios";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SesionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Catalogo />} />
          <Route path="/reservar/:servicioId" element={<Reservar />} />
          <Route path="/reserva-confirmada" element={<Exito />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/perfil/registro" element={<Registro />} />
          <Route path="/registro" element={<Navigate to="/perfil/registro" replace />} />
          <Route path="/panel" element={<Panel />} />
          <Route path="/panel/servicios" element={<Servicios />} />
        </Routes>
      </BrowserRouter>
    </SesionProvider>
  </StrictMode>,
);
