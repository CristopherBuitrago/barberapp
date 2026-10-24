/** El aviso para el equipo cuando mira la web: puede recorrerla, pero nada se guarda. */
export function PreviewNotice() {
  return (
    <p className="m-0 rounded-[10px] border border-dashed border-db-blue bg-[#eef4ff] px-3 py-[10px] text-[10px] font-bold text-[#1e3a8a]">
      👀 Vista previa: así ven la web tus clientes. Puedes recorrer la reserva, pero nada se guarda. Las citas se agendan desde
      el panel.
    </p>
  );
}
