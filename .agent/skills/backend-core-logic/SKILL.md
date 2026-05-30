---
name: backend-core-logic
description: "Úsala cuando el usuario pida escribir la lógica de negocio de un servicio, escribir queries o modelos de MySQL, encriptar contraseñas o manejar tokens JWT."
---

# Estándar de Lógica de Negocio y Base de Datos

Esta guía define cómo se escribe la lógica de negocio (Servicios), la seguridad y la interacción con la base de datos MySQL utilizando TypeScript estricto.

## 1. Patrón de Servicios (POO Atómica)
- Cada caso de uso o acción del sistema debe ser una clase de servicio independiente con un único método público llamado `execute()`. Esto cumple con el Principio de Responsabilidad Única (SRP) y facilita los tests unitarios.
- Los servicios no deben tener acceso directo al objeto `res` de Express. Deben retornar los datos puros o lanzar un error si algo sale mal.
- Ejemplo de patrón esperado:
  ```typescript
  import { db } from '../../config/db';

  export class CreateUserService {
    async execute(userData: CreateUserDTO) {
      // Lógica de negocio (ej. verificar si el email ya existe)
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [userData.email]);
      if (existing.length > 0) {
        throw new Error('El correo electrónico ya está registrado');
      }

      // Inserción en MySQL
      const [result] = await db.query('INSERT INTO users SET ?', [userData]);
      return { id: result.insertId, ...userData };
    }
  }
  export const createUserService = new CreateUserService();

## 2. Manejo de Errores DRY (Sin try/catch repetitivos)
Regla estricta: No escribas bloques try/catch dentro de los métodos execute() de tus servicios a menos que necesites hacer un rollback de una transacción de MySQL o formatear un error muy específico.

Si una validación falla o una regla de negocio se rompe, simplemente lanza un error (throw new Error("Mensaje")). El middleware global errorHandler de Express lo capturará automáticamente a través del asyncHandler del controlador y enviará la Respuesta Universal con "success": false.

## 3. Seguridad y Criptografía
Contraseñas: Cualquier flujo que guarde o actualice contraseñas debe encriptarlas usando bcryptjs con un factor de costo (salt) de 10. Queda prohibido guardar texto plano.

Autenticación: La generación y verificación de sesiones se realiza mediante JSON Web Tokens (JWT). El token debe contener únicamente información no sensible (como el ID del usuario y su rol).

## 4. Tipado Estricto (TypeScript)
Queda terminantemente prohibido el uso de any.

Cada servicio debe definir interfaces o tipos claros para sus datos de entrada (Inputs/DTOs) y de salida (Outputs).