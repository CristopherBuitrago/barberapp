import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi.js";

/**
 * La documentación de la API:
 *   /api/docs               pantalla de Swagger para leer y probar cada ruta
 *   /api/docs/openapi.json  el documento OpenAPI, para Postman, Insomnia o generar clientes
 */
export function docsRoutes(): Router {
  const router = Router();
  router.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });
  router.use(
    "/",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "API Barbería",
      swaggerOptions: { persistAuthorization: true, docExpansion: "list", tryItOutEnabled: true },
    }),
  );
  return router;
}
