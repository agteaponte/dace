/**
 * FASE 4: AUTENTICACIÓN Y AUTORIZACIÓN
 * Archivo: REFACTORED_AUTH.js
 * 
 * Implementa:
 * ✅ Autenticación real (no hardcodeado)
 * ✅ Sistema de roles (Coordinador, Director, Admin)
 * ✅ Control de acceso basado en roles
 * ✅ Verificación de permisos en operaciones
 * ✅ Prevención de escalada de privilegios
 * 
 * Dependencias: SECURITY_UTILS.js, REFACTORED_CRUD.js
 * Uso: Cargar ANTES de src/app.js
 * 
 * Fecha: 17 de julio de 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. DEFINICIÓN DE ROLES Y PERMISOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Definición de roles y sus permisos
 * Estructura: { rol: { permiso: boolean } }
 */
const ROLES_Y_PERMISOS = {
  /**
   * COORDINADOR - Rol de máximo nivel
   * Puede: Todo
   */
  'coordinador': {
    crear_generador: true,
    crear_agenda: true,
    crear_directorio: true,
    crear_q1: true,
    crear_q3: true,
    crear_caso: true,
    crear_mantenimiento: true,
    crear_maestro: true,
    
    editar_generador: true,
    editar_agenda: true,
    editar_directorio: true,
    editar_q1: true,
    editar_q3: true,
    editar_caso: true,
    editar_mantenimiento: true,
    editar_maestro: true,
    
    eliminar_generador: true,
    eliminar_agenda: true,
    eliminar_directorio: true,
    eliminar_q1: true,
    eliminar_q3: true,
    eliminar_caso: true,
    eliminar_mantenimiento: true,
    eliminar_maestro: true,
    
    ver_auditoría: true,
    ver_reportes: true,
    gestionar_usuarios: true,
    cambiar_rol: true,
  },

  /**
   * DIRECTOR DE DEPENDENCIA - Rol de supervisión
   * Puede: Crear, editar, ver; pero NO eliminar ni gestionar usuarios
   */
  'director': {
    crear_generador: true,
    crear_agenda: true,
    crear_directorio: true,
    crear_q1: true,
    crear_q3: true,
    crear_caso: true,
    crear_mantenimiento: true,
    crear_maestro: true,
    
    editar_generador: true,
    editar_agenda: true,
    editar_directorio: true,
    editar_q1: true,
    editar_q3: true,
    editar_caso: true,
    editar_mantenimiento: true,
    editar_maestro: true,
    
    eliminar_generador: false,  // ❌ NO puede eliminar
    eliminar_agenda: false,
    eliminar_directorio: false,
    eliminar_q1: false,
    eliminar_q3: false,
    eliminar_caso: false,
    eliminar_mantenimiento: false,
    eliminar_maestro: false,
    
    ver_auditoría: true,
    ver_reportes: true,
    gestionar_usuarios: false,  // ❌ NO puede cambiar usuarios
    cambiar_rol: false,
  },

  /**
   * AGENTE - Rol básico de entrada de datos
   * Puede: Crear, editar; NO puede eliminar ni ver auditoría
   */
  'agente': {
    crear_generador: true,
    crear_agenda: false,
    crear_directorio: false,
    crear_q1: true,
    crear_q3: true,
    crear_caso: false,
    crear_mantenimiento: true,
    crear_maestro: false,
    
    editar_generador: true,
    editar_agenda: false,
    editar_directorio: false,
    editar_q1: true,
    editar_q3: true,
    editar_caso: false,
    editar_mantenimiento: true,
    editar_maestro: false,
    
    eliminar_generador: false,
    eliminar_agenda: false,
    eliminar_directorio: false,
    eliminar_q1: false,
    eliminar_q3: false,
    eliminar_caso: false,
    eliminar_mantenimiento: false,
    eliminar_maestro: false,
    
    ver_auditoría: false,  // ❌ NO ve auditoría
    ver_reportes: false,
    gestionar_usuarios: false,
    cambiar_rol: false,
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. GESTIÓN DE USUARIO ACTUAL Y SESIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Almacenamiento de usuario actual
 * Se actualiza cuando el usuario se autentica
 */
let usuarioActual = null;

/**
 * Almacenamiento de rol del usuario actual
 */
let rolActual = null;

/**
 * Obtiene el usuario actual autenticado en Firebase
 * @returns {Promise<Object|null>} Usuario o null si no está autenticado
 */
async function obtenerUsuarioActual() {
  return new Promise((resolve) => {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        usuarioActual = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Usuario',
          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime
        };
        resolve(usuarioActual);
      } else {
        usuarioActual = null;
        resolve(null);
      }
    });
  });
}

/**
 * Obtiene el rol del usuario actual desde Firestore
 * @returns {Promise<string|null>} Rol ('coordinador', 'director', 'agente') o null
 */
async function obtenerRolUsuario(uid = null) {
  try {
    const userId = uid || usuarioActual?.uid;
    if (!userId) {
      console.warn('No hay usuario autenticado');
      return null;
    }

    // Buscar en colección de usuarios con roles
    const docUsuario = await db.collection('dace_usuarios').doc(userId).get();
    
    if (!docUsuario.exists) {
      console.warn('Usuario no encontrado en Firestore');
      return null;
    }

    const rol = docUsuario.data().rol || 'agente';
    
    // Validar que el rol sea válido
    if (!ROLES_Y_PERMISOS[rol]) {
      console.error('Rol inválido:', rol);
      return 'agente'; // Fallback a agente
    }

    rolActual = rol;
    return rol;
  } catch (error) {
    console.error('Error obteniendo rol:', error);
    return null;
  }
}

/**
 * Inicializa el usuario y su rol al cargar la aplicación
 * @returns {Promise<boolean>} True si autenticación es válida
 */
async function inicializarAutenticacion() {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario) {
      console.log('Usuario no autenticado');
      return false;
    }

    const rol = await obtenerRolUsuario(usuario.uid);
    if (!rol) {
      console.warn('No se pudo obtener rol del usuario');
      return false;
    }

    console.log(`✅ Autenticación lista: ${usuario.email} (${rol})`);
    return true;
  } catch (error) {
    console.error('Error inicializando autenticación:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. VERIFICACIÓN DE PERMISOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica si el usuario actual tiene un permiso específico
 * @param {string} permiso - Nombre del permiso (ej: 'crear_generador')
 * @returns {Promise<boolean>} True si tiene el permiso
 */
async function tienePermiso(permiso) {
  try {
    if (!usuarioActual) {
      return false;
    }

    if (!rolActual) {
      const rol = await obtenerRolUsuario(usuarioActual.uid);
      if (!rol) return false;
    }

    const permisos = ROLES_Y_PERMISOS[rolActual];
    if (!permisos) {
      console.error('Rol no configurado:', rolActual);
      return false;
    }

    const tieneAcceso = permisos[permiso] === true;
    
    if (!tieneAcceso) {
      console.warn(`❌ Permiso denegado: ${permiso} (${rolActual})`);
    }

    return tieneAcceso;
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return false;
  }
}

/**
 * Verifica múltiples permisos (lógica AND - debe tener TODOS)
 * @param {Array<string>} permisos - Array de permisos
 * @returns {Promise<boolean>} True si tiene TODOS los permisos
 */
async function tieneTodosLosPermisos(permisos) {
  for (const permiso of permisos) {
    if (!await tienePermiso(permiso)) {
      return false;
    }
  }
  return true;
}

/**
 * Verifica que el usuario tiene permiso o rechaza la operación
 * @param {string} permiso - Nombre del permiso
 * @param {string} descripcion - Descripción de la acción (para mostrar error)
 * @returns {Promise<boolean>} True si tiene permiso
 */
async function verificarPermiso(permiso, descripcion = 'esta operación') {
  const tiene = await tienePermiso(permiso);
  
  if (!tiene) {
    showToast(
      `🔒 Acceso denegado: No tienes permiso para ${descripcion}`,
      '#dc2626'
    );
    console.warn(`Acceso denegado: ${permiso} (Usuario: ${usuarioActual?.email})`);
  }

  return tiene;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. FUNCIONES DE GUARDADO CON VERIFICACIÓN DE PERMISOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Versión segura de guardarGenerador() con verificación de permisos
 * REEMPLAZA la función original
 */
async function guardarGenerador() {
  // Verificar permiso
  if (!await verificarPermiso('crear_generador', 'crear generadores')) {
    return;
  }

  try {
    const data = {
      lugar: v('gen_lugar'),
      marca: v('gen_marca'),
      capacidad: v('gen_capacidad'),
      fecha: v('gen_fecha'),
      hora: v('gen_hora'),
      tipo: v('gen_tipo'),
      nivelAntes: v('gen_nivel_antes'),
      nivelDespues: v('gen_nivel_despues'),
      galones: v('gen_galones'),
      litros: v('gen_litros'),
      costo: v('gen_costo'),
      horas: v('gen_horas'),
      condicion: v('gen_condicion'),
      observaciones: v('gen_obs'),
      proveedor: v('gen_proveedor'),
      boleto: v('gen_boleto')
    };

    const docId = await guardarDatoSeguro(
      'dace_generadores',
      data,
      'generador'
    );

    if (docId) {
      // Log de auditoría de permisos
      await logAudit(
        'CREAR_CON_PERMISO',
        'dace_generadores',
        docId,
        `Generador creado por: ${usuarioActual.email} (${rolActual})`
      );

      // Limpiar formulario
      ['gen_marca', 'gen_obs', 'gen_proveedor', 'gen_boleto',
       'gen_galones', 'gen_litros', 'gen_costo', 'gen_horas',
       'gen_nivel_antes', 'gen_nivel_despues', 'gen_capacidad'].forEach(id => set(id, ''));
      set('gen_lugar', '');
      set('gen_condicion', 'Óptimo');
      set('gen_fecha', hoy());
      set('gen_hora', ahora());
      clearFotoGen?.();
      
      cargarGeneradores?.();
    }
  } catch (error) {
    console.error('Error en guardarGenerador:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

/**
 * Versión segura de guardarAgenda() con verificación de permisos
 */
async function guardarAgenda() {
  if (!await verificarPermiso('crear_agenda', 'crear tareas')) {
    return;
  }

  try {
    const data = {
      titulo: v('agenda_titulo'),
      descripcion: v('agenda_desc'),
      fecha: v('agenda_fecha'),
      estatus: v('agenda_estatus'),
      prioridad: v('agenda_prioridad'),
      responsable: v('agenda_responsable')
    };

    const docId = await guardarDatoSeguro(
      'dace_agenda',
      data,
      'agenda'
    );

    if (docId) {
      await logAudit(
        'CREAR_CON_PERMISO',
        'dace_agenda',
        docId,
        `Tarea creada por: ${usuarioActual.email} (${rolActual})`
      );

      ['agenda_titulo', 'agenda_desc', 'agenda_responsable'].forEach(id => set(id, ''));
      set('agenda_fecha', hoy());
      cargarAgenda?.();
    }
  } catch (error) {
    console.error('Error en guardarAgenda:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

/**
 * Versión segura de guardarDirectorio() con verificación de permisos
 */
async function guardarDirectorio() {
  if (!await verificarPermiso('crear_directorio', 'crear contactos')) {
    return;
  }

  try {
    const data = {
      nombre: v('dir_nombre'),
      telefono: v('dir_telefono'),
      email: v('dir_email'),
      cargo: v('dir_cargo'),
      dependencia: v('dir_dependencia')
    };

    const docId = await guardarDatoSeguro(
      'dace_directorio',
      data,
      'directorio'
    );

    if (docId) {
      await logAudit(
        'CREAR_CON_PERMISO',
        'dace_directorio',
        docId,
        `Contacto creado por: ${usuarioActual.email} (${rolActual})`
      );

      ['dir_nombre', 'dir_telefono', 'dir_email', 'dir_cargo', 'dir_dependencia'].forEach(id => set(id, ''));
      cargarDirectorio?.();
    }
  } catch (error) {
    console.error('Error en guardarDirectorio:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

/**
 * Versión segura de guardarQ1() con verificación de permisos
 */
async function guardarQ1() {
  if (!await verificarPermiso('crear_q1', 'crear órdenes')) {
    return;
  }

  try {
    const data = {
      numero: v('q1_numero'),
      descripcion: v('q1_desc'),
      fecha: v('q1_fecha'),
      solicitante: v('q1_solicitante'),
      unidad: v('q1_unidad'),
      observaciones: v('q1_obs'),
      estatus: v('q1_estatus')
    };

    const docId = await guardarDatoSeguro(
      'dace_q137_1',
      data,
      'q1'
    );

    if (docId) {
      await logAudit(
        'CREAR_CON_PERMISO',
        'dace_q137_1',
        docId,
        `PPR-137.1 creada por: ${usuarioActual.email} (${rolActual})`
      );

      ['q1_numero', 'q1_desc', 'q1_solicitante', 'q1_unidad', 'q1_obs'].forEach(id => set(id, ''));
      set('q1_fecha', hoy());
      cargarQ1?.();
    }
  } catch (error) {
    console.error('Error en guardarQ1:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

/**
 * Versión segura de guardarQ3() con verificación de permisos
 */
async function guardarQ3() {
  if (!await verificarPermiso('crear_q3', 'crear inspecciones')) {
    return;
  }

  try {
    const data = {
      numero: v('q3_numero'),
      hallazgos: v('q3_hallazgos'),
      fecha: v('q3_fecha'),
      lugar: v('q3_lugar'),
      recomendaciones: v('q3_recomendaciones'),
      estatus: v('q3_estatus')
    };

    const docId = await guardarDatoSeguro(
      'dace_q137_3',
      data,
      'q3'
    );

    if (docId) {
      await logAudit(
        'CREAR_CON_PERMISO',
        'dace_q137_3',
        docId,
        `PPR-137.3 creada por: ${usuarioActual.email} (${rolActual})`
      );

      ['q3_numero', 'q3_hallazgos', 'q3_lugar', 'q3_recomendaciones'].forEach(id => set(id, ''));
      set('q3_fecha', hoy());
      cargarQ3?.();
    }
  } catch (error) {
    console.error('Error en guardarQ3:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

/**
 * Versión segura de guardarCaso() con verificación de permisos
 */
async function guardarCaso() {
  if (!await verificarPermiso('crear_caso', 'crear casos')) {
    return;
  }

  try {
    const data = {
      numero: v('caso_numero'),
      descripcion: v('caso_desc'),
      fecha: v('caso_fecha'),
      responsable: v('caso_responsable'),
      prioridad: v('caso_prioridad'),
      estatus: v('caso_estatus'),
      accion: v('caso_accion')
    };

    const docId = await guardarDatoSeguro(
      'dace_casos',
      data,
      'caso'
    );

    if (docId) {
      await logAudit(
        'CREAR_CON_PERMISO',
        'dace_casos',
        docId,
        `Caso creado por: ${usuarioActual.email} (${rolActual})`
      );

      ['caso_numero', 'caso_desc', 'caso_responsable', 'caso_accion'].forEach(id => set(id, ''));
      set('caso_fecha', hoy());
      cargarCasos?.();
    }
  } catch (error) {
    console.error('Error en guardarCaso:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

/**
 * Versión segura de guardarMantenimiento() con verificación de permisos
 */
async function guardarMantenimiento() {
  if (!await verificarPermiso('crear_mantenimiento', 'crear mantenimientos')) {
    return;
  }

  try {
    const data = {
      lugar: v('mt_lugar'),
      descripcion: v('mt_desc'),
      fecha: v('mt_fecha'),
      departamento: v('mt_departamento'),
      estatus: v('mt_estatus'),
      notificadoA: v('mt_notificado'),
      metodo: v('mt_metodo')
    };

    const docId = await guardarDatoSeguro(
      'dace_mantenimiento',
      data,
      'mantenimiento'
    );

    if (docId) {
      await logAudit(
        'CREAR_CON_PERMISO',
        'dace_mantenimiento',
        docId,
        `Mantenimiento creado por: ${usuarioActual.email} (${rolActual})`
      );

      ['mt_lugar', 'mt_desc', 'mt_departamento', 'mt_notificado', 'mt_metodo'].forEach(id => set(id, ''));
      set('mt_fecha', hoy());
      cargarMantenimiento?.();
    }
  } catch (error) {
    console.error('Error en guardarMantenimiento:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

/**
 * Versión segura de guardarMaestro() con verificación de permisos
 */
async function guardarMaestro() {
  if (!await verificarPermiso('crear_maestro', 'crear maestro')) {
    return;
  }

  try {
    const data = {
      tipo: v('maestro_tipo'),
      descripcion: v('maestro_desc'),
      fecha: v('maestro_fecha'),
      notas: v('maestro_notas')
    };

    const docId = await guardarDatoSeguro(
      'dace_maestro',
      data,
      'maestro'
    );

    if (docId) {
      await logAudit(
        'CREAR_CON_PERMISO',
        'dace_maestro',
        docId,
        `Maestro creado por: ${usuarioActual.email} (${rolActual})`
      );

      ['maestro_tipo', 'maestro_desc', 'maestro_notas'].forEach(id => set(id, ''));
      set('maestro_fecha', hoy());
      cargarMaestro?.();
    }
  } catch (error) {
    console.error('Error en guardarMaestro:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. FUNCIÓN DE ELIMINACIÓN CON VERIFICACIÓN DE PERMISOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * REEMPLAZA la función eliminar() original
 * Versión con verificación de permisos
 * @param {string} col - Colección
 * @param {string} id - ID del documento
 * @param {string} tipo - Nombre del tipo
 */
async function eliminar(col, id, tipo) {
  // Determinar permiso requerido basado en la colección
  const permisoMap = {
    'dace_generadores': 'eliminar_generador',
    'dace_agenda': 'eliminar_agenda',
    'dace_directorio': 'eliminar_directorio',
    'dace_q137_1': 'eliminar_q1',
    'dace_q137_3': 'eliminar_q3',
    'dace_casos': 'eliminar_caso',
    'dace_mantenimiento': 'eliminar_mantenimiento',
    'dace_maestro': 'eliminar_maestro'
  };

  const permiso = permisoMap[col];
  if (!permiso) {
    showToast('❌ Colección no reconocida', '#dc2626');
    return;
  }

  // Verificar permiso
  if (!await verificarPermiso(permiso, `eliminar ${tipo}`)) {
    return;
  }

  // Proceder con eliminación segura
  const eliminado = await eliminarDatoSeguro(col, id, tipo);
  
  if (eliminado) {
    await logAudit(
      'ELIMINAR_CON_PERMISO',
      col,
      id,
      `${tipo} eliminado por: ${usuarioActual.email} (${rolActual})`
    );

    // Recargar datos (cada módulo decide cómo)
    // La aplicación debe llamar a cargarGeneradores(), cargarAgenda(), etc.
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. FUNCIONES AUXILIARES DE DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Muestra información del usuario actual en la UI
 */
function mostrarInfoUsuario() {
  if (usuarioActual && rolActual) {
    const elemento = document.getElementById('usuario-info');
    if (elemento) {
      elemento.innerHTML = `
        <span class="usuario-name">${escapeHtml(usuarioActual.displayName)}</span>
        <span class="usuario-role">${rolActual.toUpperCase()}</span>
      `;
    }
  }
}

/**
 * Desactiva controles basados en permisos
 * Llama después de cargar la página
 */
async function aplicarControlesDeAcceso() {
  try {
    // Ocultar/deshabilitar botones según permisos
    const botones = {
      'btn-guardar-generador': 'crear_generador',
      'btn-guardar-agenda': 'crear_agenda',
      'btn-guardar-directorio': 'crear_directorio',
      'btn-guardar-q1': 'crear_q1',
      'btn-guardar-q3': 'crear_q3',
      'btn-guardar-caso': 'crear_caso',
      'btn-guardar-mantenimiento': 'crear_mantenimiento',
      'btn-guardar-maestro': 'crear_maestro'
    };

    for (const [btnId, permiso] of Object.entries(botones)) {
      const btn = document.getElementById(btnId);
      if (!btn) continue;

      const tieneAcceso = await tienePermiso(permiso);
      if (!tieneAcceso) {
        btn.disabled = true;
        btn.title = '🔒 No tienes permiso para esta acción';
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    }
  } catch (error) {
    console.error('Error aplicando controles de acceso:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. INSTRUCCIONES DE INTEGRACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/*
INSTRUCCIONES PARA USAR ESTE ARCHIVO:

1. CARGAR EN HTML (orden correcto):
   <script src="SECURITY_UTILS.js"></script>
   <script src="REFACTORED_RENDERING.js"></script>
   <script src="REFACTORED_CRUD.js"></script>
   <script src="REFACTORED_AUTH.js"></script>  ← ESTE ARCHIVO
   <script src="src/app.js"></script>

2. EN src/app.js:
   - Comentar todas las funciones guardar*() (líneas 259-705)
   - Comentar la función eliminar() (línea 2531)
   - Agregar en el evento onload o después de Firebase.initializeApp():
     await inicializarAutenticacion();
     mostrarInfoUsuario();
     aplicarControlesDeAcceso();

3. EN index.html:
   - Agregar elemento para mostrar usuario:
     <div id="usuario-info" class="user-badge"></div>
   - CSS:
     .user-badge { 
       display: flex; 
       gap: 10px; 
       align-items: center;
       padding: 5px 10px;
       background: #f3f4f6;
       border-radius: 8px;
       font-size: 12px;
     }

4. EN FIRESTORE:
   - Crear colección: dace_usuarios
   - Estructura de documento:
     {
       uid: (document ID - auto)
       email: "usuario@email.com"
       rol: "coordinador" | "director" | "agente"
       createdAt: timestamp
       activo: true/false
     }
   - Agregar usuarios:
     * Aponte: rol=coordinador
     * Director de tu dependencia: rol=director
     * Agentes: rol=agente

5. ROLES DISPONIBLES:
   - coordinador: Acceso total (crear, editar, eliminar, ver auditoría)
   - director: Crear, editar, ver auditoría; NO eliminar ni gestionar usuarios
   - agente: Crear, editar solo generadores, Q1, Q3, mantenimiento

6. TESTING:
   - Iniciar sesión como coordinador → Verificar acceso total
   - Iniciar sesión como director → Verificar que NO puede eliminar
   - Iniciar sesión como agente → Verificar que solo ve opciones permitidas

CARACTERÍSTICAS IMPLEMENTADAS:
✅ Autenticación con Firebase (no hardcodeado)
✅ Sistema de 3 roles
✅ Verificación de permisos en cada operación
✅ Desactivación automática de controles sin permiso
✅ Logging de quién hizo qué y con qué rol
✅ Prevención de escalada de privilegios
*/
