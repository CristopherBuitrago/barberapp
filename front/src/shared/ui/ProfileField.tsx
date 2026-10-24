import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

/** Campo de los formularios de perfil: etiqueta gris arriba y caja gris (Figma "Perfil"). */
export function ProfileField({ label, type, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-[6px] flex flex-col">
      <span className="text-[10px] font-bold text-[#afafaf]">{label}</span>
      <input
        type={type}
        {...props}
        className={cn(
          "h-[22px] rounded-[5px] border-0 bg-db-panel px-[6px] py-0 text-[11px] font-bold text-[#534c4c] [font-family:inherit]",
          "focus:outline-2 focus:outline-offset-0 focus:outline-db-step-blue focus:outline-solid",
          "read-only:cursor-default read-only:text-[#8a8585]",
          type === "password" && "text-[16px]",
        )}
      />
    </label>
  );
}
