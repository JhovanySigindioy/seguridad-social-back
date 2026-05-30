---
name: backend-architecture
description: "Úsala cuando el usuario pida crear una nueva funcionalidad (feature) en el backend, registrar rutas en Express, crear controladores o definir el contrato de respuesta de la API."
---

# Guía de Arquitectura Backend (Vertical Slicing)

Este proyecto backend utiliza Node.js, TypeScript y Express, organizado bajo un patrón de rebanadas verticales (Vertical Slicing) por funcionalidad.

## 1. Estructura General de la Carpeta `src/`

```text
src/
├── config/              # Configuraciones globales (db, variables de entorno)
├── middleware/          # Middlewares globales (auth, error, errorHandler)
├── features/            # ESTRUCTURA POR FEATURES (Microcosmos autónomos)
│   ├── auth/            # Ejemplo: Módulo de Autenticación
│   │   ├── controllers/ # Orquestadores de entrada (ej. login.controller.ts)
│   │   ├── services/    # Lógica de negocio pura (ej. login.service.ts)
│   │   ├── schemas/     # Validaciones de Zod (ej. login.schema.ts)
│   │   └── auth.routes.ts # Registro de rutas de esta feature
│   └── products/        # Ejemplo: Módulo de Productos
├── app.ts               # Configuración central de Express y Middlewares
└── server.ts            # Punto de entrada para iniciar el servidor

## 2. Reglas para los Controladores y Rutas
Cero lógica en el router: Los archivos *.routes.ts solo deben mapear la URL, el método HTTP, los middlewares necesarios y el controlador correspondiente.

Uso de asyncHandler: Todos los controladores deben ser funciones asíncronas envueltas en un middleware asyncHandler para evitar bloques try/catch repetitivos para capturar errores de Express.

Responsabilidad del Controlador: El controlador solo debe:

Validar el req.body, req.query o req.params usando el esquema de Zod.

Instanciar/llamar al servicio correspondiente pasándole los datos limpios.

Enviar la Respuesta Universal.

## 3. Contrato de Respuesta Universal (API Contract)
Todas las respuestas de la API deben seguir estrictamente esta estructura JSON estandarizada:

Respuestas Exitosas (200, 201):

JSON
{
  "success": true,
  "data": { ... },
  "error": null
}
Respuestas con Error (400, 401, 404, 500):

JSON
{
  "success": false,
  "data": null,
  "error": "Mensaje descriptivo del error"
}