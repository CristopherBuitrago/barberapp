import { z } from "zod";

export const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");
export const instante = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
export const id = z.coerce.number().int().positive();
export const telefono = z.string().min(7).max(20);

export const nuevaCita = z.object({
  servicioId: id,
  barberoId: id.optional(),
  inicio: instante,
  cliente: z.object({
    nombre: z.string().trim().min(1).max(80),
    telefono,
    aceptaDatos: z.boolean().optional(),
  }),
  notas: z.string().max(300).optional(),
});
