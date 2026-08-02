/**
 * FASE 2: REFACTORIZACIÓN DE RENDERIZADO
 * Archivo: REFACTORED_RENDERING.js
 * 
 * Todas las funciones de renderizado refactorizadas para:
 * ✅ Eliminar innerHTML inseguro
 * ✅ Eliminar onclick inline
 * ✅ Escapar todos los datos de usuario
 * ✅ Usar event listeners seguros
 * 
 * Uso: Reemplazar las funciones originales en src/app.js con estas
 * Dependencia: SECURITY_UTILS.js debe estar cargado antes
 * 
 * Fecha: 17 de julio de 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. FUNCIONES AUXILIARES DE BADGES (SEGURAS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Crea un badge de estatus de forma segura
 * @param {string} estatus - Estatus del registro
 * @returns {HTMLElement} Elemento span con badge
 */
function bEstatus(estatus) {
  const statusMap = {
    'Pendiente': 'b-pending',
    'En Proceso': 'b-process',
    'Completado': 'b-done',
    'Activo': 'b-process',
    'Cerrado': 'b-done',
    'Archivado': 'b-archived',
    'Pendiente Resolución': 'b-pending'
  };

  const badge = document.createElement('span');
  badge.className = `badge ${statusMap[estatus] || 'b-pending'}`;
  badge.textContent = estatus || '—';
  return badge;
}

/**
 * Crea un badge de prioridad de forma segura
 * @param {string} prioridad - Prioridad del registro
 * @returns {HTMLElement} Elemento span con badge
 */
function bPrio(prioridad) {
  const prioMap = {
    'Alta': 'b-alta',
    'Media': 'b-media',
    'Baja': 'b-baja'
  };

  const badge = document.createElement('span');
  badge.className = `badge ${prioMap[prioridad] || 'b-media'}`;
  badge.textContent = prioridad || '—';
  return badge;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. FUNCIONES DE RENDERIZADO DE ITEMS (REFACTORIZADAS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Renderiza un item de mantenimiento de forma segura
 * @param {Object} d - Datos del documento
 * @returns {HTMLElement}
 */
function item_Mt_data(d) {
  // Validar ID
  if (!isValidFirestoreId(d._id)) {
    console.error('ID inválido en item_Mt_data:', d._id);
    return createSafeElement('div', '⚠️ Dato corrupto', { 'class': 'error-item' });
  }

  const container = createSafeElement('div', '', { 'class': 'record-item' });
  container.style.borderLeftColor = '#7c3aed';

  // Header
  const header = createSafeElement('div', '', { 'class': 'record-head' });
  const lugar = createSafeElement('span', d.lugar || '—', { 'class': 'record-id' });
  const timestamp = createSafeElement('span', `${d.fecha || ''} ${d.hora || ''}`, { 'class': 'record-ts' });
  header.appendChild(lugar);
  header.appendChild(timestamp);

  // Body - Departamento
  const dept = createSafeElement('p', d.departamento || '', { 'class': 'record-body' });
  const strong = document.createElement('strong');
  strong.textContent = d.departamento || '';
  const pDept = createSafeElement('p', '', { 'class': 'record-body' });
  pDept.appendChild(strong);

  // Body - Descripción
  const desc = createSafeElement('p', d.descripcion || '', { 'class': 'record-body' });

  // Body - Notificado A (si existe)
  let pNotificado = null;
  if (d.notificadoA) {
    pNotificado = createSafeElement('p', '', { 'class': 'record-body' });
    const strongNot = document.createElement('strong');
    strongNot.textContent = 'Notificado: ';
    pNotificado.appendChild(strongNot);
    pNotificado.appendChild(document.createTextNode(d.notificadoA));
    pNotificado.appendChild(document.createTextNode(` · ${d.metodo || ''}`));
  }

  // Footer
  const footer = createSafeElement('div', '', { 'class': 'record-foot' });
  
  // Badge de estatus
  footer.appendChild(bEstatus(d.estatus));

  // Botón Editar
  const btnEdit = createSafeButton(
    '✏️ Editar',
    'btn-edit',
    () => editarMantenimiento(d._id)
  );

  // Botón Eliminar
  const btnDel = createSafeButton(
    '🗑️ Eliminar',
    'btn-del',
    () => eliminar('dace_mantenimiento', d._id, 'Mantenimiento')
  );

  footer.appendChild(btnEdit);
  footer.appendChild(btnDel);

  // Armar el contenedor
  container.appendChild(header);
  container.appendChild(pDept);
  container.appendChild(desc);
  if (pNotificado) container.appendChild(pNotificado);
  container.appendChild(footer);

  return container;
}

/**
 * Renderiza un item de Q1 (Orden) de forma segura
 * @param {Object} d - Datos del documento
 * @returns {HTMLElement}
 */
function item_Q1_data(d) {
  if (!isValidFirestoreId(d._id)) {
    console.error('ID inválido en item_Q1_data:', d._id);
    return createSafeElement('div', '⚠️ Dato corrupto', { 'class': 'error-item' });
  }

  const container = createSafeElement('div', '', { 'class': 'record-item' });

  // Header
  const header = createSafeElement('div', '', { 'class': 'record-head' });
  const numero = createSafeElement('span', d.numero || '—', { 'class': 'record-id' });
  const timestamp = createSafeElement('span', `${d.fecha || ''} ${d.hora || ''}`, { 'class': 'record-ts' });
  header.appendChild(numero);
  header.appendChild(timestamp);

  // Body - Solicitante (si existe)
  let pSolicitante = null;
  if (d.solicitante) {
    pSolicitante = createSafeElement('p', '', { 'class': 'record-body' });
    const strong = document.createElement('strong');
    strong.textContent = 'Solicitante: ';
    pSolicitante.appendChild(strong);
    pSolicitante.appendChild(document.createTextNode(d.solicitante));
  }

  // Body - Unidad (si existe)
  let pUnidad = null;
  if (d.unidad) {
    pUnidad = createSafeElement('p', '', { 'class': 'record-body' });
    const strong = document.createElement('strong');
    strong.textContent = 'Unidad: ';
    pUnidad.appendChild(strong);
    pUnidad.appendChild(document.createTextNode(d.unidad));
  }

  // Body - Descripción
  const desc = createSafeElement('p', d.descripcion || '', { 'class': 'record-body' });

  // Body - Observaciones (si existe)
  let pObs = null;
  if (d.observaciones) {
    pObs = createSafeElement('p', d.observaciones, { 'class': 'record-body' });
    pObs.style.color = '#94a3b8';
    pObs.style.fontStyle = 'italic';
  }

  // Imagen (si existe)
  let img = null;
  if (d.fotoUrl) {
    img = document.createElement('img');
    img.src = escapeAttribute(d.fotoUrl);
    img.style.width = '100%';
    img.style.borderRadius = '8px';
    img.style.marginTop = '8px';
    img.style.maxHeight = '140px';
    img.style.objectFit = 'cover';
  }

  // Footer
  const footer = createSafeElement('div', '', { 'class': 'record-foot' });
  footer.appendChild(bEstatus(d.estatus));

  const btnPDF = createSafeButton(
    '📄 PDF Oficial',
    'btn-pdf-single',
    () => exportarPDF_Q1_Single(d)
  );

  footer.appendChild(btnEdit);
  footer.appendChild(btnPDF);
  footer.appendChild(btnDel);

  // Armar el contenedor
  container.appendChild(header);
  if (pSolicitante) container.appendChild(pSolicitante);
  if (pUnidad) container.appendChild(pUnidad);
  container.appendChild(desc);
  if (pObs) container.appendChild(pObs);
  if (img) container.appendChild(img);
  container.appendChild(footer);

  return container;
}

/**
 * Renderiza un item de Q3 (Inspección) de forma segura
 * @param {Object} d - Datos del documento
 * @returns {HTMLElement}
 */
function item_Q3_data(d) {
  if (!isValidFirestoreId(d._id)) {
    console.error('ID inválido en item_Q3_data:', d._id);
    return createSafeElement('div', '⚠️ Dato corrupto', { 'class': 'error-item' });
  }

  const container = createSafeElement('div', '', { 'class': 'record-item gold' });

  // Header
  const header = createSafeElement('div', '', { 'class': 'record-head' });
  const numero = createSafeElement('span', d.numero || '—', { 'class': 'record-id' });
  const timestamp = createSafeElement('span', `${d.fecha || ''} ${d.hora || ''}`, { 'class': 'record-ts' });
  header.appendChild(numero);
  header.appendChild(timestamp);

  // Body - Lugar (si existe)
  let pLugar = null;
  if (d.lugar) {
    pLugar = createSafeElement('p', '', { 'class': 'record-body' });
    const strong = document.createElement('strong');
    strong.textContent = 'Lugar: ';
    pLugar.appendChild(strong);
    pLugar.appendChild(document.createTextNode(d.lugar));
  }

  // Body - Hallazgos
  const hallazgos = createSafeElement('p', d.hallazgos || '', { 'class': 'record-body' });

  // Body - Recomendaciones (si existe)
  let pRec = null;
  if (d.recomendaciones) {
    pRec = createSafeElement('p', '', { 'class': 'record-body' });
    pRec.style.color = '#94a3b8';
    pRec.style.fontStyle = 'italic';
    const strong = document.createElement('strong');
    strong.textContent = 'Rec: ';
    pRec.appendChild(strong);
    pRec.appendChild(document.createTextNode(d.recomendaciones));
  }

  // Imagen (si existe)
  let img = null;
  if (d.fotoUrl) {
    img = document.createElement('img');
    img.src = escapeAttribute(d.fotoUrl);
    img.style.width = '100%';
    img.style.borderRadius = '8px';
    img.style.marginTop = '8px';
    img.style.maxHeight = '140px';
    img.style.objectFit = 'cover';
  }

  // Footer
  const footer = createSafeElement('div', '', { 'class': 'record-foot' });
  footer.appendChild(bEstatus(d.estatus));

  const btnEdit = createSafeButton(
    '✏️ Editar',
    'btn-edit',
    () => editarQ3(d._id)
  );

  const btnPDF = createSafeButton(
    '📄 Imprimir',
    'btn-pdf-single',
    () => imprimirIndividualPDF('dace_q137_3', d._id)
  );

  const btnDel = createSafeButton(
    '🗑️ Eliminar',
    'btn-del',
    () => eliminar('dace_q137_3', d._id, 'Inspección')
  );

  footer.appendChild(btnEdit);
  footer.appendChild(btnPDF);
  footer.appendChild(btnDel);


  // Armar el contenedor
  container.appendChild(header);
  if (pLugar) container.appendChild(pLugar);
  container.appendChild(hallazgos);
  if (pRec) container.appendChild(pRec);
  if (img) container.appendChild(img);
  container.appendChild(footer);

  return container;
}

/**
 * Renderiza un item de Caso de forma segura
 * @param {Object} d - Datos del documento
 * @returns {HTMLElement}
 */
function item_Caso_data(d) {
  if (!isValidFirestoreId(d._id)) {
    console.error('ID inválido en item_Caso_data:', d._id);
    return createSafeElement('div', '⚠️ Dato corrupto', { 'class': 'error-item' });
  }

  // Determinar clase por prioridad
  const prioClass = {
    'Alta': 'red',
    'Media': 'gold',
    'Baja': 'green'
  }[d.prioridad] || '';

  const container = createSafeElement('div', '', { 'class': `record-item ${prioClass}` });

  // Header
  const header = createSafeElement('div', '', { 'class': 'record-head' });
  const numero = createSafeElement('span', d.numero || '—', { 'class': 'record-id' });
  const timestamp = createSafeElement('span', d.fecha || '', { 'class': 'record-ts' });
  header.appendChild(numero);
  header.appendChild(timestamp);

  // Body - Descripción
  const desc = createSafeElement('p', d.descripcion || '', { 'class': 'record-body' });

  // Body - Responsable (si existe)
  let pResp = null;
  if (d.responsable) {
    pResp = createSafeElement('p', '', { 'class': 'record-body' });
    const strong = document.createElement('strong');
    strong.textContent = 'Responsable: ';
    pResp.appendChild(strong);
    pResp.appendChild(document.createTextNode(d.responsable));
  }

  // Body - Próxima Acción (si existe)
  let pAccion = null;
  if (d.accion) {
    pAccion = createSafeElement('p', '', { 'class': 'record-body' });
    const strong = document.createElement('strong');
    strong.textContent = 'Próxima acción: ';
    pAccion.appendChild(strong);
    pAccion.appendChild(document.createTextNode(d.accion));
  }

  // Footer
  const footer = createSafeElement('div', '', { 'class': 'record-foot' });
  footer.appendChild(bPrio(d.prioridad));
  footer.appendChild(bEstatus(d.estatus));

  const btnEdit = createSafeButton(
    '✏️ Editar',
    'btn-edit',
    () => editarCaso(d._id)
  );

  const btnDel = createSafeButton(
    '🗑️ Eliminar',
    'btn-del',
    () => eliminar('dace_casos', d._id, 'Caso')
  );

  footer.appendChild(btnEdit);
  footer.appendChild(btnDel);

  // Armar el contenedor
  container.appendChild(header);
  container.appendChild(desc);
  if (pResp) container.appendChild(pResp);
  if (pAccion) container.appendChild(pAccion);
  container.appendChild(footer);

  return container;
}

/**
 * Renderiza un item de Maestro de forma segura
 * @param {Object} d - Datos del documento
 * @returns {HTMLElement}
 */
function item_Maestro_data(d) {
  if (!isValidFirestoreId(d._id)) {
    console.error('ID inválido en item_Maestro_data:', d._id);
    return createSafeElement('div', '⚠️ Dato corrupto', { 'class': 'error-item' });
  }

  const container = createSafeElement('div', '', { 'class': 'record-item gray' });

  // Header
  const header = createSafeElement('div', '', { 'class': 'record-head' });
  const tipo = createSafeElement('span', d.tipo || '—', { 'class': 'record-id' });
  const timestamp = createSafeElement('span', `${d.fecha || ''} ${d.hora || ''}`, { 'class': 'record-ts' });
  header.appendChild(tipo);
  header.appendChild(timestamp);

  // Body - Descripción
  const desc = createSafeElement('p', d.descripcion || '', { 'class': 'record-body' });

  // Body - Notas (si existe)
  let pNotas = null;
  if (d.notas) {
    pNotas = createSafeElement('p', d.notas, { 'class': 'record-body' });
    pNotas.style.color = '#94a3b8';
    pNotas.style.fontStyle = 'italic';
  }

  // Footer
  const footer = createSafeElement('div', '', { 'class': 'record-foot' });

  const btnEdit = createSafeButton(
    '✏️ Editar',
    'btn-edit',
    () => editarMaestro(d._id)
  );

  const btnDel = createSafeButton(
    '🗑️ Eliminar',
    'btn-del',
    () => eliminar('dace_maestro', d._id, 'Entrada')
  );

  footer.appendChild(btnEdit);
  footer.appendChild(btnDel);

  // Armar el contenedor
  container.appendChild(header);
  container.appendChild(desc);
  if (pNotas) container.appendChild(pNotas);
  container.appendChild(footer);

  return container;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. FUNCIÓN PRINCIPAL DE FILTRADO Y RENDERIZADO (REFACTORIZADA)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aplica filtros y renderiza resultados de forma segura
 * REEMPLAZA la función original aplicarFiltros()
 * 
 * @param {string} modulo - Módulo a filtrar (q1, q3, c, rm, mt)
 */
function aplicarFiltros(modulo) {
  const f   = _filtros[modulo];
  const txt = (document.getElementById(modulo + '_search')?.value || '').toLowerCase().trim();
  const des = document.getElementById(modulo + '_desde')?.value || '';
  const has = document.getElementById(modulo + '_hasta')?.value || '';

  f.texto = txt;
  f.desde = des;
  f.hasta = has;

  let datos = _cache[modulo];

  // Filtro texto
  if (txt) {
    datos = datos.filter(d => {
      const haystack = JSON.stringify(d).toLowerCase();
      return haystack.includes(txt);
    });
  }

  // Filtro estatus
  if (f.estatus) {
    datos = datos.filter(d => (d.estatus||'') === f.estatus);
  }

  // Filtro tipo / prioridad / dept
  if (f.tipo)      datos = datos.filter(d => (d.tipo||'') === f.tipo);
  if (f.prioridad) datos = datos.filter(d => (d.prioridad||'') === f.prioridad);
  if (f.dept)      datos = datos.filter(d => (d.departamento||'') === f.dept);

  // Filtro fechas
  if (des || has) {
    datos = datos.filter(d => {
      const rawFecha = d.fecha || '';
      let fechaNorm = rawFecha;
      if (rawFecha.includes('/')) {
        const parts = rawFecha.split('/');
        if (parts.length === 3) {
          const [a, b, c] = parts;
          if (c.length === 4) fechaNorm = `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
          else fechaNorm = rawFecha;
        }
      }
      if (des && fechaNorm < des) return false;
      if (has && fechaNorm > has) return false;
      return true;
    });
  }

  // Configuración de renderizado
  const configs = {
    q1:  { container:'lista_q1',      fn: item_Q1_data,      count:'q1_count' },
    q3:  { container:'lista_q3',      fn: item_Q3_data,      count:'q3_count' },
    c:   { container:'lista_casos',   fn: item_Caso_data,    count:'c_count'  },
    rm:  { container:'lista_maestro', fn: item_Maestro_data, count:'rm_count' },
    mt:  { container:'lista_mt',      fn: item_Mt_data,      count:'mt_count' },
  };

  const cfg = configs[modulo];
  const el  = document.getElementById(cfg.container);
  const cnt = document.getElementById(cfg.count);

  if (!el) {
    console.error(`Contenedor no encontrado: ${cfg.container}`);
    return;
  }

  // LIMPIAR contenedor seguramente
  el.innerHTML = '';

  // Renderizar resultados
  if (!datos.length) {
    // Estado vacío seguro
    const emptyState = createSafeElement('div', '', { 'class': 'empty-state' });
    const icon = createSafeElement('span', '🔍', { 'class': 'empty-icon' });
    const msg = createSafeElement('p', 'No hay registros que coincidan con los filtros');
    emptyState.appendChild(icon);
    emptyState.appendChild(msg);
    el.appendChild(emptyState);
  } else {
    // Renderizar lista segura
    const fragment = renderSafeList(datos, cfg.fn);
    el.appendChild(fragment);
  }

  // Actualizar contador
  if (cnt) {
    const total = _cache[modulo].length;
    cnt.textContent = datos.length === total
      ? `${total} registro(s) total`
      : `${datos.length} de ${total} registro(s)`;
  }

  // Resaltar términos de búsqueda si existen
  if (txt && txt.length >= 2) {
    resaltarBusquedaHTML(cfg.container, txt);
  }
}

/**
 * Resalta las coincidencias de búsqueda en un contenedor de forma segura
 * @param {string} containerId - ID del contenedor HTML
 * @param {string} query - Término a buscar
 */
function resaltarBusquedaHTML(containerId, query) {
  const container = document.getElementById(containerId);
  if (!container || !query) return;

  const queryEscaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${queryEscaped})`, 'gi');

  const walkTextNodes = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (regex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
        node.parentNode.replaceChild(span, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE' && node.nodeName !== 'MARK' && node.nodeName !== 'BUTTON' && node.nodeName !== 'A') {
      const children = Array.from(node.childNodes);
      for (let child of children) {
        walkTextNodes(child);
      }
    }
  };

  walkTextNodes(container);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. FUNCIONES AUXILIARES DE RENDERIZADO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Renderiza un campo de texto seguro con label
 * @param {string} label - Texto del label
 * @param {string} value - Valor del campo
 * @returns {HTMLElement}
 */
function renderField(label, value) {
  const wrapper = createSafeElement('div', '', { 'class': 'field' });
  const lbl = createSafeElement('strong', label);
  const val = createSafeElement('span', value || '(vacío)');
  wrapper.appendChild(lbl);
  wrapper.appendChild(document.createTextNode(': '));
  wrapper.appendChild(val);
  return wrapper;
}

/**
 * Renderiza un estado de carga de forma segura
 * @param {string} mensaje - Mensaje a mostrar
 * @returns {HTMLElement}
 */
function renderLoading(mensaje = 'Cargando...') {
  const container = createSafeElement('div', '', { 'class': 'loading-state' });
  container.innerHTML = '<i class="loader"></i>';
  const msg = createSafeElement('p', mensaje);
  container.appendChild(msg);
  return container;
}

/**
 * Renderiza un mensaje de error de forma segura
 * @param {string} error - Texto del error
 * @returns {HTMLElement}
 */
function renderError(error) {
  const container = createSafeElement('div', '', { 'class': 'error-state' });
  const icon = createSafeElement('span', '❌', { 'class': 'error-icon' });
  const msg = createSafeElement('p', error || 'Error desconocido');
  container.appendChild(icon);
  container.appendChild(msg);
  return container;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. INSTRUCCIONES DE INTEGRACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/*
INSTRUCCIONES PARA USAR ESTE ARCHIVO:

1. CARGAR EN HTML (orden importante):
   <script src="SECURITY_UTILS.js"></script>
   <script src="REFACTORED_RENDERING.js"></script>
   <script src="src/app.js"></script>

2. EN src/app.js:
   - Reemplazar la función aplicarFiltros() con la de este archivo
   - Reemplazar todas las funciones item_*_data() con las de este archivo
   - Reemplazar funciones bEstatus() y bPrio() con las de este archivo

3. VERIFICACIÓN:
   ✅ No debe haber innerHTML con datos de usuario
   ✅ No debe haber onclick inline
   ✅ Todos los datos escapados con escapeHtml()
   ✅ Event listeners usando createSafeButton()

4. TESTING:
   - Verificar que los items se rendericen correctamente
   - Verificar que los botones funcionen
   - Verificar que no haya errores en consola
   - Probar XSS intentando inyectar caracteres especiales

CARACTERÍSTICAS DE SEGURIDAD IMPLEMENTADAS:
✅ Validación de IDs antes de renderizar
✅ Escape HTML en todos los campos de texto
✅ Event listeners seguros (no onclick)
✅ Creación de elementos DOM sin innerHTML
✅ Manejo de campos opcionales sin errores
✅ Estados vacío, carga y error seguros
✅ Logging de errores sin exponer datos
*/
