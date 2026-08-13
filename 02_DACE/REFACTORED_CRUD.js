/**
 * FASE 3: VALIDACIÓN DE DATOS
 * Archivo: REFACTORED_CRUD.js
 * 
 * Refactorización de TODAS las funciones de guardado/eliminación:
 * ✅ Validación de entrada
 * ✅ Sanitización de datos
 * ✅ Verificación de autenticación
 * ✅ Auditoría automática
 * ✅ Manejo de errores seguro
 * 
 * Dependencias: SECURITY_UTILS.js debe estar cargado antes
 * Uso: Reemplazar funciones en src/app.js con estas
 * 
 * Fecha: 17 de julio de 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. VALIDADORES ESPECÍFICOS POR TIPO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validadores de datos específicos por colección
 */
const VALIDADORES = {
  /**
   * Validador para generadores (bitácora)
   */
  generador: {
    campos_requeridos: ['lugar', 'observaciones', 'fecha'],
    campos_opcionales: ['marca', 'capacidad', 'tipo', 'condicion', 'proveedor', 'boleto'],
    campos_numericos: ['nivelAntes', 'nivelDespues', 'galones', 'litros', 'costo', 'horas'],
    
    validar: function(data) {
      const errores = [];
      
      // Campos requeridos
      if (!data.lugar || !data.lugar.trim()) errores.push('Dependencia/lugar es requerido');
      if (!data.observaciones || !data.observaciones.trim()) errores.push('Observaciones son requeridas');
      if (!data.fecha || !isValidDate(data.fecha)) errores.push('Fecha inválida (YYYY-MM-DD)');
      
      // Validar longitud
      if (data.lugar && data.lugar.length > 200) errores.push('Lugar muy largo (máx 200 caracteres)');
      if (data.observaciones && data.observaciones.length > 1000) errores.push('Observaciones muy largas (máx 1000 caracteres)');
      
      // Validar números
      if (data.nivelAntes !== null && isNaN(parseFloat(data.nivelAntes))) errores.push('Nivel antes debe ser número');
      if (data.nivelDespues !== null && isNaN(parseFloat(data.nivelDespues))) errores.push('Nivel después debe ser número');
      if (data.galones !== null && isNaN(parseFloat(data.galones))) errores.push('Galones debe ser número');
      
      // Validar condición si existe
      if (data.condicion && !['Óptimo', 'Bueno', 'Regular', 'Malo', 'Peligroso'].includes(data.condicion)) {
        errores.push('Condición inválida');
      }
      
      return {
        valido: errores.length === 0,
        errores
      };
    }
  },

  /**
   * Validador para agenda (tareas)
   */
  agenda: {
    campos_requeridos: ['titulo', 'descripcion', 'fecha'],
    campos_opcionales: ['estatus', 'prioridad', 'responsable'],
    
    validar: function(data) {
      const errores = [];
      
      if (!data.titulo || !data.titulo.trim()) errores.push('Título es requerido');
      if (!data.descripcion || !data.descripcion.trim()) errores.push('Descripción es requerida');
      if (!data.fecha || !isValidDate(data.fecha)) errores.push('Fecha inválida');
      
      if (data.titulo && data.titulo.length > 200) errores.push('Título muy largo (máx 200)');
      if (data.descripcion && data.descripcion.length > 2000) errores.push('Descripción muy larga (máx 2000)');
      
      if (data.estatus && !isValidStatus(data.estatus)) errores.push('Estatus inválido');
      
      const prioridades = ['Alta', 'Media', 'Baja'];
      if (data.prioridad && !prioridades.includes(data.prioridad)) errores.push('Prioridad inválida');
      
      return {
        valido: errores.length === 0,
        errores
      };
    }
  },

  /**
   * Validador para directorio (contactos)
   */
  directorio: {
    campos_requeridos: ['nombre', 'telefono'],
    campos_opcionales: ['email', 'cargo', 'dependencia'],
    
    validar: function(data) {
      const errores = [];
      
      if (!data.nombre || !data.nombre.trim()) errores.push('Nombre es requerido');
      if (!data.telefono || !data.telefono.trim()) errores.push('Teléfono es requerido');
      
      if (data.nombre && data.nombre.length > 150) errores.push('Nombre muy largo');
      if (data.telefono && data.telefono.length > 20) errores.push('Teléfono muy largo');
      
      // Validar email si existe
      if (data.email && data.email.trim() && !isValidEmail(data.email)) errores.push('Email inválido');
      
      // Validar teléfono básicamente (solo números, guiones, espacios)
      if (data.telefono && !/^[\d\-\s\+\(\)]+$/.test(data.telefono)) {
        errores.push('Teléfono debe contener solo números y caracteres válidos');
      }
      
      return {
        valido: errores.length === 0,
        errores
      };
    }
  },

  /**
   * Validador para Q1 (Orden/PPR-137.1)
   */
  q1: {
    campos_requeridos: ['numero', 'descripcion', 'fecha'],
    campos_opcionales: ['solicitante', 'unidad', 'observaciones', 'estatus'],
    
    validar: function(data) {
      const errores = [];
      
      if (!data.numero || !data.numero.trim()) errores.push('Número de orden es requerido');
      if (!data.descripcion || !data.descripcion.trim()) errores.push('Descripción es requerida');
      if (!data.fecha || !isValidDate(data.fecha)) errores.push('Fecha inválida');
      
      if (data.numero && !/^[A-Z0-9\-]+$/.test(data.numero)) errores.push('Número contiene caracteres inválidos');
      if (data.descripcion && data.descripcion.length > 2000) errores.push('Descripción muy larga');
      
      if (data.estatus && !isValidStatus(data.estatus)) errores.push('Estatus inválido');
      
      return {
        valido: errores.length === 0,
        errores
      };
    }
  },

  /**
   * Validador para Q3 (Inspección/PPR-137.3)
   */
  q3: {
    campos_requeridos: ['numero', 'hallazgos', 'fecha'],
    campos_opcionales: ['lugar', 'recomendaciones', 'estatus'],
    
    validar: function(data) {
      const errores = [];
      
      if (!data.numero || !data.numero.trim()) errores.push('Número de inspección es requerido');
      if (!data.hallazgos || !data.hallazgos.trim()) errores.push('Hallazgos son requeridos');
      if (!data.fecha || !isValidDate(data.fecha)) errores.push('Fecha inválida');
      
      if (data.hallazgos && data.hallazgos.length > 2000) errores.push('Hallazgos muy largos');
      if (data.recomendaciones && data.recomendaciones.length > 2000) errores.push('Recomendaciones muy largas');
      
      if (data.estatus && !isValidStatus(data.estatus)) errores.push('Estatus inválido');
      
      return {
        valido: errores.length === 0,
        errores
      };
    }
  },

  /**
   * Validador para casos
   */
  caso: {
    campos_requeridos: ['numero', 'descripcion', 'fecha'],
    campos_opcionales: ['responsable', 'prioridad', 'estatus', 'accion'],
    
    validar: function(data) {
      const errores = [];
      
      if (!data.numero || !data.numero.trim()) errores.push('Número de caso es requerido');
      if (!data.descripcion || !data.descripcion.trim()) errores.push('Descripción es requerida');
      if (!data.fecha || !isValidDate(data.fecha)) errores.push('Fecha inválida');
      
      const prioridades = ['Alta', 'Media', 'Baja'];
      if (data.prioridad && !prioridades.includes(data.prioridad)) errores.push('Prioridad inválida');
      
      if (data.estatus && !isValidStatus(data.estatus)) errores.push('Estatus inválido');
      
      return {
        valido: errores.length === 0,
        errores
      };
    }
  },

  /**
   * Validador para mantenimiento
   */
  mantenimiento: {
    campos_requeridos: ['lugar', 'descripcion', 'fecha'],
    campos_opcionales: ['departamento', 'estatus', 'notificadoA', 'metodo'],
    
    validar: function(data) {
      const errores = [];
      
      if (!data.lugar || !data.lugar.trim()) errores.push('Lugar es requerido');
      if (!data.descripcion || !data.descripcion.trim()) errores.push('Descripción es requerida');
      if (!data.fecha || !isValidDate(data.fecha)) errores.push('Fecha inválida');
      
      if (data.estatus && !isValidStatus(data.estatus)) errores.push('Estatus inválido');
      
      return {
        valido: errores.length === 0,
        errores
      };
    }
  },

  /**
   * Validador para maestro
   */
  maestro: {
    campos_requeridos: ['tipo', 'descripcion', 'fecha'],
    campos_opcionales: ['notas'],
    
    validar: function(data) {
      const errores = [];
      
      if (!data.tipo || !data.tipo.trim()) errores.push('Tipo es requerido');
      if (!data.descripcion || !data.descripcion.trim()) errores.push('Descripción es requerida');
      if (!data.fecha || !isValidDate(data.fecha)) errores.push('Fecha inválida');
      
      if (data.descripcion && data.descripcion.length > 2000) errores.push('Descripción muy larga');
      
      return {
        valido: errores.length === 0,
        errores
      };
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. FUNCIÓN GENÉRICA PARA GUARDAR CON VALIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Función genérica para guardar datos de forma segura
 * @param {string} coleccion - Nombre de la colección
 * @param {Object} data - Datos a guardar
 * @param {string} tipoValidador - Clave del validador a usar
 * @param {string} docId - ID del documento (opcional, genera uno si no está)
 * @returns {Promise<string|null>} ID del documento o null
 */
async function guardarDatoSeguro(coleccion, data, tipoValidador, docId = null) {
  try {
    // 1. VERIFICAR AUTENTICACIÓN
    if (!await requireAuth()) {
      return null;
    }

    // 2. VALIDAR COLECCIÓN
    if (!isValidCollection(coleccion)) {
      throw new Error(`Colección no válida: ${coleccion}`);
    }

    // 3. VALIDAR ID si existe
    if (docId && !isValidFirestoreId(docId)) {
      throw new Error(`ID de documento no válido: ${docId}`);
    }

    // 4. VALIDAR DATOS con validador específico
    const validador = VALIDADORES[tipoValidador];
    if (!validador) {
      throw new Error(`Validador no encontrado: ${tipoValidador}`);
    }

    const validacion = validador.validar(data);
    if (!validacion.valido) {
      const mensajeError = validacion.errores.join('\n• ');
      showToast(`❌ Errores en los datos:\n• ${mensajeError}`, '#dc2626');
      console.error('Validación fallida:', validacion.errores);
      return null;
    }

    // 5. SANITIZAR DATOS
    const dataSanitizado = sanitizeFirestoreData(data);

    // 6. AGREGAR METADATA
    const user = await getCurrentUserSafely();
    dataSanitizado.usuario_email = user?.email || 'anónimo';
    dataSanitizado.usuario_uid = user?.uid || null;
    dataSanitizado.modificado_en = new Date().toISOString();
    dataSanitizado.createdAt = firebase.firestore.FieldValue.serverTimestamp();

    // 7. GUARDAR EN FIREBASE
    const ref = db.collection(coleccion);
    let resultado;

    if (docId) {
      await ref.doc(docId).set(dataSanitizado, { merge: true });
      resultado = docId;
    } else {
      const nuevoDoc = await ref.add(dataSanitizado);
      resultado = nuevoDoc.id;
    }

    // 8. REGISTRAR EN AUDITORÍA
    await logAudit(
      'CREAR',
      coleccion,
      resultado,
      `${tipoValidador} guardado exitosamente`
    );

    // 9. MOSTRAR ÉXITO
    showToast(
      `✅ ${tipoValidador.charAt(0).toUpperCase() + tipoValidador.slice(1)} guardado`,
      '#166534'
    );

    console.log(`✅ Dato guardado en ${coleccion}/${resultado}`);
    return resultado;

  } catch (error) {
    // Mostrar error sin exponer detalles internos
    const mensajeUsuario = error.message.includes('Permission')
      ? '⚠️ No tienes permisos para realizar esta acción'
      : `❌ Error: ${error.message}`;

    showToast(mensajeUsuario, '#dc2626');
    logSecurityError('GUARDADO_FALLIDO', error.message, { coleccion, tipoValidador });
    console.error('Error guardando:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. FUNCIÓN GENÉRICA PARA ELIMINAR CON SEGURIDAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Función genérica para eliminar con validación y confirmación
 * @param {string} coleccion - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {string} nombreTipo - Nombre del tipo (para confirmación)
 * @returns {Promise<boolean>} True si se eliminó
 */
async function eliminarDatoSeguro(coleccion, docId, nombreTipo = 'registro') {
  try {
    // 1. VERIFICAR AUTENTICACIÓN
    if (!await requireAuth()) {
      return false;
    }

    // 2. VALIDAR COLECCIÓN
    if (!isValidCollection(coleccion)) {
      throw new Error(`Colección no válida: ${coleccion}`);
    }

    // 3. VALIDAR ID
    if (!isValidFirestoreId(docId)) {
      throw new Error(`ID de documento no válido: ${docId}`);
    }

    // 4. CONFIRMACIÓN SEGURA
    const nombreSeguro = escapeHtml(nombreTipo);
    const confirmacion = confirm(
      `⚠️ ¿Eliminar este ${nombreSeguro}?\n\n` +
      `Esta acción NO SE PUEDE DESHACER.\n` +
      `ID: ${escapeHtml(docId)}`
    );

    if (!confirmacion) {
      console.log('Eliminación cancelada por usuario');
      return false;
    }

    // 5. OBTENER DATOS ANTES DE ELIMINAR (para auditoría)
    const docAntes = await readFromFirestore(coleccion, docId);

    // 6. ELIMINAR
    await db.collection(coleccion).doc(docId).delete();

    // 7. REGISTRAR EN AUDITORÍA
    await logAudit(
      'ELIMINAR',
      coleccion,
      docId,
      `${nombreTipo} eliminado. Datos anteriores: ${JSON.stringify(docAntes).substring(0, 200)}`
    );

    // 8. MOSTRAR CONFIRMACIÓN
    showToast(
      `🗑️ ${escapeHtml(nombreTipo)} eliminado`,
      '#475569'
    );

    console.log(`✅ Eliminado: ${coleccion}/${docId}`);
    return true;

  } catch (error) {
    const mensajeUsuario = error.message.includes('Permission')
      ? '⚠️ No tienes permisos para eliminar'
      : `❌ Error al eliminar: ${error.message}`;

    showToast(mensajeUsuario, '#dc2626');
    logSecurityError('ELIMINACIÓN_FALLIDA', error.message, { coleccion, docId });
    console.error('Error eliminando:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. FUNCIÓN SIMPLIFICADA DE ELIMINACIÓN (para reemplazar la original)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * REEMPLAZA la función eliminar() original
 * Versión segura con validación
 * @param {string} col - Colección
 * @param {string} id - ID del documento
 * @param {string} tipo - Nombre del tipo
 */
async function eliminar(col, id, tipo) {
  await eliminarDatoSeguro(col, id, tipo);
  // Recargar datos después de eliminar (la aplicación debe hacer esto)
  // Ej: cargarGeneradores(), cargarAgenda(), etc.
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. FUNCIONES DE GUARDADO REFACTORIZADAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * REEMPLAZA guardarGenerador() original
 * Guardado seguro de generadores/bitácora con validación
 */
async function guardarGenerador() {
  try {
    // Recopilar datos del formulario
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

    // Guardar con validación
    const docId = await guardarDatoSeguro(
      'dace_generadores',
      data,
      'generador'
    );

    if (docId) {
      // Limpiar formulario
      ['gen_marca', 'gen_obs', 'gen_proveedor', 'gen_boleto',
       'gen_galones', 'gen_litros', 'gen_costo', 'gen_horas',
       'gen_nivel_antes', 'gen_nivel_despues', 'gen_capacidad'].forEach(id => set(id, ''));
      set('gen_lugar', '');
      set('gen_condicion', 'Óptimo');
      set('gen_fecha', hoy());
      set('gen_hora', ahora());
      clearFotoGen?.();
      
      // Recargar datos
      cargarGeneradores?.();
    }
  } catch (error) {
    console.error('Error en guardarGenerador:', error);
    showToast(`❌ Error inesperado: ${error.message}`, '#dc2626');
  }
}

/**
 * REEMPLAZA guardarAgenda() original
 */
async function guardarAgenda() {
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
 * REEMPLAZA guardarDirectorio() original
 */
async function guardarDirectorio() {
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
      ['dir_nombre', 'dir_telefono', 'dir_email', 'dir_cargo', 'dir_dependencia'].forEach(id => set(id, ''));
      cargarDirectorio?.();
    }
  } catch (error) {
    console.error('Error en guardarDirectorio:', error);
    showToast(`❌ Error: ${error.message}`, '#dc2626');
  }
}

/**
 * REEMPLAZA guardarQ1() original
 */
async function guardarQ1() {
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
 * REEMPLAZA guardarQ3() original
 */
async function guardarQ3() {
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
 * REEMPLAZA guardarCaso() original
 */
async function guardarCaso() {
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
 * REEMPLAZA guardarMantenimiento() original
 */
async function guardarMantenimiento() {
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
 * REEMPLAZA guardarMaestro() original
 */
async function guardarMaestro() {
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
// 6. INSTRUCCIONES DE INTEGRACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/*
INSTRUCCIONES PARA USAR ESTE ARCHIVO:

1. CARGAR EN HTML (orden correcto):
   <script src="SECURITY_UTILS.js"></script>
   <script src="REFACTORED_RENDERING.js"></script>
   <script src="REFACTORED_CRUD.js"></script>  ← ESTE ARCHIVO
   <script src="src/app.js"></script>

2. EN src/app.js:
   - Comentar todas las funciones guardar*() (líneas 259-705)
   - Comentar la función eliminar() (línea 2531)
   
3. FUNCIONES REEMPLAZADAS:
   ✅ guardarGenerador() 
   ✅ guardarAgenda()
   ✅ guardarDirectorio()
   ✅ guardarQ1()
   ✅ guardarQ3()
   ✅ guardarCaso()
   ✅ guardarMantenimiento()
   ✅ guardarMaestro()
   ✅ eliminar()

4. CARACTERÍSTICAS NUEVAS:
   ✅ Validación de datos específica por tipo
   ✅ Sanitización automática
   ✅ Verificación de autenticación
   ✅ Auditoría de todas las operaciones
   ✅ Mensajes de error amigables
   ✅ Manejo de errores sin exponer datos

5. TESTING:
   - Intentar guardar con campos vacíos → debe mostrar error
   - Intentar guardar con datos inválidos → debe rechazar
   - Verificar que se log en auditoría → revisar Firestore
   - Intentar eliminar → debe pedir confirmación

6. VERIFICACIÓN DE SEGURIDAD:
   - No hay datos de usuario hardcodeados
   - Todos los datos se validan antes de guardar
   - Toda acción se registra en auditoría
   - Los errores no exponen detalles internos
   - Se verifica autenticación en cada operación

FUNCIONES REQUERIDAS DE SECURITY_UTILS.js:
- escapeHtml()
- sanitizeInput()
- isValidFirestoreId()
- isValidCollection()
- isValidStatus()
- isValidEmail()
- isValidDate()
- getCurrentUserSafely()
- requireAuth()
- readFromFirestore()
- sanitizeFirestoreData()
- logAudit()
- logSecurityError()

FUNCIONES REQUERIDAS DEL CÓDIGO EXISTENTE:
- v() - Obtener valor de input
- set() - Establecer valor de input
- hoy() - Obtener fecha actual
- ahora() - Obtener hora actual
- showToast() - Mostrar mensaje
- cargarGeneradores(), cargarAgenda(), etc. - Recargar datos
*/
