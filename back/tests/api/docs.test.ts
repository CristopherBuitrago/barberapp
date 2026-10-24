/**
 * Cuida que la documentación de Swagger no mienta: cada ruta documentada tiene que existir
 * en el back de verdad.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { BASE, call, resetDatabase, startApi, stopApi } from "./harness.js";

before(async () => {
  await resetDatabase();
  await startApi();
});
after(stopApi);

describe("documentación de la API", () => {
  it("la pantalla de Swagger abre en /api/docs", async () => {
    const res = await fetch(`${BASE}/api/docs/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/);
    assert.match(await res.text(), /swagger-ui/);
  });

  it("el documento OpenAPI está en /api/docs/openapi.json", async () => {
    const res = await fetch(`${BASE}/api/docs/openapi.json`);
    const doc = await res.json();
    assert.equal(doc.openapi, "3.1.0");
    assert.ok(doc.components.securitySchemes.bearerAuth);
    assert.ok(doc.components.securitySchemes.agentKey);
  });

  it("cada ruta documentada existe en el back", async () => {
    const doc = await (await fetch(`${BASE}/api/docs/openapi.json`)).json();
    const operations = Object.entries(doc.paths as Record<string, Record<string, unknown>>).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => ({ method: method.toUpperCase(), path })),
    );
    assert.equal(operations.length, 30);
    for (const { method, path } of operations) {
      // Con valores de mentira en los parámetros, lo que importa es que no responda "esa ruta no existe"
      const url = path.replace("{id}", "999").replace("{telefono}", "3000000000");
      const res = await call(method, url, method === "GET" || method === "DELETE" ? {} : { body: {} });
      assert.notEqual(res.error?.code, "ROUTE_NOT_FOUND", `${method} ${path} está documentada pero no existe`);
    }
  });

  it("todas las respuestas documentadas usan el sobre, menos la imagen", async () => {
    const doc = await (await fetch(`${BASE}/api/docs/openapi.json`)).json();
    for (const [path, methods] of Object.entries(doc.paths as Record<string, Record<string, any>>)) {
      for (const [method, operation] of Object.entries(methods)) {
        for (const [status, response] of Object.entries(operation.responses as Record<string, any>)) {
          const json = response.content?.["application/json"];
          if (path === "/api/imagenes/{id}" && status === "200") continue;
          assert.ok(json, `${method} ${path} ${status} no tiene respuesta JSON`);
          const schema = json.schema.$ref ? doc.components.schemas.ErrorEnvelope : json.schema;
          assert.deepEqual(
            Object.keys(schema.properties).filter((k) => k !== "pagination").sort(),
            ["data", "error", "success"],
            `${method} ${path} ${status} no usa el sobre`,
          );
        }
      }
    }
  });
});
