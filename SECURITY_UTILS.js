/**
 * SECURITY UTILITIES - DACE Arecibo
 * Funciones de seguridad base para evitar XSS, inyecciones y otros ataques
 * 
 * Uso obligatorio en todas las operaciones que manipulen datos de usuario
 * Fecha: 17 de julio de 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. ESCAPE & SANITIZACIÓN HTML
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escapa caracteres HTML especiales para evitar XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Escapa atributos HTML (para usar en onclick, etc.)
 * @param {string} str - String a escapar
 * @returns {string} String seguro para usar en atributos
 */
function escapeAttribute(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Remueve caracteres peligrosos de una cadena
 * @param {string} input - Input del usuario
 * @returns {string} String limpio
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>\"']/g, '')
    .substring(0, 500); // Limitar longitud
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. VALIDACIÓN DE IDs Y DATOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida que un ID sea un Firestore ID válido
 * @param {string} id - ID a validar
 * @returns {boolean} True si es válido
 */
function isValidFirestoreId(id) {
  if (typeof id !== 'string') return false;
  // Firestore IDs: alfanuméricos, guiones, guiones bajos, máximo 255 chars
  return /^[a-zA-Z0-9_-]{1,255}$/.test(id);
}

/**
 * Valida que una colección sea válida
 * @param {string} collection - Nombre de colección
 * @returns {boolean} True si es válido
 */
function isValidCollection(collection) {
  const allowed = [
    'dace_generadores',
    'dace_agenda',
    'dace_directorio',
    'dace_q137_1',
    'dace_q137_3',
    'dace_casos',
    'dace_mantenimiento',
    'dace_archivo',
    'dace_jedi'
  ];
  return allowed.includes(collection);
}

/**
 * Valida que un status sea permitido
 * @param {string} status - Status a validar
 * @returns {boolean} True si es válido
 */
function isValidStatus(status) {
  const allowed = [
    'Pendiente',
    'En Proceso',
    'Completado',
    'Requiere Seguimiento'
  ];
  return allowed.includes(status);
}

/**
 * Valida email básicamente
 * @param {string} email - Email a validar
 * @returns {boolean} True si cumple formato básico
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida que sea una fecha YYYY-MM-DD válida
 * @param {string} date - Fecha a validar
 * @returns {boolean} True si es válida
 */
function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CREACIÓN SEGURA DE ELEMENTOS DOM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Crea un elemento de texto seguro sin riesgo de XSS
 * @param {string} tag - Tag HTML (ej: 'div', 'span')
 * @param {string} text - Contenido de texto
 * @param {Object} attrs - Atributos opcionales
 * @returns {HTMLElement}
 */
function createSafeElement(tag, text = '', attrs = {}) {
  const el = document.createElement(tag);
  if (text) {
    el.textContent = text; // Usa textContent, no innerHTML
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (key.startsWith('on')) {
      // No permitir event handlers en atributos
      console.warn(`Event handler ${key} bloqueado por seguridad`);
      return;
    }
    el.setAttribute(key, escapeAttribute(String(value)));
  });
  return el;
}

/**
 * Crea un botón seguro con event listener
 * @param {string} text - Texto del botón
 * @param {string} className - Clase CSS
 * @param {Function} callback - Función a ejecutar
 * @returns {HTMLElement}
 */
function createSafeButton(text, className, callback) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.className = className;
  btn.addEventListener('click', callback); // Event listener seguro, no inline
  return btn;
}

/**
 * Renderiza una lista segura de items
 * @param {Array} items - Items a renderizar
 * @param {Function} renderFn - Función que renderiza cada item
 * @returns {DocumentFragment}
 */
function renderSafeList(items, renderFn) {
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const el = renderFn(item);
    if (el instanceof HTMLElement) {
      fragment.appendChild(el);
    }
  });
  return fragment;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. OPERACIONES SEGURAS CON FIREBASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el usuario actual de forma segura
 * @returns {Promise<Object|null>} Usuario o null
 */
async function getCurrentUserSafely() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    };
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
}

/**
 * Verifica autenticación antes de operación
 * @returns {Promise<boolean>} True si está autenticado
 */
async function requireAuth() {
  const user = await getCurrentUserSafely();
  if (!user) {
    console.error('Operación bloqueada: Usuario no autenticado');
    alert('Debes estar autenticado para realizar esta acción');
    return false;
  }
  return true;
}

/**
 * Realiza una lectura segura de Firestore
 * @param {string} collection - Nombre de colección
 * @param {string} docId - ID del documento (opcional)
 * @returns {Promise<Array|Object|null>}
 */
async function readFromFirestore(collection, docId = null) {
  try {
    // Validación
    if (!isValidCollection(collection)) {
      throw new Error(`Colección no válida: ${collection}`);
    }
    
    if (docId && !isValidFirestoreId(docId)) {
      throw new Error(`ID de documento no válido: ${docId}`);
    }

    const ref = db.collection(collection);
    
    if (docId) {
      const doc = await ref.doc(docId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } else {
      const snapshot = await ref.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (error) {
    console.error(`Error leyendo ${collection}:`, error);
    return docId ? null : [];
  }
}

/**
 * Realiza una escritura segura a Firestore
 * @param {string} collection - Nombre de colección
 * @param {Object} data - Datos a guardar
 * @param {string} docId - ID del documento (opcional, genera uno si no está)
 * @returns {Promise<string|null>} ID del documento o null
 */
async function writeToFirestore(collection, data, docId = null) {
  try {
    // Validación de usuario
    if (!await requireAuth()) return null;

    // Validación de colección
    if (!isValidCollection(collection)) {
      throw new Error(`Colección no válida: ${collection}`);
    }

    // Validación de ID si existe
    if (docId && !isValidFirestoreId(docId)) {
      throw new Error(`ID de documento no válido: ${docId}`);
    }

    // Sanitizar datos
    const sanitized = sanitizeFirestoreData(data);

    // Agregar metadata
    sanitized.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    sanitized.lastModified = new Date().toISOString();

    const ref = db.collection(collection);
    let result;

    if (docId) {
      await ref.doc(docId).set(sanitized, { merge: true });
      result = docId;
    } else {
      const newDoc = await ref.add(sanitized);
      result = newDoc.id;
    }

    console.log(`Dato guardado en ${collection}: ${result}`);
    return result;
  } catch (error) {
    console.error(`Error escribiendo en ${collection}:`, error);
    alert(`Error guardando datos: ${error.message}`);
    return null;
  }
}

/**
 * Realiza una eliminación segura de Firestore
 * @param {string} collection - Nombre de colección
 * @param {string} docId - ID del documento
 * @returns {Promise<boolean>} True si se eliminó
 */
async function deleteFromFirestore(collection, docId) {
  try {
    // Validación
    if (!await requireAuth()) return false;

    if (!isValidCollection(collection)) {
      throw new Error(`Colección no válida: ${collection}`);
    }

    if (!isValidFirestoreId(docId)) {
      throw new Error(`ID de documento no válido: ${docId}`);
    }

    // Confirmación del usuario
    if (!confirm(`¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.`)) {
      return false;
    }

    await db.collection(collection).doc(docId).delete();
    console.log(`Documento eliminado: ${collection}/${docId}`);
    return true;
  } catch (error) {
    console.error(`Error eliminando de ${collection}:`, error);
    alert(`Error eliminando datos: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. SANITIZACIÓN DE DATOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitiza un objeto completo antes de guardar en Firestore
 * @param {Object} data - Objeto con datos
 * @returns {Object} Objeto sanitizado
 */
function sanitizeFirestoreData(data) {
  const sanitized = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Validar key (solo alfanuméricos y _)
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      console.warn(`Key no válida rechazada: ${key}`);
      return;
    }

    // Sanitizar por tipo
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value; // Los números son seguros
    } else if (typeof value === 'boolean') {
      sanitized[key] = value; // Booleanos son seguros
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => 
        typeof v === 'string' ? sanitizeInput(v) : v
      );
    } else if (value === null || value === undefined) {
      sanitized[key] = null;
    } else {
      console.warn(`Tipo de dato no soportado: ${key}:${typeof value}`);
    }
  });

  return sanitized;
}

/**
 * Valida un objeto de datos completo
 * @param {Object} data - Objeto a validar
 * @param {Array} requiredFields - Campos requeridos
 * @returns {Object} Objeto {valid: boolean, errors: Array}
 */
function validateData(data, requiredFields = []) {
  const errors = [];

  // Verificar campos requeridos
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push(`Campo requerido: ${field}`);
    }
  });

  // Verificar que no esté vacío
  if (Object.keys(data).length === 0) {
    errors.push('No hay datos para guardar');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. UTILIDADES DE LOGGING Y AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registra una acción en la auditoría
 * @param {string} accion - Tipo de acción
 * @param {string} coleccion - Colección afectada
 * @param {string} docId - ID del documento
 * @param {string} detalles - Detalles adicionales
 */
async function logAudit(accion, coleccion, docId, detalles = '') {
  try {
    const user = await getCurrentUserSafely();
    const auditEntry = {
      accion,
      coleccion,
      docId,
      detalles: sanitizeInput(detalles),
      usuario: user?.email || 'anónimo',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      ip: 'NO DISPONIBLE'
    };
    
    // Nota: Guardar en colección separada de auditoría
    // await db.collection('dace_audita').add(auditEntry);
    console.log('[AUDIT]', auditEntry);
  } catch (error) {
    console.error('Error en auditoría:', error);
  }
}

/**
 * Registra un error de seguridad
 * @param {string} tipo - Tipo de error
 * @param {string} mensaje - Mensaje de error
 * @param {Object} contexto - Contexto adicional
 */
function logSecurityError(tipo, mensaje, contexto = {}) {
  const entry = {
    tipo,
    mensaje,
    contexto,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  console.error('[SECURITY ERROR]', entry);
  // Aquí se podría enviar a un servicio de logging remoto
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. EXPORTS (para uso en módulos)
// ═══════════════════════════════════════════════════════════════════════════

// Si usas módulos ES6, descomenta:
// export {
//   escapeHtml,
//   escapeAttribute,
//   sanitizeInput,
//   isValidFirestoreId,
//   isValidCollection,
//   isValidStatus,
//   isValidEmail,
//   isValidDate,
//   createSafeElement,
//   createSafeButton,
//   renderSafeList,
//   getCurrentUserSafely,
//   requireAuth,
//   readFromFirestore,
//   writeToFirestore,
//   deleteFromFirestore,
//   sanitizeFirestoreData,
//   validateData,
//   logAudit,
//   logSecurityError
// };
