/**
 * Piezas para armar el documento OpenAPI sin repetir lo mismo en cada ruta: el sobre de
 * las respuestas, los errores con su código y los parámetros sacados de los esquemas zod.
 */
import { z } from "zod";
import type { ErrorCode } from "../../../domain/errors/ErrorCode.js";

type JsonSchema = Record<string, unknown>;

export const ref = (name: string): JsonSchema => ({ $ref: `#/components/schemas/${name}` });

/**
 * Quita lo que zod pone y no le dice nada a quien lee la documentación: el patrón enorme
 * de las fechas ISO y el máximo de 9007199254740991 en los enteros
 */
function clean(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(clean);
  if (!schema || typeof schema !== "object") return schema;
  const out: JsonSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "$schema") continue;
    if (key === "pattern" && (schema as JsonSchema).format === "date-time") continue;
    if (key === "maximum" && value === Number.MAX_SAFE_INTEGER) continue;
    out[key] = clean(value);
  }
  return out;
}

/** El esquema JSON de lo que hay que mandar, sacado del mismo zod que valida la petición */
export function fromZod(schema: z.ZodType): JsonSchema {
  return clean(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })) as JsonSchema;
}

/** Cada campo de un esquema zod de objeto como parámetro de la ruta o de la consulta */
export function paramsFromZod(schema: z.ZodObject, where: "query" | "path"): JsonSchema[] {
  const json = fromZod(schema) as { properties?: Record<string, JsonSchema>; required?: string[] };
  return Object.entries(json.properties ?? {}).map(([name, propSchema]) => ({
    name,
    in: where,
    required: where === "path" || (json.required ?? []).includes(name),
    schema: propSchema,
  }));
}

export function jsonBody(schema: z.ZodType, description?: string): JsonSchema {
  return { required: true, description, content: { "application/json": { schema: fromZod(schema) } } };
}

function envelope(data: JsonSchema, withPagination = false): JsonSchema {
  return {
    type: "object",
    required: ["success", "data", "error", ...(withPagination ? ["pagination"] : [])],
    properties: {
      success: { const: true },
      data,
      ...(withPagination ? { pagination: ref("Pagination") } : {}),
      error: { type: "null" },
    },
  };
}

/** Respuesta bien con un objeto (o null) en data */
export function ok(data: JsonSchema, description: string, status = 200): Record<string, JsonSchema> {
  return { [status]: { description, content: { "application/json": { schema: envelope(data) } } } };
}

/** Respuesta bien con una lista paginada en data */
export function list(item: JsonSchema, description: string): Record<string, JsonSchema> {
  return {
    200: {
      description,
      content: { "application/json": { schema: envelope({ type: "array", items: item }, true) } },
    },
  };
}

/** Lo que no devuelve nada responde data null */
export function empty(description: string): Record<string, JsonSchema> {
  return ok({ type: "null" }, description);
}

const STATUS_TEXT: Record<number, string> = {
  400: "Datos inválidos o que no cumplen una regla",
  401: "Sin sesión, sin la clave del agente o credenciales malas",
  403: "Tiene sesión pero no le toca",
  404: "No existe",
  409: "Choca con algo que ya está",
  413: "El archivo pesa más de lo permitido",
  500: "Error que no se esperaba",
};

/**
 * Los errores posibles de una ruta, agrupados por estado HTTP. Cada código queda como
 * ejemplo en Swagger para que se vea la respuesta exacta.
 */
export function errors(byStatus: Partial<Record<number, { code: ErrorCode; message: string }[]>>): Record<string, JsonSchema> {
  const all = { ...byStatus, 500: [{ code: "INTERNAL_ERROR" as ErrorCode, message: "Error interno" }] };
  const out: Record<string, JsonSchema> = {};
  for (const [status, list] of Object.entries(all)) {
    if (!list?.length) continue;
    out[status] = {
      description: `${STATUS_TEXT[Number(status)] ?? "Error"}. Códigos: ${list.map((e) => e.code).join(", ")}`,
      content: {
        "application/json": {
          schema: ref("ErrorEnvelope"),
          examples: Object.fromEntries(
            list.map((e) => [
              e.code,
              { value: { success: false, data: null, error: { code: e.code, message: e.message, details: null } } },
            ]),
          ),
        },
      },
    };
  }
  return out;
}

/** El error de validación que tienen todas las rutas que reciben algo */
export const validation = { code: "VALIDATION_ERROR" as ErrorCode, message: "Datos inválidos" };
export const invalidJson = { code: "INVALID_JSON" as ErrorCode, message: "El cuerpo de la petición no es un JSON válido" };
