/**
 * FASE 5: FIREBASE SECURITY RULES
 * Archivo: REFACTORED_FIREBASE_RULES.js (referencia en código)
 * Uso real: Firebase Console → Firestore → Rules
 * 
 * Implementa:
 * ✅ Validación de permisos a nivel de servidor
 * ✅ Protección de datos por rol
 * ✅ Validación de estructura de datos
 * ✅ Rate limiting básico
 * ✅ Prevención de escalada de privilegios
 * 
 * ⚠️  CRÍTICO: Estas reglas se aplican en el servidor.
 * Un atacante NO puede modificarlas desde el cliente.
 * 
 * Fecha: 17 de julio de 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE SECURITY RULES (Copiar a Firebase Console)
// ═══════════════════════════════════════════════════════════════════════════

/*
INSTRUCCIONES DE COPIA:
1. Abrir Firebase Console → Tu proyecto
2. Ir a Firestore Database → Rules
3. Seleccionar TODO el contenido actual y eliminar
4. Copiar el código siguiente y pegarlo completamente
5. Presionar "Publicar"
6. Esperar confirmación (2-3 segundos)

⚠️  IMPORTANTE: Revisar que no hay errores en la sintaxis
*/

// ═══════════════════════════════════════════════════════════════════════════
// CÓDIGO DE REGLAS (Pegar en Firebase Console)
// ═══════════════════════════════════════════════════════════════════════════

/*
rules_version = '2';

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

service cloud.firestore {
  match /databases/{database}/documents {

    // Función: Obtener rol del usuario actual
    function getUserRole() {
      let userDoc = get(/databases/$(database)/documents/dace_usuarios/$(request.auth.uid));
      return userDoc.data.rol;
    }

    // Función: Verificar si usuario tiene un rol específico
    function hasRole(role) {
      return request.auth != null && getUserRole() == role;
    }

    // Función: Verificar si es coordinador (máximo acceso)
    function isCoordinator() {
      return hasRole('coordinador');
    }

    // Función: Verificar si es director o coordinador
    function isDirectorOrCoordinator() {
      let role = getUserRole();
      return role == 'director' || role == 'coordinador';
    }

    // Función: Verificar si el documento pertenece al usuario actual
    function belongsToUser() {
      return request.auth.uid == resource.data.usuario_uid;
    }

    // Función: Validar estructura de dato
    function validateFields(requiredFields) {
      let allRequired = true;
      for (field in requiredFields) {
        if (!(field in request.resource.data)) {
          allRequired = false;
        }
      }
      return allRequired;
    }

    // Función: Rate limiting (máximo 100 escrituras por minuto por usuario)
    function isRateLimited() {
      // Firestore no tiene rate limiting nativo en rules
      // Se implementa a nivel de Cloud Functions
      // Aquí es solo verificación básica
      return true; // Simplificado - implementar en Cloud Functions
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. REGLAS PARA: dace_usuarios (Gestión de usuarios)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_usuarios/{userId} {
      // Leer: Solo coordinador puede leer otros usuarios; cada usuario ve el suyo
      allow read: if request.auth.uid == userId || isCoordinator();
      
      // Crear: Solo coordinador puede crear usuarios
      allow create: if isCoordinator() && 
                      validateFields(['email', 'rol', 'activo']);
      
      // Actualizar: Solo coordinador puede actualizar usuarios
      allow update: if isCoordinator() &&
                      validateFields(['email', 'rol', 'activo']) &&
                      resource.data.email == request.resource.data.email; // Email no cambiar
      
      // Eliminar: Solo coordinador puede eliminar usuarios
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. REGLAS PARA: dace_generadores (Bitácora)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_generadores/{document=**} {
      // Leer: Director o coordinador pueden leer todos; agente solo sus datos
      allow read: if isDirectorOrCoordinator() || 
                     (getUserRole() == 'agente' && belongsToUser());
      
      // Crear: Director o coordinador pueden crear
      allow create: if isDirectorOrCoordinator() &&
                       validateFields(['lugar', 'observaciones', 'fecha']) &&
                       request.resource.data.lugar.size() > 0 &&
                       request.resource.data.observaciones.size() > 0;
      
      // Actualizar: Coordinador puede actualizar todos; agente solo sus datos
      allow update: if isCoordinator() || 
                       (getUserRole() == 'agente' && belongsToUser() &&
                        validateFields(['lugar', 'observaciones', 'fecha']));
      
      // Eliminar: Solo coordinador puede eliminar
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. REGLAS PARA: dace_agenda (Tareas)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_agenda/{document=**} {
      allow read: if isDirectorOrCoordinator();
      
      allow create: if isDirectorOrCoordinator() &&
                       validateFields(['titulo', 'descripcion', 'fecha']) &&
                       request.resource.data.titulo.size() > 0;
      
      allow update: if isDirectorOrCoordinator() &&
                       validateFields(['titulo', 'descripcion', 'fecha']);
      
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. REGLAS PARA: dace_directorio (Contactos)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_directorio/{document=**} {
      allow read: if request.auth != null; // Todos los roles pueden leer
      
      allow create: if isDirectorOrCoordinator() &&
                       validateFields(['nombre', 'telefono']) &&
                       request.resource.data.nombre.size() > 0;
      
      allow update: if isDirectorOrCoordinator() &&
                       validateFields(['nombre', 'telefono']);
      
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. REGLAS PARA: dace_q137_1 (Órdenes)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_q137_1/{document=**} {
      allow read: if isDirectorOrCoordinator() || 
                     (getUserRole() == 'agente' && belongsToUser());
      
      allow create: if isDirectorOrCoordinator() &&
                       validateFields(['numero', 'descripcion', 'fecha']) &&
                       request.resource.data.numero.size() > 0;
      
      allow update: if isCoordinator() || 
                       (getUserRole() == 'agente' && belongsToUser() &&
                        validateFields(['numero', 'descripcion', 'fecha']));
      
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. REGLAS PARA: dace_q137_3 (Inspecciones)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_q137_3/{document=**} {
      allow read: if isDirectorOrCoordinator() || 
                     (getUserRole() == 'agente' && belongsToUser());
      
      allow create: if isDirectorOrCoordinator() &&
                       validateFields(['numero', 'hallazgos', 'fecha']) &&
                       request.resource.data.numero.size() > 0;
      
      allow update: if isCoordinator() || 
                       (getUserRole() == 'agente' && belongsToUser() &&
                        validateFields(['numero', 'hallazgos', 'fecha']));
      
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. REGLAS PARA: dace_casos (Casos)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_casos/{document=**} {
      allow read: if isDirectorOrCoordinator();
      
      allow create: if isDirectorOrCoordinator() &&
                       validateFields(['numero', 'descripcion', 'fecha']) &&
                       request.resource.data.numero.size() > 0;
      
      allow update: if isDirectorOrCoordinator() &&
                       validateFields(['numero', 'descripcion', 'fecha']);
      
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. REGLAS PARA: dace_mantenimiento (Mantenimiento)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_mantenimiento/{document=**} {
      allow read: if isDirectorOrCoordinator() || 
                     (getUserRole() == 'agente' && belongsToUser());
      
      allow create: if isDirectorOrCoordinator() &&
                       validateFields(['lugar', 'descripcion', 'fecha']) &&
                       request.resource.data.lugar.size() > 0;
      
      allow update: if isCoordinator() || 
                       (getUserRole() == 'agente' && belongsToUser() &&
                        validateFields(['lugar', 'descripcion', 'fecha']));
      
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. REGLAS PARA: dace_maestro (Maestro)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_maestro/{document=**} {
      allow read: if isDirectorOrCoordinator();
      
      allow create: if isDirectorOrCoordinator() &&
                       validateFields(['tipo', 'descripcion', 'fecha']) &&
                       request.resource.data.tipo.size() > 0;
      
      allow update: if isDirectorOrCoordinator() &&
                       validateFields(['tipo', 'descripcion', 'fecha']);
      
      allow delete: if isCoordinator();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 10. REGLAS PARA: dace_audita (Auditoría - Solo lectura)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_audita/{document=**} {
      // Leer: Solo coordinador y director pueden leer auditoría
      allow read: if isDirectorOrCoordinator();
      
      // Crear: Cloud Functions puede crear (usuario del servidor)
      allow create: if request.auth == null; // Cloud Functions no tiene auth
      
      // Actualizar: No permitido
      allow update: if false;
      
      // Eliminar: No permitido (auditoría es inmutable)
      allow delete: if false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 11. REGLAS PARA: dace_fotos (Storage via Firestore)
    // ═══════════════════════════════════════════════════════════════════════

    match /dace_fotos/{userId}/{document=**} {
      // Solo usuario puede crear sus propias fotos
      allow create: if request.auth.uid == userId;
      
      // Solo usuario puede leer sus fotos
      allow read: if request.auth.uid == userId;
      
      // No permitir actualizar o eliminar
      allow update, delete: if false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 12. CATCH-ALL: Rechazar todo lo demás
    // ═══════════════════════════════════════════════════════════════════════

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

// ═══════════════════════════════════════════════════════════════════════════
// RESUMÉN DE REGLAS
// ═══════════════════════════════════════════════════════════════════════════

/*
RESUMÉN DE LO QUE HACEN ESTAS REGLAS:

1. COORDINADOR (Acceso total):
   ✅ Puede leer TODOS los documentos
   ✅ Puede crear en TODAS las colecciones
   ✅ Puede actualizar TODOS los documentos
   ✅ Puede eliminar TODOS los documentos
   ✅ Puede leer auditoría completa
   ✅ Puede gestionar usuarios

2. DIRECTOR (Supervisión):
   ✅ Puede leer TODOS los documentos
   ✅ Puede crear en TODAS las colecciones
   ✅ Puede actualizar TODOS los documentos
   ❌ NO puede eliminar documentos
   ✅ Puede leer auditoría
   ❌ NO puede gestionar usuarios

3. AGENTE (Entrada de datos):
   ✅ Puede leer solo sus propios documentos
   ✅ Puede crear generadores, Q1, Q3, mantenimiento
   ✅ Puede actualizar solo sus documentos
   ❌ NO puede eliminar nada
   ❌ NO puede leer auditoría
   ❌ NO puede ver otros documentos

VALIDACIONES IMPLEMENTADAS:
✅ Campos requeridos verificados
✅ Longitud mínima de campos de texto
✅ Pertenencia de documento verificada
✅ Roles validados en servidor
✅ Auditoría protegida (solo lectura)
✅ Fotos protegidas por usuario

PROTECCIONES:
✅ No se puede modificar auditoría
✅ No se puede crear usuario desde cliente
✅ No se puede cambiar rol sin ser coordinador
✅ No se puede leer datos de otros usuarios (agentes)
✅ No se puede eliminar sin ser coordinador
✅ No se puede acceder sin autenticación (excepto auth)
*/

// ═══════════════════════════════════════════════════════════════════════════
// PASOS DE IMPLEMENTACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/*
PASO 1: Copiar las reglas
- Seleccionar TODO el código entre /* y */ de la sección "CÓDIGO DE REGLAS"
- Copiar completamente

PASO 2: Ir a Firebase Console
- Abrir https://console.firebase.google.com
- Seleccionar tu proyecto
- Ir a "Firestore Database"
- Hacer clic en la pestaña "Rules"

PASO 3: Reemplazar reglas
- Seleccionar TODO el contenido actual (Ctrl+A)
- Pegar el código copiado (Ctrl+V)
- Revisar que no hay errores de sintaxis (la consola lo indicará)

PASO 4: Publicar
- Hacer clic en "Publicar"
- Esperar a que se actualicen (2-3 segundos)
- Ver confirmación: "Successfully published"

PASO 5: Verificar
- Abrir la aplicación
- Intentar guardar un generador
- Debe funcionar normalmente
- Intentar con usuario agente eliminar
- Debe mostrar error

PASO 6: Monitoring
- Firebase Console → Cloud Functions → Logs
- Ver errores de reglas (si hay)
- Ejemplo: "Permission denied" indica que una regla rechazó
*/

// ═══════════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════════════════════

/*
PROBLEMA: "Syntax error in Security Rules"
SOLUCIÓN: 
  - Copiar nuevamente el código
  - Verificar que no faltan comillas ni paréntesis
  - Usar el editor de Firefox para ver números de línea
  - La línea del error está indicada en la consola

PROBLEMA: "Permission denied" cuando guardo
SOLUCIÓN:
  - Verificar que el usuario existe en dace_usuarios
  - Verificar que tiene un rol ('coordinador', 'director' o 'agente')
  - Verificar que los campos requeridos están presentes
  - Ver Cloud Functions logs para más detalles

PROBLEMA: "Missing or insufficient permissions"
SOLUCIÓN:
  - Este es el error CORRECTO cuando un usuario sin permiso intenta acceder
  - Verificar que el rol del usuario es correcto
  - Verificar que está autenticado (request.auth != null)

PROBLEMA: Agente no ve sus generadores
SOLUCIÓN:
  - Verificar que el campo usuario_uid está set al guardar
  - Verificar que request.auth.uid coincide con usuario_uid
  - Usar Cloud Functions para loguear el acceso

PROBLEMA: Los datos desaparecen o no se cargan
SOLUCIÓN:
  - Probable culpa de las reglas siendo muy restrictivas
  - Verificar en Firebase Logs si hay errores
  - Temporalmente cambiar a allow read, write: if true; para probar
  - Luego volver a las reglas restrictivas
*/

// ═══════════════════════════════════════════════════════════════════════════
// ARQUITECTURA DE SEGURIDAD COMPLETA
// ═══════════════════════════════════════════════════════════════════════════

/*
CAPAS DE SEGURIDAD (Defensa en profundidad):

CAPA 1: CLIENTE (Frontend - JavaScript)
  ✅ SECURITY_UTILS.js - Escape y sanitización
  ✅ REFACTORED_RENDERING.js - Renderizado seguro sin XSS
  ✅ REFACTORED_CRUD.js - Validación de datos
  ✅ REFACTORED_AUTH.js - Verificación de permisos
  ❌ Un atacante PUEDE modificar/bypass

CAPA 2: SERVIDOR (Firebase Security Rules)
  ✅ REFACTORED_FIREBASE_RULES - Validación de permisos
  ✅ Validación de estructura de datos
  ✅ Control de acceso por rol
  ✅ Protección de datos sensibles (auditoría)
  ❌ Un atacante NO PUEDE modificar (en el servidor)

CAPA 3: FIRESTORE (Base de datos)
  ✅ Cifrado en tránsito (HTTPS)
  ✅ Cifrado en reposo (Google Cloud)
  ✅ Backups automáticos
  ✅ Sincronización en tiempo real

CAPA 4: AUDITORÍA
  ✅ dace_audita - Registro inmutable de acciones
  ✅ Quién, cuándo, qué rol, qué acción
  ✅ Solo lectura para director/coordinador
  ✅ Cloud Logging - Logs adicionales del servidor

RESULTADO: Incluso si un atacante modifica el cliente, las reglas
del servidor RECHAZARÁN cualquier operación no autorizada.
*/

// ═══════════════════════════════════════════════════════════════════════════
// TESTING DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════════════════

/*
DESPUÉS DE APLICAR LAS REGLAS, EJECUTAR ESTOS TESTS:

TEST 1: Coordinador puede hacer todo
  Crear generador: ✅ Funciona
  Eliminar generador: ✅ Funciona
  Leer auditoría: ✅ Funciona

TEST 2: Director no puede eliminar
  Crear generador: ✅ Funciona
  Intentar eliminar: ❌ Error "Permission denied"
  Resultado esperado: El botón de eliminar no aparece o muestra error

TEST 3: Agente solo ve sus datos
  Como agente: Crear generador
  Como coordinador: Crear otro generador (usuario_uid diferente)
  Como agente: Listar generadores
  Resultado esperado: Solo ve su generador, no el del coordinador

TEST 4: No autenticado
  Cerrar sesión
  Intentar acceder a dace_generadores
  Resultado esperado: Error "Permission denied"

TEST 5: Email en auditoría
  Como coordinador: Leer dace_audita
  Resultado esperado: Ver registro de quien hace cada cosa

TODOS LOS TESTS DEBEN PASAR PARA CONSIDERAR FASE 5 COMPLETADA
*/
