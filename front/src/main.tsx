import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./estilos.css";
import { Catalogo } from "./paginas/Catalogo";
import { Reservar } from "./paginas/Reservar";
import { Exito } from "./paginas/Exito";
import { Registro } from "./paginas/Registro";
import { Panel } from "./panel/Panel";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/reservar/:servicioId" element={<Reservar />} />
        <Route path="/reserva-confirmada" element={<Exito />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/panel" element={<Panel />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
