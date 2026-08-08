/* â•â•â• SISTEMA DE FILTROS â•â•â• */

// Cache de datos completos para filtrar localmente
const _cache = { q1:[], q3:[], c:[], rm:[], mt:[] };
let _guardando = false;
// Estado de filtros activos
const _filtros = {
  q1:  { texto:'', estatus:'', desde:'', hasta:'' },
  q3:  { texto:'', estatus:'', tipo:'', desde:'', hasta:'' },
  c:   { texto:'', estatus:'', prioridad:'', desde:'', hasta:'' },
  rm:  { texto:'', tipo:'', desde:'', hasta:'' },
  mt:  { texto:'', estatus:'', dept:'', desde:'', hasta:'' },
};

function toggleChip(el, modulo, campo, valor) {
  // Desactiva todos los chips del mismo grupo
  const grupo = el.parentElement;
  grupo.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  _filtros[modulo][campo] = valor;
  aplicarFiltros(modulo);
}

function obtenerDatosFiltrados(modulo) {
  const f   = _filtros[modulo];
  if (!f) return _cache[modulo] || [];

  const txt = (document.getElementById(modulo + '_search')?.value || '').toLowerCase().trim();
  const des = document.getElementById(modulo + '_desde')?.value || '';
  const has = document.getElementById(modulo + '_hasta')?.value || '';

  f.texto = txt;
  f.desde = des;
  f.hasta = has;

  let datos = _cache[modulo] || [];

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

  // Filtro fechas â€” compara cadenas de fecha YYYY-MM-DD o DD/MM/YYYY
  if (des || has) {
    datos = datos.filter(d => {
      const rawFecha = d.fecha || '';
      // Normalizar a YYYY-MM-DD
      let fechaNorm = rawFecha;
      if (rawFecha.includes('/')) {
        // Formato DD/MM/YYYY o M/D/YYYY
        const parts = rawFecha.split('/');
        if (parts.length === 3) {
          const [a, b, c] = parts;
          // Si el aÃ±o estÃ¡ al final
          if (c.length === 4) fechaNorm = `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
        }
      }
      if (des && fechaNorm < des) return false;
      if (has && fechaNorm > has) return false;
      return true;
    });
  }

  return datos;
}

function aplicarFiltros(modulo) {
  const datos = obtenerDatosFiltrados(modulo);

  // Renderizar resultados filtrados
  const configs = {
    q1:  { container:'lista_q1',      fn: item_Q1_data,      count:'q1_count' },
    q3:  { container:'lista_q3',      fn: item_Q3_data,      count:'q3_count' },
    c:   { container:'lista_casos',   fn: item_Caso_data,    count:'c_count'  },
    rm:  { container:'lista_maestro', fn: item_Maestro_data, count:'rm_count' },
    mt:  { container:'lista_mt',      fn: item_Mt_data,      count:'mt_count' },
  };

  const cfg = configs[modulo];
  if (!cfg) return;
  const el  = document.getElementById(cfg.container);
  const cnt = document.getElementById(cfg.count);

  if (!datos.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon"><i class="ph-bold ph-magnifying-glass"></i></span><p>No hay registros que coincidan con los filtros</p></div>';
  } else {
    el.innerHTML = datos.map(d => cfg.fn(d)).join('');
  }

  if (cnt) {
    const total = _cache[modulo].length;
    cnt.textContent = datos.length === total
      ? `${total} registro(s) total`
      : `${datos.length} de ${total} registro(s)`;
  }
}

function limpiarFiltros(modulo) {
  const f = _filtros[modulo];
  Object.keys(f).forEach(k => f[k] = '');

  const s = document.getElementById(modulo + '_search');
  if (s) s.value = '';
  const d = document.getElementById(modulo + '_desde');
  if (d) d.value = '';
  const h = document.getElementById(modulo + '_hasta');
  if (h) h.value = '';

  // Reset chips â€” activa el primero de cada grupo
  document.querySelectorAll(`#${moduloTabId(modulo)} .filter-chips`).forEach(grupo => {
    grupo.querySelectorAll('.chip').forEach((c, i) => {
      c.classList.toggle('active', i === 0);
    });
  });

  aplicarFiltros(modulo);
}

function moduloTabId(m) {
  const map = { q1:'q137_1', q3:'q137_3', c:'casos', rm:'maestro', mt:'mantenimiento' };
  return map[m] || m;
}

/* â”€â”€ Render mantenimiento data â”€â”€ */
function item_Mt_data(d) {
  const estatusColor = {
    'Pendiente':'b-pending','En Proceso':'b-process',
    'Completado':'b-done','Requiere Seguimiento':'b-alta'
  };
  return `<div class="record-item" style="border-left-color:#7c3aed">
    <div class="record-head">
      <span class="record-id">${d.lugar||'â€”'}</span>
      <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
    </div>
    <p class="record-body"><strong>${d.departamento||''}</strong></p>
    <p class="record-body">${d.descripcion||''}</p>
    ${d.notificadoA ? `<p class="record-body"><strong>Notificado:</strong> ${d.notificadoA} Â· ${d.metodo||''}</p>` : ''}
    <div class="record-foot">
      <span class="badge ${estatusColor[d.estatus]||'b-pending'}">${d.estatus||'â€”'}</span>
      <button class="btn-edit" onclick="editarMantenimiento('${d._id}')"><i class="ph-bold ph-pencil-simple"></i> Editar</button>
      <button class="btn-del" onclick="eliminar('dace_mantenimiento','${d._id}','Mantenimiento')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

/* â”€â”€ Versiones de render que reciben data plain (no Firestore doc) â”€â”€ */
function item_Q1_data(d) {
  return `<div class="record-item">
    <div class="record-head">
      <span class="record-id">${d.numero||'â€”'}</span>
      <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
    </div>
    ${d.solicitante ? `<p class="record-body"><strong>Solicitante:</strong> ${d.solicitante}</p>` : ''}
    ${d.unidad      ? `<p class="record-body"><strong>Unidad:</strong> ${d.unidad}</p>` : ''}
    <p class="record-body">${d.descripcion||''}</p>
    ${d.observaciones ? `<p class="record-body" style="color:#94a3b8;font-style:italic">${d.observaciones}</p>` : ''}
    ${d.fotoUrl ? `<img src="${d.fotoUrl}" style="width:100%;border-radius:8px;margin-top:8px;max-height:140px;object-fit:cover">` : ''}
    <div class="record-foot">
      ${bEstatus(d.estatus)}
      <button class="btn-edit" style="color:#0ea5e9;" onclick="imprimirPPR137_1('${d._id}')"><i class="ph-bold ph-printer"></i> Imprimir</button>
      <button class="btn-edit" onclick="editarQ1('${d._id}')"><i class="ph-bold ph-pencil-simple"></i> Editar</button>
      <button class="btn-pdf-single" onclick="exportarPDF_Q1_Single_By_Id('${d._id}')"><i class="ph-bold ph-file-pdf"></i> PDF Oficial</button>
      <button class="btn-del" onclick="eliminar('dace_q137_1','${d._id}','Orden')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

function item_Q3_data(d) {
  return `<div class="record-item gold">
    <div class="record-head">
      <span class="record-id">${d.numero||'â€”'}</span>
      <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
    </div>
    ${d.lugar ? `<p class="record-body"><strong>Lugar:</strong> ${d.lugar}</p>` : ''}
    <p class="record-body">${d.hallazgos||''}</p>
    ${d.recomendaciones ? `<p class="record-body" style="color:#94a3b8;font-style:italic"><strong>Rec:</strong> ${d.recomendaciones}</p>` : ''}
    ${d.fotoUrl ? `<img src="${d.fotoUrl}" style="width:100%;border-radius:8px;margin-top:8px;max-height:140px;object-fit:cover">` : ''}
    <div class="record-foot">
      ${bEstatus(d.estatus)}
      <button class="btn-edit" onclick="editarQ3('${d._id}')"><i class="ph-bold ph-pencil-simple"></i> Editar</button>
      <button class="btn-pdf-single" onclick="imprimirIndividualPDF('dace_q137_3','${d._id}')"><i class="ph-bold ph-file-pdf"></i> PDF Oficial</button>
      <button class="btn-del" onclick="eliminar('dace_q137_3','${d._id}','InspecciÃ³n')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

function item_Caso_data(d) {
  const cls = { Alta:'red', Media:'gold', Baja:'green' }[d.prioridad] || '';
  return `<div class="record-item ${cls}">
    <div class="record-head">
      <span class="record-id">${d.numero||'â€”'}</span>
      <span class="record-ts">${d.fecha||''}</span>
    </div>
    <p class="record-body">${d.descripcion||''}</p>
    ${d.responsable ? `<p class="record-body"><strong>Responsable:</strong> ${d.responsable}</p>` : ''}
    ${d.accion      ? `<p class="record-body"><strong>PrÃ³xima acciÃ³n:</strong> ${d.accion}</p>` : ''}
    <div class="record-foot">
      ${bPrio(d.prioridad)} ${bEstatus(d.estatus)}
      <button class="btn-edit" onclick="editarCaso('${d._id}')"><i class="ph-bold ph-pencil-simple"></i> Editar</button>
      <button class="btn-del" onclick="eliminar('dace_casos','${d._id}','Caso')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

function item_Maestro_data(d) {
  return `<div class="record-item gray">
    <div class="record-head">
      <span class="record-id">${d.tipo||'â€”'}</span>
      <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
    </div>
    <p class="record-body">${d.descripcion||''}</p>
    ${d.notas ? `<p class="record-body" style="color:#94a3b8;font-style:italic">${d.notas}</p>` : ''}
    <div class="record-foot">
      <button class="btn-edit" onclick="editarMaestro('${d._id}')"><i class="ph-bold ph-pencil-simple"></i> Editar</button>
      <button class="btn-del" onclick="eliminar('dace_maestro','${d._id}','Entrada')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

/* â•â•â• GENERADORES â•â•â• */
let _genCache = [];
let _genFotoData = null;
let _genFiltroTipo = '';

const COORDS_312_2 = {
  lugar: [26, 144],
  propiedad: [164, 144],
  mes: [464, 144],
  director: [26, 407],
  fechaDirector: [422, 407],
  tabla_x: [26, 140, 253, 366, 480],
  tabla_start_y: 178.0,
  tabla_step_y: 22.1
};

function switchGenTab(tab) {
  ['registro','historial','ppr_registro','ppr_historial','resumen'].forEach(t => {
    const sec = document.getElementById(`gen_sec_${t}`);
    if (sec) sec.style.display = t === tab ? 'block' : 'none';
  });
  
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById(`gen_tab_btn${i}`);
    if (btn) btn.style.background = '#94a3b8';
  }
  
  const tabIndex = ['registro','historial','ppr_registro','ppr_historial','resumen'].indexOf(tab);
  const activeBtn = document.getElementById(`gen_tab_btn${tabIndex + 1}`);
  if (activeBtn) activeBtn.style.background = 'var(--blue)';
  
  if (tab === 'resumen') calcularResumenGen();
  if (tab === 'ppr_historial') cargarInsp312_2();
}

function previewFotoGen() {
  const input   = document.getElementById('gen_foto_input');
  const preview = document.getElementById('gen_foto_preview');
  const clear   = document.getElementById('gen_foto_clear');
  const file    = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _genFotoData = e.target.result;
    preview.src = e.target.result;
    preview.classList.add('visible');
    clear.classList.add('visible');
  };
  reader.readAsDataURL(file);
}

function clearFotoGen() {
  _genFotoData = null;
  document.getElementById('gen_foto_input').value = '';
  document.getElementById('gen_foto_preview').src = '';
  document.getElementById('gen_foto_preview').classList.remove('visible');
  document.getElementById('gen_foto_clear').classList.remove('visible');
}

async function guardarGenerador() {
  if (_guardando) return;
  const lugar = document.getElementById('gen_lugar')?.value;
  const obs   = v('gen_obs');
  if (!lugar || !obs) { showToast('âš ï¸ Dependencia y observaciones son requeridas', '#92400e'); return; }

  _guardando = true;
  showToast('<i class="ph-fill ph-hourglass"></i> Registrando en bitÃ¡cora...', '#0a192f');
  try {
    const docRef  = db.collection('dace_generadores').doc();
    let fotoUrl = null;
    if (_genFotoData) {
      try {
        const storage = firebase.storage();
        const ref = storage.ref(`dace_fotos/generadores/${docRef.id}_${Date.now()}.jpg`);
        await ref.putString(_genFotoData, 'data_url');
        fotoUrl = await ref.getDownloadURL();
      } catch(e) { console.warn('Foto no subida:', e); }
    }

    await docRef.set({
      lugar, marca: v('gen_marca'),
      capacidad: v('gen_capacidad'),
      fecha: v('gen_fecha'), hora: v('gen_hora'),
      tipo: v('gen_tipo'),
      nivelAntes:   parseFloat(v('gen_nivel_antes'))  || null,
      nivelDespues: parseFloat(v('gen_nivel_despues')) || null,
      galones:      parseFloat(v('gen_galones'))       || null,
      litros:       parseFloat(v('gen_litros'))        || null,
      costo:        parseFloat(v('gen_costo'))         || null,
      horas:        parseFloat(v('gen_horas'))         || null,
      condicion:    v('gen_condicion'),
      observaciones: obs,
      proveedor:    v('gen_proveedor'),
      boleto:       v('gen_boleto'),
      fotoUrl,
      usuario: 'Agte. Aponte Cancel Â· 31093',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await registrarEnMaestroAuto(
      'BitÃ¡cora Generador',
      `Suministro/Actividad en ${lugar}: ${v('gen_tipo')} - CondiciÃ³n: ${v('gen_condicion')}`,
      `Marca: ${v('gen_marca')} Â· Galones: ${v('gen_galones')} Â· Costo: $${v('gen_costo')} Â· Obs: ${obs}`
    );

    showToast('<i class="ph-bold ph-check"></i> Entrada registrada en bitÃ¡cora', '#166534');
    ['gen_marca','gen_obs','gen_proveedor','gen_boleto',
     'gen_galones','gen_litros','gen_costo','gen_horas',
     'gen_nivel_antes','gen_nivel_despues','gen_capacidad'].forEach(id => set(id,''));
    set('gen_lugar',''); set('gen_condicion','Ã“ptimo');
    set('gen_fecha', hoy()); set('gen_hora', ahora());
    clearFotoGen();
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); console.error(e); } finally { _guardando = false; }
}

function buscarGeneradores() {
  const txt = (document.getElementById('gen_search')?.value || '').toLowerCase();
  let datos = _genCache;
  if (txt)           datos = datos.filter(d => JSON.stringify(d).toLowerCase().includes(txt));
  if (_genFiltroTipo) datos = datos.filter(d => d.tipo === _genFiltroTipo);
  renderGeneradores(datos);
}

function filtrarGenTipo(el, tipo) {
  document.querySelectorAll('#generadores .filter-chips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  _genFiltroTipo = tipo;
  buscarGeneradores();
}

function renderGeneradores(docs) {
  const el = document.getElementById('lista_gen');
  if (!docs.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">ðŸ”‹</span><p>No hay registros en la bitÃ¡cora</p></div>';
    return;
  }
  const condIcon = { 'Ã“ptimo':'<i class="ph-bold ph-check"></i>', 'Regular':'<i class="ph-bold ph-warning"></i>', 'Deficiente':'<i class="ph-bold ph-x"></i>', 'Fuera de Servicio':'<i class="ph-bold ph-prohibit"></i>' };
  const tipoColor = {
    'Suplido de Combustible':'#15803d',
    'Falla / AverÃ­a':'#dc2626',
    'OperaciÃ³n de Emergencia':'#dc2626',
    'Mantenimiento Correctivo':'#92400e',
    'InspecciÃ³n Rutinaria':'#0a192f',
    'Arranque de Prueba':'#0369a1'
  };
  el.innerHTML = docs.map(d => `
    <div class="record-item" style="border-left-color:${tipoColor[d.tipo]||'#15803d'}">
      <div class="record-head">
        <span class="record-id">${d.lugar||'â€”'}</span>
        <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
      </div>
      <p class="record-body"><strong>${d.tipo||''}</strong> ${condIcon[d.condicion]||''}</p>
      ${d.nivelAntes!=null ? `<p class="record-body"><i class="ph-fill ph-gas-pump"></i> Nivel: <strong>${d.nivelAntes}%</strong> â†’ <strong>${d.nivelDespues||'â€”'}%</strong>${d.galones ? ` Â· ${d.galones} gal` : ''}${d.costo ? ` Â· $${d.costo}` : ''}</p>` : ''}
      ${d.horas ? `<p class="record-body"><i class="ph-bold ph-timer"></i> Horas operaciÃ³n: ${d.horas}</p>` : ''}
      <p class="record-body">${d.observaciones||''}</p>
      ${d.proveedor ? `<p class="record-body"><strong>Proveedor:</strong> ${d.proveedor}${d.boleto?' Â· '+d.boleto:''}</p>` : ''}
      ${d.fotoUrl ? `<img src="${d.fotoUrl}" style="width:100%;border-radius:8px;margin-top:8px;max-height:150px;object-fit:cover">` : ''}
      <div class="record-foot">
        <button class="btn-del" onclick="eliminar('dace_generadores','${d._id}','Registro')"><i class="ph-bold ph-trash"></i> Eliminar</button>
      </div>
    </div>`).join('');
}

async function calcularResumenGen() {
  try {
    const snap = await db.collection('dace_generadores').get();
    const docs = snap.docs.map(d => d.data());

    document.getElementById('gen_rpt_total').textContent  = docs.length;
    document.getElementById('gen_rpt_gal').textContent    = docs.reduce((s,d) => s+(d.galones||0), 0).toFixed(1);
    document.getElementById('gen_rpt_costo').textContent  = '$' + docs.reduce((s,d) => s+(d.costo||0), 0).toFixed(2);
    document.getElementById('gen_rpt_fallas').textContent = docs.filter(d => d.tipo === 'Falla / AverÃ­a').length;

    // Por dependencia
    const dep = {};
    docs.forEach(d => { dep[d.lugar||'â€”'] = (dep[d.lugar||'â€”']||0) + (d.galones||0); });
    document.getElementById('gen_rpt_dep').innerHTML = Object.entries(dep)
      .sort((a,b) => b[1]-a[1])
      .map(([k,v]) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f4f8;padding:4px 0"><span>${k}</span><strong>${v.toFixed(1)} gal</strong></div>`)
      .join('') || '<p style="color:#94a3b8">Sin datos</p>';

    // Por tipo
    const tipo = {};
    docs.forEach(d => { tipo[d.tipo||'â€”'] = (tipo[d.tipo||'â€”']||0) + 1; });
    document.getElementById('gen_rpt_tipo').innerHTML = Object.entries(tipo)
      .sort((a,b) => b[1]-a[1])
      .map(([k,v]) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f4f8;padding:4px 0"><span>${k}</span><strong>${v}</strong></div>`)
      .join('') || '<p style="color:#94a3b8">Sin datos</p>';

  } catch(e) { console.error('Resumen generadores:', e); }
}

async function exportarGeneradoresPDF() {
  showToast('<i class="ph-fill ph-hourglass"></i> Generando bitÃ¡cora PDF...', '#0a192f');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W   = doc.internal.pageSize.getWidth();

  try {
    const snap = await db.collection('dace_generadores').orderBy('createdAt','desc').get();
    let y = pdfHeader(doc, 'BitÃ¡cora de Generadores ElÃ©ctricos');

    if (snap.empty) {
      doc.setTextColor(150,150,150);
      doc.text('No hay registros en la bitÃ¡cora.', W/2, y+10, {align:'center'});
    } else {
      snap.docs.forEach((docSnap, i) => {
        const d = docSnap.data();
        y = checkPage(doc, y, 45);

        doc.setFillColor(240, 253, 244);
        doc.rect(10, y, W-20, 7, 'F');
        doc.setTextColor(21, 128, 61);
        doc.setFontSize(9); doc.setFont('helvetica','bold');
        doc.text(`#${i+1}  ${d.lugar||'â€”'}  Â·  ${d.tipo||''}`, 13, y+5);
        doc.setFont('helvetica','normal');
        doc.setTextColor(100,100,100); doc.setFontSize(7);
        doc.text(`${d.fecha||''} ${d.hora||''}`, W-13, y+5, {align:'right'});
        y += 10;

        const campos = [
          ['CondiciÃ³n', d.condicion],
          ['Nivel combustible', d.nivelAntes!=null ? `${d.nivelAntes}% â†’ ${d.nivelDespues||'â€”'}%` : null],
          ['Galones suministrados', d.galones ? `${d.galones} gal Â· ${d.litros||'â€”'} litros Â· $${d.costo||'â€”'}` : null],
          ['Horas operaciÃ³n', d.horas ? `${d.horas} hrs` : null],
          ['Observaciones', d.observaciones],
          ['Proveedor', d.proveedor ? `${d.proveedor} Â· ${d.boleto||''}` : null],
        ];
        campos.forEach(([label, val]) => {
          if (!val) return;
          y = checkPage(doc, y, 8);
          doc.setTextColor(21, 128, 61); doc.setFontSize(7); doc.setFont('helvetica','bold');
          doc.text(label + ':', 13, y);
          doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
          const lines = doc.splitTextToSize(String(val), W-55);
          doc.text(lines, 55, y);
          y += (lines.length * 4) + 2;
        });
        y = pdfLinea(doc, y+2, W);
      });
    }

    // Totales
    y = checkPage(doc, y, 30);
    const docs2 = snap.docs.map(d => d.data());
    doc.setFillColor(21, 128, 61);
    doc.rect(10, y, W-20, 20, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text('RESUMEN TOTAL', 15, y+7);
    doc.text(`Total registros: ${snap.size}`, 15, y+13);
    doc.text(`Total galones: ${docs2.reduce((s,d)=>s+(d.galones||0),0).toFixed(1)} gal`, 15, y+18);
    doc.text(`Costo total: $${docs2.reduce((s,d)=>s+(d.costo||0),0).toFixed(2)}`, W/2, y+13);
    doc.text(`Fallas: ${docs2.filter(d=>d.tipo==='Falla / AverÃ­a').length}`, W/2, y+18);

    // Pie
    const totalPags = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
      doc.setPage(p);
      doc.setFillColor(10,25,47);
      doc.rect(0, doc.internal.pageSize.getHeight()-10, W, 10, 'F');
      doc.setTextColor(150,150,150); doc.setFontSize(7);
      doc.text(`DACE Arecibo â€” NPPR â€” BitÃ¡cora Generadores | PÃ¡gina ${p} de ${totalPags}`,
        W/2, doc.internal.pageSize.getHeight()-3, {align:'center'});
    }

    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`DACE_Arecibo_Bitacora_Generadores_${fecha}.pdf`);
    showToast('<i class="ph-bold ph-check"></i> BitÃ¡cora PDF generada', '#166534');
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); console.error(e); }
}

/* â•â•â• INSPECCIONES GENERADOR ELÃ‰CTRICO PPR-312.2 â•â•â• */
let _insp312Cache = [];
let _editando312 = { id: null };

async function guardarInsp312_2() {
  if (_guardando) return;
  const lugar = document.getElementById('gen_312_lugar')?.value;
  const propiedad = v('gen_312_propiedad');
  const mes = document.getElementById('gen_312_mes')?.value;
  
  if (!lugar || !propiedad || !mes) {
    showToast('âš ï¸ Distrito, propiedad y mes son requeridos', '#92400e');
    return;
  }
  
  _guardando = true;
  showToast('<i class="ph-fill ph-hourglass"></i> Guardando inspecciÃ³n...', '#0a192f');
  
  // Recopilar tabla de bitÃ¡cora mensual (10 filas)
  const tabla = [];
  for (let i = 0; i < 10; i++) {
    const fecha = v(`gen_312_fecha_${i}`);
    const prendida = v(`gen_312_prendida_${i}`);
    const apagada = v(`gen_312_apagada_${i}`);
    const operador = v(`gen_312_operador_${i}`);
    const observaciones = v(`gen_312_obs_${i}`);
    
    // Si la fila tiene al menos algÃºn dato, se registra
    if (fecha || prendida || apagada || operador || observaciones) {
      tabla.push({ fecha, prendida, apagada, operador, observaciones });
    }
  }
  
  const datos = {
    lugar,
    propiedad,
    mes,
    director: v('gen_312_director'),
    fechaDirector: v('gen_312_fecha_firma'),
    tabla,
    usuario: 'Agte. Aponte Cancel Â· 31093',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    if (_editando312.id) {
      await db.collection('dace_insp_generadores').doc(_editando312.id).update(datos);
      await registrarEnMaestroAuto(
        'PPR-312.2 (EdiciÃ³n)',
        `InspecciÃ³n Generador editada: Propiedad ${propiedad} Â· Mes: ${mes}`,
        `Dependencia: ${lugar} Â· Registros de encendido: ${tabla.length}`
      );
      showToast('<i class="ph-bold ph-check"></i> InspecciÃ³n actualizada correctamente', '#166534');
      _editando312 = { id: null };
      const btn = document.querySelector('#gen_sec_ppr_registro .btn-save');
      if (btn) btn.innerHTML = 'ðŸ’¾ REGISTRAR INSPECCIÃ“N PPR-312.2';
    } else {
      const docRef = db.collection('dace_insp_generadores').doc();
      await docRef.set(datos);
      await registrarEnMaestroAuto(
        'PPR-312.2',
        `Nueva InspecciÃ³n Generador registrada: Propiedad ${propiedad} Â· Mes: ${mes}`,
        `Dependencia: ${lugar} Â· Registros de encendido: ${tabla.length}`
      );
      showToast('<i class="ph-bold ph-check"></i> InspecciÃ³n guardada', '#166534');
    }
    
    // Limpiar formulario
    set('gen_312_lugar', '');
    set('gen_312_propiedad', '');
    set('gen_312_mes', '');
    set('gen_312_director', '');
    set('gen_312_fecha_firma', '');
    for (let i = 0; i < 10; i++) {
      set(`gen_312_fecha_${i}`, '');
      set(`gen_312_prendida_${i}`, '');
      set(`gen_312_apagada_${i}`, '');
      set(`gen_312_operador_${i}`, '');
      set(`gen_312_obs_${i}`, '');
    }
    switchGenTab('ppr_historial');
  } catch(e) {
    showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626');
    console.error(e);
  } finally {
    _guardando = false;
  }
}

function buscarInsp312_2() {
  const txt = (document.getElementById('gen_312_search')?.value || '').toLowerCase();
  let datos = _insp312Cache;
  if (txt) {
    datos = datos.filter(d => 
      (d.lugar||'').toLowerCase().includes(txt) ||
      (d.mes||'').toLowerCase().includes(txt) ||
      (d.director||'').toLowerCase().includes(txt) ||
      (d.propiedad||'').toLowerCase().includes(txt)
    );
  }
  renderInsp312_2(datos);
}

function renderInsp312_2(docs) {
  const el = document.getElementById('lista_insp_312');
  if (!el) return;
  document.getElementById('gen_312_total').textContent = docs.length;
  
  if (!docs.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">ðŸ“</span><p>No hay inspecciones PPR-312.2 registradas</p></div>';
    return;
  }
  
  el.innerHTML = docs.map(d => `
    <div class="record-item" style="border-left-color: var(--blue);">
      <div class="record-head">
        <span class="record-id">${d.lugar||'â€”'}</span>
        <span class="record-ts">Mes: <strong>${d.mes||'â€”'}</strong></span>
      </div>
      <p class="record-body"><strong>Propiedad Planta:</strong> ${d.propiedad||'â€”'}</p>
      ${d.director ? `<p class="record-body"><strong>Director:</strong> ${d.director}</p>` : ''}
      <p class="record-body"><i class="ph-bold ph-list-numbers"></i> Registros de encendido: <strong>${d.tabla?.length || 0} de 10</strong></p>
      <div class="record-foot">
        <button class="btn-edit" onclick="editarInsp312_2('${d._id}')"><i class="ph-bold ph-pencil-simple"></i> Editar</button>
        <button class="btn-pdf-single" onclick="exportarPDF_312_2_Single_By_Id('${d._id}')"><i class="ph-bold ph-file-pdf"></i> PDF Oficial</button>
        <button class="btn-del" onclick="eliminarInsp312_2('${d._id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>
      </div>
    </div>
  `).join('');
}

function editarInsp312_2(id) {
  const d = _insp312Cache.find(x => x._id === id);
  if (!d) return;
  _editando312 = { id };
  
  set('gen_312_lugar', d.lugar || '');
  set('gen_312_propiedad', d.propiedad || '');
  set('gen_312_mes', d.mes || '');
  set('gen_312_director', d.director || '');
  set('gen_312_fecha_firma', d.fechaDirector || '');
  
  // Limpiar primero la tabla
  for (let i = 0; i < 10; i++) {
    set(`gen_312_fecha_${i}`, '');
    set(`gen_312_prendida_${i}`, '');
    set(`gen_312_apagada_${i}`, '');
    set(`gen_312_operador_${i}`, '');
    set(`gen_312_obs_${i}`, '');
  }
  
  // Rellenar filas existentes
  if (d.tabla) {
    d.tabla.forEach((it, i) => {
      if (i >= 10) return;
      set(`gen_312_fecha_${i}`, it.fecha || '');
      set(`gen_312_prendida_${i}`, it.prendida || '');
      set(`gen_312_apagada_${i}`, it.apagada || '');
      set(`gen_312_operador_${i}`, it.operador || '');
      set(`gen_312_obs_${i}`, it.observaciones || '');
    });
  }
  
  const btn = document.querySelector('#gen_sec_ppr_registro .btn-save');
  if (btn) btn.innerHTML = 'ðŸ’¾ GUARDAR CAMBIOS PPR-312.2';
  switchGenTab('ppr_registro');
}

async function eliminarInsp312_2(id) {
  if (!confirm('Â¿EstÃ¡s seguro de que deseas eliminar esta inspecciÃ³n PPR-312.2?')) return;
  try {
    await db.collection('dace_insp_generadores').doc(id).delete();
    showToast('<i class="ph-bold ph-trash"></i> InspecciÃ³n eliminada', '#166534');
  } catch(e) {
    showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626');
  }
}

async function cargarInsp312_2() {
  try {
    const snap = await db.collection('dace_insp_generadores').orderBy('createdAt','desc').get();
    _insp312Cache = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    renderInsp312_2(_insp312Cache);
  } catch(e) {
    console.error('Error al cargar inspecciones 312.2:', e);
  }
}

// InicializaciÃ³n de la tabla interactiva 312.2 y clonaciÃ³n de dependencias
document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('tabla_rows_312');
  if (tbody) {
    let html = '';
    for (let i = 0; i < 10; i++) {
      html += `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:6px; font-weight:bold; color:#64748b; font-size:12px;">${i+1}</td>
          <td style="padding:4px;"><input type="date" id="gen_312_fecha_${i}" style="width:100%; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px; background:white;"></td>
          <td style="padding:4px;"><input type="time" id="gen_312_prendida_${i}" style="width:100%; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px; background:white;"></td>
          <td style="padding:4px;"><input type="time" id="gen_312_apagada_${i}" style="width:100%; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px; background:white;"></td>
          <td style="padding:4px;"><input type="text" id="gen_312_operador_${i}" placeholder="Nombre..." style="width:100%; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px; background:white;" autocomplete="off"></td>
          <td style="padding:4px;"><input type="text" id="gen_312_obs_${i}" placeholder="Notas..." style="width:100%; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px; background:white;" autocomplete="off"></td>
        </tr>
      `;
    }
    tbody.innerHTML = html;
  }
  
  // Clonar comandancias
  setTimeout(() => {
    const selOrig = document.getElementById('gen_lugar');
    const selDest = document.getElementById('gen_312_lugar');
    if (selOrig && selDest && selDest.options.length <= 1) {
      selDest.innerHTML = selOrig.innerHTML;
    }
  }, 1000);
});

// LÃ³gica de Renderizado en PDF PPR-312.2 con pdf-lib y 12pt Bold
async function renderSingle312PageWithPdfLib(pdfDoc, d) {
  const { rgb, StandardFonts } = PDFLib;
  const pages = pdfDoc.getPages();
  const page = pages[0];
  const height = page.getHeight();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.04, 0.1, 0.18); // Tinta azul marino oscuro
  
  const write = (text, [x, top_y], defaultSize = 12, maxWidth = null) => {
    if (text === undefined || text === null || text === '') return;
    let size = defaultSize;
    if (maxWidth) {
      const textWidth = fontBold.widthOfTextAtSize(String(text), defaultSize);
      if (textWidth > maxWidth) {
        size = Math.max(6.0, defaultSize * (maxWidth / textWidth));
      }
    }
    page.drawText(String(text), {
      x: x,
      y: height - top_y + 3.0, // centrado vertical
      size: size,
      font: fontBold,
      color: textColor
    });
  };
  
  // 1. Escribir Cabecera
  write(d.lugar, COORDS_312_2.lugar, 12, 135);
  write(d.propiedad, COORDS_312_2.propiedad, 12, 295);
  write(d.mes, COORDS_312_2.mes, 12, 125);
  
  // 2. Escribir Tabla de BitÃ¡cora (Hasta 10 filas)
  if (d.tabla && Array.isArray(d.tabla)) {
    d.tabla.forEach((row, i) => {
      if (i >= 10) return;
      const top_y = COORDS_312_2.tabla_start_y + (i * COORDS_312_2.tabla_step_y);
      
      write(row.fecha, [COORDS_312_2.tabla_x[0], top_y], 12, 100);
      write(row.prendida, [COORDS_312_2.tabla_x[1], top_y], 12, 100);
      write(row.apagada, [COORDS_312_2.tabla_x[2], top_y], 12, 100);
      write(row.operador, [COORDS_312_2.tabla_x[3], top_y], 12, 100);
      write(row.observaciones, [COORDS_312_2.tabla_x[4], top_y], 12, 100);
    });
  }
  
  // 3. Escribir Firmas al pie
  write(d.director, COORDS_312_2.director, 12, 380);
  write(d.fechaDirector, COORDS_312_2.fechaDirector, 12, 155);
}

async function exportarPDF_312_2_Single(d) {
  showToast('<i class="ph-fill ph-hourglass"></i> Generando PDF Oficial...', '#0a192f');
  try {
    const { PDFDocument } = PDFLib;
    const arrayBuffer = base64ToArrayBuffer(PDF_312_2);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    await renderSingle312PageWithPdfLib(pdfDoc, d);
    
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `INSP-312.2-${d.propiedad || 'generador'}-${d.mes || 'mes'}.pdf`;
    link.click();
    
    showToast('<i class="ph-bold ph-check"></i> PDF generado correctamente', '#166534');
  } catch (error) {
    console.error('Error generando PDF:', error);
    showToast('<i class="ph-bold ph-x"></i> Error generando PDF', '#dc2626');
  }
}

async function exportarPDF_312_2_Single_By_Id(id) {
  const d = _insp312Cache.find(x => x._id === id);
  if (!d) {
    showToast('âš ï¸ Registro no encontrado', '#dc2626');
    return;
  }
  await exportarPDF_312_2_Single(d);
}

/* â•â•â• AGENDA â•â•â• */
let _agendaCache = [];

async function guardarAgenda() {
  if (_guardando) return;
  const titulo = v('ag_titulo'), fecha = v('ag_fecha');
  let isValid = true;
  if (!titulo) { resaltarValidacion('ag_titulo', false); isValid = false; } else { resaltarValidacion('ag_titulo', true); }
  if (!fecha) { resaltarValidacion('ag_fecha', false); isValid = false; } else { resaltarValidacion('ag_fecha', true); }
  if (!isValid) { showToast('âš ï¸ TÃ­tulo y fecha son requeridos', '#92400e'); return; }
  _guardando = true;
  try {
    await db.collection('dace_agenda').add({
      titulo, fecha, hora: v('ag_hora'),
      tipo: v('ag_tipo'), descripcion: v('ag_desc'),
      prioridad: v('ag_prioridad'), estatus: 'Pendiente',
      usuario: 'Agte. Aponte Cancel Â· 31093',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await registrarEnMaestroAuto(
      'Agenda / Tarea',
      `Nueva tarea programada: ${titulo} (${v('ag_tipo')})`,
      `Fecha: ${fecha} Â· Prioridad: ${v('ag_prioridad')} Â· Desc: ${v('ag_desc')}`
    );

    showToast('<i class="ph-bold ph-check"></i> Tarea guardada', '#166534');
    limpiar(['ag_titulo','ag_desc']);
    set('ag_fecha', hoy()); set('ag_hora', ahora());
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); } finally { _guardando = false; }
}

function renderAgenda(docs) {
  const hoyStr = hoy();
  const el = document.getElementById('lista_agenda');
  if (!docs.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon"><i class="ph-fill ph-calendar"></i></span><p>No hay tareas registradas</p></div>';
    return;
  }
  // Ordenar por fecha
  const sorted = [...docs].sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
  el.innerHTML = sorted.map(d => {
    const vencida  = d.fecha < hoyStr && d.estatus !== 'Completado';
    const hoy_     = d.fecha === hoyStr;
    const borde    = vencida ? 'var(--red)' : hoy_ ? 'var(--gold)' : '#0369a1';
    const prioMap  = { Alta:'b-alta', Media:'b-media', Baja:'b-baja' };
    return `<div class="record-item" style="border-left-color:${borde}">
      <div class="record-head">
        <span class="record-id">${d.titulo||'â€”'}</span>
        <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
      </div>
      <p class="record-body"><strong>${d.tipo||''}</strong></p>
      ${d.descripcion ? `<p class="record-body">${d.descripcion}</p>` : ''}
      <div class="record-foot">
        <span class="badge ${prioMap[d.prioridad]||'b-media'}">${d.prioridad||''}</span>
        ${vencida ? '<span class="badge b-alta">VENCIDA</span>' : ''}
        ${hoy_ ? '<span class="badge b-process">HOY</span>' : ''}
        <button class="btn-del" onclick="completarTarea('${d._id}','${d.estatus}')">${d.estatus==='Completado'?'<i class="ph-bold ph-arrow-u-up-left"></i> Reabrir':'<i class="ph-bold ph-check"></i> Completar'}</button>
        <button class="btn-del" onclick="eliminar('dace_agenda','${d._id}','Tarea')"><i class="ph-bold ph-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

async function completarTarea(id, estatusActual) {
  const nuevoEstatus = estatusActual === 'Completado' ? 'Pendiente' : 'Completado';
  try {
    await db.collection('dace_agenda').doc(id).update({ estatus: nuevoEstatus });
    showToast(nuevoEstatus === 'Completado' ? '<i class="ph-bold ph-check"></i> Tarea completada' : '<i class="ph-bold ph-arrow-u-up-left"></i> Tarea reabierta', '#166534');
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); }
}

/* â•â•â• DIRECTORIO â•â•â• */
let _dirCache = [];

async function guardarDirectorio() {
  if (_guardando) return;
  const nombre = v('dir_nombre');
  if (!nombre) { showToast('âš ï¸ El nombre es requerido', '#92400e'); return; }
  _guardando = true;
  try {
    await db.collection('dace_directorio').add({
      nombre, placa: v('dir_placa'), rango: v('dir_rango'),
      unidad: v('dir_unidad'), telefono: v('dir_tel'),
      extension: v('dir_ext'), email: v('dir_email'),
      notas: v('dir_notas'),
      usuario: 'Agte. Aponte Cancel Â· 31093',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await registrarEnMaestroAuto(
      'Directorio Personal',
      `Contacto aÃ±adido: ${nombre} (${v('dir_rango')})`,
      `Unidad: ${v('dir_unidad')} Â· Tel: ${v('dir_tel')} Â· Email: ${v('dir_email')} Â· Notas: ${v('dir_notas')}`
    );

    showToast('<i class="ph-bold ph-check"></i> Contacto guardado', '#166534');
    limpiar(['dir_nombre','dir_placa','dir_tel','dir_ext','dir_email','dir_notas']);
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); } finally { _guardando = false; }
}

function buscarDirectorio() {
  const txt = (document.getElementById('dir_search')?.value || '').toLowerCase();
  const filtrado = txt ? _dirCache.filter(d => JSON.stringify(d).toLowerCase().includes(txt)) : _dirCache;
  renderDirectorio(filtrado);
}

function renderDirectorio(docs) {
  const el = document.getElementById('lista_dir');
  if (!docs.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon"><i class="ph-fill ph-users"></i></span><p>No hay contactos registrados</p></div>';
    return;
  }
  el.innerHTML = docs.map(d => `
    <div class="record-item" style="border-left-color:#0f766e">
      <div class="record-head">
        <span class="record-id">${d.nombre||'â€”'}</span>
        <span class="record-ts">${d.placa||''}</span>
      </div>
      <p class="record-body"><strong>${d.rango||''}</strong> Â· ${d.unidad||''}</p>
      ${d.telefono ? `<p class="record-body"><i class="ph-fill ph-phone"></i> ${d.telefono}${d.extension?' ext.'+d.extension:''}</p>` : ''}
      ${d.email    ? `<p class="record-body"><i class="ph-fill ph-envelope"></i> ${d.email}</p>` : ''}
      ${d.notas    ? `<p class="record-body" style="color:#94a3b8;font-style:italic">${d.notas}</p>` : ''}
      <div class="record-foot">
        <button class="btn-del" onclick="eliminar('dace_directorio','${d._id}','Contacto')"><i class="ph-bold ph-trash"></i> Eliminar</button>
      </div>
    </div>`).join('');
}

/* â•â•â• REPORTES â•â•â• */
async function generarReportes() {
  try {
    const [s1,s2,s3,s4] = await Promise.all([
      db.collection('dace_q137_1').get(),
      db.collection('dace_q137_3').get(),
      db.collection('dace_casos').get(),
      db.collection('dace_mantenimiento').get(),
    ]);

    document.getElementById('rpt_q1').textContent    = s1.size;
    document.getElementById('rpt_q3').textContent    = s2.size;
    document.getElementById('rpt_casos').textContent = s3.size;
    document.getElementById('rpt_mt').textContent    = s4.size;

    // DistribuciÃ³n estatus 137.1
    const eq1 = {}; s1.docs.forEach(d => { const e=d.data().estatus||'â€”'; eq1[e]=(eq1[e]||0)+1; });
    document.getElementById('rpt_q1_estatus').innerHTML = Object.entries(eq1)
      .map(([k,v]) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f4f8;padding:4px 0"><span>${k}</span><strong>${v}</strong></div>`).join('') || '<p style="color:#94a3b8">Sin datos</p>';

    // DistribuciÃ³n estatus 137.3
    const eq3 = {}; s2.docs.forEach(d => { const e=d.data().estatus||'â€”'; eq3[e]=(eq3[e]||0)+1; });
    document.getElementById('rpt_q3_estatus').innerHTML = Object.entries(eq3)
      .map(([k,v]) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f4f8;padding:4px 0"><span>${k}</span><strong>${v}</strong></div>`).join('') || '<p style="color:#94a3b8">Sin datos</p>';

    // DistribuciÃ³n tipo mantenimiento
    const emt = {}; s4.docs.forEach(d => { const e=d.data().departamento||'â€”'; emt[e]=(emt[e]||0)+1; });
    document.getElementById('rpt_mt_tipo').innerHTML = Object.entries(emt)
      .sort((a,b)=>b[1]-a[1])
      .map(([k,v]) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f4f8;padding:4px 0"><span>${k}</span><strong>${v}</strong></div>`).join('') || '<p style="color:#94a3b8">Sin datos</p>';

    // Top dependencias mantenimiento
    const dep = {}; s4.docs.forEach(d => { const e=d.data().lugar||'â€”'; dep[e]=(dep[e]||0)+1; });
    document.getElementById('rpt_mt_dep').innerHTML = Object.entries(dep)
      .sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([k,v]) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f4f8;padding:4px 0"><span>${k}</span><strong>${v}</strong></div>`).join('') || '<p style="color:#94a3b8">Sin datos</p>';

  } catch(e) { console.error('Reportes:', e); }
}

/* â•â•â• ARCHIVO DACE â•â•â• */
let _arcCache = [];

async function guardarArchivo() {
  if (_guardando) return;
  const nombre = v('arc_nombre');
  if (!nombre) { showToast('âš ï¸ El nombre del documento es requerido', '#92400e'); return; }
  _guardando = true;
  try {
    await db.collection('dace_archivo').add({
      nombre, categoria: v('arc_cat'), dependencia: v('arc_dep'),
      fecha: v('arc_fecha'), anio: v('arc_anio'),
      descripcion: v('arc_desc'), referencia: v('arc_ref'),
      usuario: 'Agte. Aponte Cancel Â· 31093',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await registrarEnMaestroAuto(
      'Archivo DACE',
      `Documento registrado: ${nombre} (${v('arc_cat')})`,
      `Dependencia: ${v('arc_dep')} Â· AÃ±o: ${v('arc_anio')} Â· Referencia: ${v('arc_ref')} Â· Desc: ${v('arc_desc')}`
    );

    showToast('<i class="ph-bold ph-check"></i> Documento registrado', '#166534');
    limpiar(['arc_nombre','arc_desc','arc_ref']);
    set('arc_fecha', hoy());
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); } finally { _guardando = false; }
}

function buscarArchivo() {
  const txt = (document.getElementById('arc_search')?.value || '').toLowerCase();
  const filtrado = txt ? _arcCache.filter(d => JSON.stringify(d).toLowerCase().includes(txt)) : _arcCache;
  renderArchivo(filtrado);
}

function renderArchivo(docs) {
  const el = document.getElementById('lista_arc');
  if (!docs.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon"><i class="ph-fill ph-archive"></i></span><p>No hay documentos registrados</p></div>';
    return;
  }
  el.innerHTML = docs.map(d => `
    <div class="record-item" style="border-left-color:#b45309">
      <div class="record-head">
        <span class="record-id">${d.nombre||'â€”'}</span>
        <span class="record-ts">${d.anio||''}</span>
      </div>
      <p class="record-body"><strong>${d.categoria||''}</strong> Â· ${d.dependencia||''}</p>
      ${d.fecha       ? `<p class="record-body"><i class="ph-fill ph-calendar"></i> ${d.fecha}</p>` : ''}
      ${d.referencia  ? `<p class="record-body">Ref: <strong>${d.referencia}</strong></p>` : ''}
      ${d.descripcion ? `<p class="record-body" style="color:#475569">${d.descripcion}</p>` : ''}
      <div class="record-foot">
        <button class="btn-del" onclick="eliminar('dace_archivo','${d._id}','Documento')"><i class="ph-bold ph-trash"></i> Eliminar</button>
      </div>
    </div>`).join('');
}

/* â•â•â• JEDI / ASG â•â•â• */
let _jediCache = [];
let _jediFotoData = null;
let _jediFilterEstatus = '';

function previewFotoJedi() {
  const input   = document.getElementById('jedi_foto_input');
  const preview = document.getElementById('jedi_foto_preview');
  const clear   = document.getElementById('jedi_foto_clear');
  const file    = input.files[0];
  if (!file) return;
  const reader  = new FileReader();
  reader.onload = e => {
    _jediFotoData = e.target.result;
    preview.src  = e.target.result;
    preview.classList.add('visible');
    clear.classList.add('visible');
  };
  reader.readAsDataURL(file);
}

function clearFotoJedi() {
  _jediFotoData = null;
  document.getElementById('jedi_foto_input').value = '';
  document.getElementById('jedi_foto_preview').src = '';
  document.getElementById('jedi_foto_preview').classList.remove('visible');
  document.getElementById('jedi_foto_clear').classList.remove('visible');
}

async function guardarJedi() {
  if (_guardando) return;
  const unidad = document.getElementById('jedi_unidad')?.value;
  const desc   = v('jedi_desc');
  if (!unidad || !desc) { showToast('âš ï¸ Unidad y descripciÃ³n son requeridas', '#92400e'); return; }

  _guardando = true;
  showToast('<i class="ph-fill ph-hourglass"></i> Registrando solicitud...', '#0a192f');
  try {
    const docRef  = db.collection('dace_jedi').doc();
    let fotoUrl   = null;
    if (_jediFotoData) {
      try {
        const storage = firebase.storage();
        const ref     = storage.ref(`dace_fotos/jedi/${docRef.id}_${Date.now()}.jpg`);
        await ref.putString(_jediFotoData, 'data_url');
        fotoUrl = await ref.getDownloadURL();
      } catch(e) { console.warn('Foto JEDI no subida:', e); }
    }

    await docRef.set({
      numero:       v('jedi_num'),
      fecha:        v('jedi_fecha'),
      hora:         v('jedi_hora'),
      unidad,
      tipo:         v('jedi_tipo'),
      descripcion:  desc,
      justificacion: v('jedi_just'),
      estatus:      v('jedi_estatus'),
      fechaRespuesta: v('jedi_fecha_resp'),
      referenciaASG:  v('jedi_ref_asg'),
      observaciones:  v('jedi_obs'),
      fotoUrl,
      usuario:      'Agte. Aponte Cancel Â· 31093',
      createdAt:    firebase.firestore.FieldValue.serverTimestamp()
    });

    await registrarEnMaestroAuto(
      'PADAWAN / JEDI',
      `Solicitud JEDI registrada: ${v('jedi_num') || 'â€”'} (${unidad})`,
      `Estatus: ${v('jedi_estatus')} Â· Equipo: ${desc} Â· Ref ASG: ${v('jedi_ref_asg')}`
    );

    showToast('<i class="ph-bold ph-check"></i> Solicitud JEDI registrada', '#166534');
    limpiar(['jedi_num','jedi_desc','jedi_just','jedi_obs','jedi_ref_asg','jedi_fecha_resp']);
    set('jedi_unidad',''); set('jedi_estatus','Pendiente');
    set('jedi_fecha', hoy()); set('jedi_hora', ahora());
    clearFotoJedi();
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); } finally { _guardando = false; }
}

function buscarJedi() {
  const txt = (document.getElementById('jedi_search')?.value || '').toLowerCase();
  let datos = _jediCache;
  if (txt)              datos = datos.filter(d => JSON.stringify(d).toLowerCase().includes(txt));
  if (_jediFilterEstatus) datos = datos.filter(d => d.estatus === _jediFilterEstatus);
  renderJedi(datos);
}

function filtrarJediEstatus(el, estatus) {
  document.querySelectorAll('#jedi .filter-chips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  _jediFilterEstatus = estatus;
  buscarJedi();
}

function renderJedi(docs) {
  const el = document.getElementById('lista_jedi');
  if (!docs.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon"><i class="ph-fill ph-desktop"></i></span><p>No hay solicitudes registradas</p></div>';
    return;
  }
  const colorEstatus = {
    'En autorizaciÃ³n de OGP':              '#92400e',
    'En AprobaciÃ³n Inicial':               '#0369a1',
    'En asignaciÃ³n de Presupuesto':        '#1d4ed8',
    'En proceso de compra':                '#7c3aed',
    'Orden de cargos a contrato concluido':'#166534',
    'Cancelado':                           '#dc2626',
    'Completado':                          '#166534'
  };
  const iconEstatus = {
    'En autorizaciÃ³n de OGP':              '<i class="ph-fill ph-hourglass"></i>',
    'En AprobaciÃ³n Inicial':               '<i class="ph-fill ph-clipboard-text"></i>',
    'En asignaciÃ³n de Presupuesto':        '<i class="ph-fill ph-coin"></i>',
    'En proceso de compra':                '<i class="ph-bold ph-arrows-clockwise"></i>',
    'Orden de cargos a contrato concluido':'<i class="ph-bold ph-check"></i>',
    'Cancelado':                           '<i class="ph-bold ph-x"></i>',
    'Completado':                          '<i class="ph-bold ph-check"></i>'
  };
  el.innerHTML = docs.map(d => {
    // Calcular dÃ­as abierto
    const fechaRad = d.fecha ? new Date(d.fecha) : null;
    const diasAbierto = fechaRad ? Math.floor((Date.now() - fechaRad.getTime()) / 86400000) : null;
    const colorDias = diasAbierto > 90 ? '#dc2626' : diasAbierto > 30 ? '#92400e' : '#166534';

    return `
    <div class="record-item" style="border-left-color:${colorEstatus[d.estatus]||'#1d4ed8'}">
      <div class="record-head">
        <span class="record-id">${d.referenciaASG||d.numero||'Sin nÃºmero'}</span>
        <span class="record-ts">${d.fecha||''}</span>
      </div>
      <p class="record-body" style="font-weight:700">${d.descripcion||''}</p>
      <p class="record-body"><strong>MÃ©todo:</strong> ${d.tipo||''} Â· <strong>Unidad:</strong> ${d.unidad||''}</p>
      ${d.justificacion ? `<p class="record-body" style="color:#475569;font-style:italic">${d.justificacion}</p>` : ''}
      <div class="record-foot">
        <span class="badge" style="background:${colorEstatus[d.estatus]||'#1d4ed8'}20;color:${colorEstatus[d.estatus]||'#1d4ed8'};border:1px solid ${colorEstatus[d.estatus]||'#1d4ed8'}40">
          ${iconEstatus[d.estatus]||''} ${d.estatus||''}
        </span>
        ${diasAbierto !== null ? `<span style="font-size:11px;font-weight:800;color:${colorDias}"><i class="ph-fill ph-calendar"></i> ${diasAbierto} dÃ­as</span>` : ''}
        ${d.fechaRespuesta ? `<span style="font-size:10px;color:#64748b">Actualizado: ${d.fechaRespuesta}</span>` : ''}
      </div>
      ${d.fotoUrl ? `<img src="${d.fotoUrl}" style="width:100%;border-radius:8px;margin-top:8px;max-height:200px;object-fit:contain;background:#f8fafc">` : ''}
      <div class="record-foot" style="margin-top:8px">
        <button class="btn-edit" onclick="editarJedi('${d._id}')"><i class="ph-bold ph-pencil-simple"></i> Editar</button>
        <button class="btn-del" onclick="eliminar('dace_jedi','${d._id}','Solicitud JEDI')"><i class="ph-bold ph-trash"></i></button>
      </div>
    </div>`}).join('');
}

async function editarJedi(id) {
  try {
    const doc = await db.collection('dace_jedi').doc(id).get();
    const d   = doc.data();
    changeTab('jedi');
    setTimeout(() => {
      set('jedi_num',        d.numero||'');
      set('jedi_fecha',      d.fecha||'');
      set('jedi_hora',       d.hora||'');
      set('jedi_desc',       d.descripcion||'');
      set('jedi_just',       d.justificacion||'');
      set('jedi_obs',        d.observaciones||'');
      set('jedi_ref_asg',    d.referenciaASG||'');
      set('jedi_fecha_resp', d.fechaRespuesta||'');
      set('jedi_estatus',    d.estatus||'Pendiente');
      if (d.unidad) { const el = document.getElementById('jedi_unidad'); if(el) el.value = d.unidad; }
      if (d.tipo)   { const el = document.getElementById('jedi_tipo');   if(el) el.value = d.tipo;   }
      _editando = { col: 'dace_jedi', id };
      const btn = document.querySelector('#jedi .btn-save');
      if(btn) { btn.style.background='#b45309'; btn.innerHTML='ðŸ’¾ ACTUALIZAR SOLICITUD JEDI'; }
      showToast('âœï¸ Modo ediciÃ³n â€” modifica y toca ACTUALIZAR', '#b45309');
    }, 300);
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); }
}

async function exportarJediPDF() {
  showToast('<i class="ph-fill ph-hourglass"></i> Generando reporte JEDI/ASG...', '#0a192f');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W   = doc.internal.pageSize.getWidth();
  const azul = [10, 25, 47];

  try {
    const snap = await db.collection('dace_jedi').orderBy('createdAt','desc').get();
    let y = pdfHeader(doc, 'Registro de Solicitudes JEDI / ASG');

    if (snap.empty) {
      doc.setTextColor(150,150,150);
      doc.text('No hay solicitudes registradas.', W/2, y+10, {align:'center'});
    } else {
      for (let i = 0; i < snap.docs.length; i++) {
        const d = snap.docs[i].data();
        y = checkPage(doc, y, 40);

        const colEstatus = {
          'Pendiente':[146,64,14], 'Aprobada':[22,101,52],
          'En Proceso':[3,105,161], 'Recibida':[29,78,216], 'Denegada':[220,38,38]
        }[d.estatus] || azul;

        doc.setFillColor(...colEstatus);
        doc.rect(10, y, W-20, 7, 'F');
        doc.setTextColor(255,255,255);
        doc.setFontSize(9); doc.setFont('helvetica','bold');
        doc.text(`#${i+1}  ${d.numero||'Sin nÃºmero'}  Â·  ${d.estatus||''}`, 13, y+5);
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        doc.text(`${d.fecha||''} ${d.hora||''}`, W-13, y+5, {align:'right'});
        y += 10;

        const campos = [
          ['Unidad', d.unidad],
          ['Tipo', d.tipo],
          ['DescripciÃ³n', d.descripcion],
          ['JustificaciÃ³n', d.justificacion],
          ['Ref. ASG', d.referenciaASG],
          ['Fecha Respuesta', d.fechaRespuesta],
          ['Observaciones', d.observaciones],
        ];
        campos.forEach(([label, val]) => {
          if (!val) return;
          y = checkPage(doc, y, 8);
          doc.setTextColor(...colEstatus); doc.setFontSize(7); doc.setFont('helvetica','bold');
          doc.text(label + ':', 13, y);
          doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
          const lines = doc.splitTextToSize(String(val), W-55);
          doc.text(lines, 55, y);
          y += (lines.length * 4) + 2;
        });

        if (d.fotoUrl) {
          try {
            y = checkPage(doc, y, 60);
            doc.setTextColor(...colEstatus); doc.setFontSize(7); doc.setFont('helvetica','bold');
            doc.text('Screenshot JEDI/ASG:', 13, y);
            y += 4;
            const imgData = await cargarImagenComoBase64(d.fotoUrl);
            if (imgData) { doc.addImage(imgData, 'JPEG', 13, y, W-26, 50); y += 53; }
          } catch(eImg) {}
        }
        y = pdfLinea(doc, y+2, W);
      }
    }

    // Totales
    const docs2 = snap.docs.map(d => d.data());
    y = checkPage(doc, y, 25);
    doc.setFillColor(...azul);
    doc.rect(10, y, W-20, 18, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text('RESUMEN', 15, y+7);
    doc.text(`Total: ${snap.size}`, 15, y+13);
    doc.text(`Aprobadas: ${docs2.filter(d=>d.estatus==='Aprobada').length}`, W/2-20, y+7);
    doc.text(`Pendientes: ${docs2.filter(d=>d.estatus==='Pendiente').length}`, W/2-20, y+13);
    doc.text(`Recibidas: ${docs2.filter(d=>d.estatus==='Recibida').length}`, W-50, y+7);
    doc.text(`Denegadas: ${docs2.filter(d=>d.estatus==='Denegada').length}`, W-50, y+13);

    // Firma
    const lastPage = doc.internal.getNumberOfPages();
    doc.setPage(lastPage);
    const H = doc.internal.pageSize.getHeight();
    doc.setFillColor(...azul);
    doc.rect(0, H-10, W, 10, 'F');
    doc.setTextColor(150,150,150); doc.setFontSize(7);
    doc.text('DACE Arecibo â€” NPPR â€” Solicitudes JEDI/ASG', W/2, H-3, {align:'center'});
    try { doc.addImage(FIRMA_B64, 'PNG', 10, H-52, 70, 14); } catch(e) {}
    doc.setDrawColor(...azul); doc.setLineWidth(0.5);
    doc.line(10, H-38, 85, H-38);
    doc.setTextColor(...azul); doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.text('Agte. Jose C. Aponte Cancel Â· Placa 31093', 10, H-34);
    doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
    doc.text('Coordinador Auxiliar DACE Arecibo', 10, H-30);

    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`DACE_Arecibo_JEDI_ASG_${fecha}.pdf`);
    showToast('<i class="ph-bold ph-check"></i> Reporte JEDI/ASG generado', '#166534');
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); console.error(e); }
}

/* â•â•â• CERRAR SESIÃ“N â•â•â• */
function cerrarSesion() {
  sessionStorage.removeItem('dace_auth_ok');
  firebase.auth().signOut().then(() => {
    location.reload();
  }).catch(() => location.reload());
}

const FIRMA_B64 = 'data:image/png;base64,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';

/* â•â•â• HELPER: GENERAR FILAS DE INSPECCIÃ“N â•â•â• */
function makeInspRows(sec, items) {
  return items.map((item, i) => `
    <tr>
      <td>${item}</td>
      <td><div class="insp-radio-group">
        <label><input type="radio" name="${sec}_${i}" value="R"> SÃ­</label>
      </div></td>
      <td><div class="insp-radio-group">
        <label><input type="radio" name="${sec}_${i}" value="P"> SÃ­</label>
      </div></td>
      <td><div class="insp-radio-group">
        <label><input type="radio" name="${sec}_${i}" value="B"> SÃ­</label>
      </div></td>
      <td><input type="number" class="insp-cant" min="0" id="cant_${sec}_${i}"></td>
      <td><textarea class="insp-obs" id="obs_${sec}_${i}" placeholder="Observaciones..."></textarea></td>
    </tr>`).join('');
}

/* â•â•â• TABS INTERNOS PPR-137.3 â•â•â• */
function switchInnerTab(form, sec) {
  const tabs = document.querySelectorAll(`#${form}_tabs .inner-tab`);
  const secs = document.querySelectorAll(`[id^="${form}_sec_"]`);
  tabs.forEach(t => t.classList.remove('active'));
  secs.forEach(s => s.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(`${form}_sec_${sec}`).classList.add('active');
}

/* â•â•â• FOTO â•â•â• */
let _fotoData = { q1: null, q3: null };

function previewFoto(form) {
  const input   = document.getElementById(`${form}_foto_input`);
  const preview = document.getElementById(`${form}_foto_preview`);
  const clear   = document.getElementById(`${form}_foto_clear`);
  const file    = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    _fotoData[form] = e.target.result; // base64
    preview.src = e.target.result;
    preview.classList.add('visible');
    clear.classList.add('visible');
  };
  reader.readAsDataURL(file);
}

function clearFoto(form) {
  _fotoData[form] = null;
  document.getElementById(`${form}_foto_input`).value = '';
  const preview = document.getElementById(`${form}_foto_preview`);
  const clear   = document.getElementById(`${form}_foto_clear`);
  preview.src = '';
  preview.classList.remove('visible');
  clear.classList.remove('visible');
}

async function subirFoto(form, docId) {
  if (!_fotoData[form]) return null;
  try {
    const storage = firebase.storage();
    const ref     = storage.ref(`dace_fotos/${form}/${docId}_${Date.now()}.jpg`);
    await ref.putString(_fotoData[form], 'data_url');
    return await ref.getDownloadURL();
  } catch(e) {
    console.error('Error subiendo foto:', e);
    return null;
  }
}

/* â•â•â• GEMINI AI â€” VÃA CLOUD FUNCTION v2 â•â•â• */
async function llamarGemini(textoPrompt, fotoBase64 = null) {
  const texto = String(textoPrompt || '').trim();
  if (!texto) throw new Error('Prompt vacÃ­o.');
  const fn = firebase.functions().httpsCallable('llamarGemini');
  console.log('[IA] enviando prompt, length:', texto.length);
  const result = await fn({ prompt: texto, fotoBase64: fotoBase64 || null });
  return result.data.texto || '';
}

/* â•â•â• MÃ“DULO DE INTELIGENCIA ARTIFICIAL â•â•â• */

// 1. Generar DescripciÃ³n para PPR-137.1
async function generarDescripcionIA(prefix) {
  const btn       = document.getElementById(prefix + '_ai_btn');
  const resultDiv = document.getElementById(prefix + '_ai_result');
  const textEl    = document.getElementById(prefix + '_ai_texto');
  const desc      = document.getElementById(prefix + '_desc')?.value || 'trabajo de mantenimiento';
  const textoOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="ph-fill ph-hourglass"></i> GENERANDO...';
  btn.disabled  = true;
  try {
    const textoPrompt =
      'Eres Coordinador Auxiliar DACE Policia de Puerto Rico Area Arecibo. ' +
      'Genera descripcion tecnica profesional para Solicitud Orden de Trabajo PPR-137.1 NPPR. ' +
      'Basado en: ' + desc + '. ' +
      'Usa terminologia tecnica construccion y mantenimiento. ' +
      'Menciona tipo de trabajo, urgencia e impacto operacional. ' +
      'Redacta en espanol formal institucional entre 3 y 5 oraciones. ' +
      'Responde SOLO con el texto sin titulos ni explicaciones.';
    const respuesta = await llamarGemini(textoPrompt, _fotoData[prefix] || null);
    textEl.innerText = respuesta;
    resultDiv.classList.add('visible');
    showToast('<i class="ph-bold ph-check"></i> DescripciÃ³n generada por IA', '#166534');
  } catch (error) {
    console.error('[IA 137.1]', error);
    showToast('<i class="ph-bold ph-x"></i> Error IA: ' + error.message, '#dc2626');
  } finally {
    btn.innerHTML = textoOriginal;
    btn.disabled  = false;
  }
}

function usarTextoIA(prefix) {
  const textEl  = document.getElementById(prefix + '_ai_texto');
  const inputEl = document.getElementById(prefix + '_desc');
  if (textEl && inputEl) {
    inputEl.value = textEl.innerText;
    document.getElementById(prefix + '_ai_result').classList.remove('visible');
    showToast('<i class="ph-bold ph-check"></i> Texto copiado al campo de descripciÃ³n', '#16a34a');
  }
}

// 2. Generar Hallazgos para PPR-137.3
async function generarHallazgoIA() {
  const btn           = document.getElementById('q3_ai_btn');
  const resultDiv     = document.getElementById('q3_ai_result');
  const hallazgoEl    = document.getElementById('q3_ai_hallazgo');
  const ordenEl       = document.getElementById('q3_ai_orden');
  const textoOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="ph-fill ph-hourglass"></i> GENERANDO...';
  btn.disabled  = true;
  const lugar = document.getElementById('q3_lugar')?.value || 'dependencia policial';
  const obs   = document.getElementById('q3_obs_gen')?.value || 'inspeccion general';
  const nomSec = { ext:'Exterior',int:'Interior',com:'Comedor',adm:'Administracion',
    bib:'Biblioteca',aca:'Academico',ban:'Banos',tec:'Techos',
    can:'Cancha',seg:'Seguridad',ele:'Electricidad',dor:'Dormitorios' };
  let hallazgos = '';
  ['ext','int','com','adm','bib','aca','ban','tec','can','seg','ele','dor'].forEach(sec => {
    const items = [];
    document.querySelectorAll('[name^="' + sec + '_"]').forEach(r => {
      if (r.checked && (r.value === 'R' || r.value === 'P')) {
        const tipo = r.value === 'R' ? 'Reemplazo' : 'Reparacion';
        const idx  = r.name.split('_')[1];
        const ob2  = document.getElementById('obs_' + sec + '_' + idx)?.value || '';
        items.push(tipo + (ob2 ? ': ' + ob2 : ''));
      }
    });
    if (items.length) hallazgos += nomSec[sec] + ': ' + items.join(', ') + '. ';
  });
  try {
    const textoPrompt =
      'Eres Coordinador Auxiliar DACE Policia de Puerto Rico Area Arecibo. ' +
      'Realizaste Inspeccion Preventiva PPR-137.3 en: ' + lugar + '. ' +
      'Observaciones: ' + obs + '. ' +
      'Hallazgos: ' + (hallazgos || 'condiciones generales del edificio') + '. ' +
      'Genera DOS textos en JSON sin markdown: ' +
      '{"hallazgo":"descripcion tecnica 4-6 oraciones terminologia OSHA AEP construccion espanol formal",' +
      '"orden":"solicitud PPR-137.1 materiales prioridad 3-4 oraciones espanol formal"}';
    let respuesta = await llamarGemini(textoPrompt, _fotoData.q3 || null);
    // Extraer JSON aunque venga con texto extra
    const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolviÃ³ un JSON vÃ¡lido.');
    const resultado = JSON.parse(jsonMatch[0]);
    hallazgoEl.innerText = resultado.hallazgo || resultado.hallazgos || '';
    ordenEl.innerText    = resultado.orden    || resultado.solicitud  || '';
    resultDiv.classList.add('visible');
    showToast('<i class="ph-bold ph-check"></i> AnÃ¡lisis completado por IA', '#166534');
  } catch (error) {
    console.error('[IA 137.3]', error);
    showToast('<i class="ph-bold ph-x"></i> Error IA: ' + error.message, '#dc2626');
  } finally {
    btn.innerHTML = textoOriginal;
    btn.disabled  = false;
  }
}

function usarHallazgoIA() {
  const hallazgoEl = document.getElementById('q3_ai_hallazgo');
  const inputEl    = document.getElementById('q3_hallazgos');
  if (hallazgoEl && inputEl) {
    inputEl.value = hallazgoEl.innerText;
    document.getElementById('q3_ai_result').classList.remove('visible');
    showToast('<i class="ph-bold ph-check"></i> Hallazgos copiados exitosamente', '#16a34a');
  }
}

/* â•â•â• GUARDAR: 137.1 (con soporte ediciÃ³n) â•â•â• */
async function guardarQ1() {
  if (_guardando) return;
  const unidad = document.getElementById('q1_unidad')?.value;
  const desc   = v('q1_desc');
  let isValid = true;
  if (!unidad) { resaltarValidacion('q1_unidad', false); isValid = false; } else { resaltarValidacion('q1_unidad', true); }
  if (!desc) { resaltarValidacion('q1_desc', false); isValid = false; } else { resaltarValidacion('q1_desc', true); }
  if (!isValid) { showToast('âš ï¸ Unidad y descripciÃ³n son requeridos', '#92400e'); return; }
  _guardando = true;

  const trabajos = [];
  if (document.getElementById('q1_carp')?.checked) trabajos.push('CarpinterÃ­a');
  if (document.getElementById('q1_elec')?.checked) trabajos.push('Electricidad');
  if (document.getElementById('q1_pint')?.checked) trabajos.push('Pintura');
  if (document.getElementById('q1_refr')?.checked) trabajos.push('RefrigeraciÃ³n');
  if (document.getElementById('q1_eban')?.checked) trabajos.push('EbanisterÃ­a');
  if (document.getElementById('q1_limp')?.checked) trabajos.push('Limpieza');
  if (document.getElementById('q1_plom')?.checked) trabajos.push('PlomerÃ­a');

  const datos = {
    fecha: v('q1_fecha'), unidad, area: v('q1_area'),
    director: v('q1_director'), solicitante: v('q1_solicitante'),
    telefono: v('q1_tel'), trabajos, descripcion: desc,
    seccion: v('q1_seccion'), division: v('q1_division'),
    distrito: v('q1_distrito'), negociado: v('q1_negociado'),
    area2: v('q1_area2'), super: v('q1_super'),
    adminAutorizado: v('q1_admin_autorizado'),
    adminFecha: v('q1_admin_fecha'),
    adminAutorizaA: v('q1_admin_autoriza_a'),
    adminViajarA: v('q1_admin_viajar_a'),
    adminTablilla: v('q1_admin_tablilla'),
    adminAcompanante: v('q1_admin_acompanante'),
    estatus: v('q1_estatus'), observaciones: v('q1_obs'),
    usuario: 'Agte. Aponte Cancel Â· 31093'
  };

  showToast('<i class="ph-fill ph-hourglass"></i> Guardando...', '#0a192f');
  try {
    if (_editando.col === 'dace_q137_1' && _editando.id) {
      await db.collection('dace_q137_1').doc(_editando.id).update(datos);
      await registrarEnMaestroAuto(
        'PPR-137.1 (EdiciÃ³n)',
        `Orden de Trabajo actualizada: ${datos.numero || _editando.id}`,
        `Unidad: ${unidad} Â· Trabajos: ${trabajos.join(', ')} Â· Desc: ${desc}`
      );
      showToast('<i class="ph-bold ph-check"></i> Orden actualizada correctamente', '#166534');
      _editando = { col: null, id: null };
      const btn = document.querySelector('#q137_1 .btn-save');
      if(btn) { btn.style.background=''; btn.innerHTML='ðŸ’¾ GUARDAR ORDEN DE TRABAJO'; }
    } else {
      const snap    = await db.collection('dace_q137_1').get();
      const total   = snap.size + 1;
      const anio    = new Date().getFullYear();
      datos.numero  = 'SOL-137.1-' + anio + '-' + String(total).padStart(3,'0');
      datos.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef  = db.collection('dace_q137_1').doc();
      const fotoUrl = await subirFoto('q1', docRef.id);
      datos.fotoUrl = fotoUrl || null;
      await docRef.set(datos);
      await registrarEnMaestroAuto(
        'PPR-137.1',
        `Nueva Orden de Trabajo creada: ${datos.numero}`,
        `Unidad: ${unidad} Â· Trabajos: ${trabajos.join(', ')} Â· Desc: ${desc}`
      );
      showToast('<i class="ph-bold ph-check"></i> Orden ' + datos.numero + ' guardada', '#166534');
    }
    limpiar([
      'q1_solicitante', 'q1_tel', 'q1_desc', 'q1_obs', 'q1_director', 
      'q1_seccion', 'q1_division', 'q1_distrito', 'q1_super',
      'q1_admin_autorizado', 'q1_admin_fecha', 'q1_admin_autoriza_a', 
      'q1_admin_viajar_a', 'q1_admin_tablilla', 'q1_admin_acompanante'
    ]);
    set('q1_area', 'Arecibo');
    set('q1_area2', 'Arecibo');
    set('q1_negociado', 'NPPR');
    ['q1_carp','q1_elec','q1_pint','q1_refr','q1_eban','q1_limp','q1_plom'].forEach(id => {
      const el = document.getElementById(id); if(el) el.checked = false;
    });
    clearFoto('q1');
    document.getElementById('q1_ai_result').classList.remove('visible');
    set('q1_fecha', hoy());
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); console.error(e); } finally { _guardando = false; }
}

/* â•â•â• GUARDAR: 137.3 (con soporte ediciÃ³n) â•â•â• */

function recopilarInspeccion() {
  const secciones = {
    ext: ['PortÃ³n de entrada','Verja periferal','Estacionamiento','Parrillas Pluviales','EstaciÃ³n de Basura','Luminarias y Postes','Hidrante','Mangueras','Ãreas Verdes','Astas de Banderas','Pintura Exterior','IluminaciÃ³n PerÃ­metro','RotulaciÃ³n'],
    int: ['Portones','Pasamanos','Rejas','Pintura','Ãreas verdes','Gazebo','Paredes','Pisos','Aceras','Rampas','IluminaciÃ³n','DesagÃ¼es pluviales','Barandas','Juntas de ExpansiÃ³n'],
    com: ['Enchapado','Campana de ExtracciÃ³n','PlomerÃ­a','Trampa de grasa','Walk-in Cooler','Calentador de agua','Sistema de Gas','Ventanas','Puertas','BaÃ±os','Luminarias'],
    adm: ['A/C','Paredes','Piso','BaÃ±os','Pintura','Enfriador de Agua','ADA','IluminaciÃ³n','Ventanas','PlafÃ³n','Intercom','Timbre'],
    bib: ['A/C','Paredes','Pisos','Oficina Bibliotecario','Ventanas','Pinturas','Puertas','Luminaria'],
    aca: ['Salones','Pizarras','IluminaciÃ³n','ReceptÃ¡culos','Puertas','Gabinetes','Abanicos','Ventanas','Pintura'],
    ban: ['Enchapado','Particiones','Ventanas','Drenajes','Inodoros','Lavamanos','Urinales','Llaves','Extractores','Pintura','ADA'],
    tec: ['Acceso','Escotillas','Drenajes','Limpieza','Empozamientos','Filtraciones','Tratamiento'],
    can: ['Canastos','Portones','Rejas y Barandas','Estructura','Gradas','IluminaciÃ³n','Piso','Control Palomas','Extractores','BaÃ±os','Fuentes','Abanicos','Filtraciones','Drenajes'],
    seg: ['Intercomunicador','Alarma incendios','Gabinetes Mangueras','Extintores','Luces Salida','Luces Emergencia','Sistema Seguridad'],
    ele: ['SubestaciÃ³n','Paneles ElÃ©ctricos','DistribuciÃ³n','Bombeo Agua','Bombeo Sanitario','Planta Tratamiento','Tanques','Leaching Field','EnergÃ­a Renovable','Generador','Fuentes Agua','Cisterna','A/C','Elevadores','Montasillas'],
    dor: ['Pintura','Ventanas','Puertas','Linternas','Pisos','Duchas','Aire','Lavamanos']
  };

  const resultado = {};
  Object.keys(secciones).forEach(sec => {
    resultado[sec] = secciones[sec].map((item, i) => {
      const radios = document.querySelectorAll(`[name="${sec}_${i}"]`);
      let estado = '';
      radios.forEach(r => { if(r.checked) estado = r.value; });
      return {
        item,
        estado,
        cantidad: document.getElementById(`cant_${sec}_${i}`)?.value || '',
        observaciones: document.getElementById(`obs_${sec}_${i}`)?.value || ''
      };
    });
  });
  return resultado;
}

/* â•â•â• GUARDAR: 137.3 (actualizado) â•â•â• */
async function guardarQ3() {
  if (_guardando) return;
  const lugar = document.getElementById('q3_lugar')?.value;
  const hall  = v('q3_hallazgos');
  let isValid = true;
  if (!lugar) { resaltarValidacion('q3_lugar', false); isValid = false; } else { resaltarValidacion('q3_lugar', true); }
  if (!hall) { resaltarValidacion('q3_hallazgos', false); isValid = false; } else { resaltarValidacion('q3_hallazgos', true); }
  if (!isValid) { showToast('âš ï¸ Lugar y hallazgos son requeridos', '#92400e'); return; }
  _guardando = true;

  showToast('<i class="ph-fill ph-hourglass"></i> Guardando inspecciÃ³n...', '#0a192f');
  try {
    const snap  = await db.collection('dace_q137_3').get();
    const total = snap.size + 1;
    const anio  = new Date().getFullYear();
    const numAuto = `INS-137.3-${anio}-${String(total).padStart(3,'0')}`;

    const docRef  = db.collection('dace_q137_3').doc();
    const fotoUrl = await subirFoto('q3', docRef.id);
    const inspeccionData = recopilarInspeccion();

    await docRef.set({
      numero: numAuto, fecha: v('q3_fecha'),
      lugar, area: v('q3_area'), director: v('q3_director'),
      telefono: v('q3_tel'), direccion: v('q3_dir'),
      inspeccion: inspeccionData,
      observacionesGenerales: v('q3_obs_gen'),
      hallazgos: hall, recomendaciones: v('q3_rec'),
      estatus: v('q3_estatus'),
      fotoUrl: fotoUrl || null,
      usuario: 'Agte. Aponte Cancel Â· 31093',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await registrarEnMaestroAuto(
      'PPR-137.3',
      `Nueva InspecciÃ³n creada: ${numAuto}`,
      `Lugar: ${lugar} Â· Hallazgos: ${hall} Â· Recomendaciones: ${v('q3_rec')}`
    );

    showToast(`<i class="ph-bold ph-check"></i> InspecciÃ³n ${numAuto} guardada y sincronizada`, '#166534');
    limpiar(['q3_director','q3_tel','q3_dir','q3_obs_gen','q3_hallazgos','q3_rec']);
    set('q3_lugar',''); set('q3_estatus','Pendiente'); set('q3_fecha', hoy());
    clearFoto('q3');
    document.getElementById('q3_ai_result').classList.remove('visible');
    document.getElementById('q3_num').placeholder = `INS-137.3-${anio}-${String(total+1).padStart(3,'0')}`;
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); console.error(e); } finally { _guardando = false; }
}

/* â•â•â• HELPER: CARGAR IMAGEN DESDE URL PARA PDF â•â•â• */
async function cargarImagenComoBase64(url) {
  try {
    const response = await fetch(url);
    const blob     = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch(e) {
    console.warn('Error cargando imagen:', e);
    return null;
  }
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

const COORDS_137_1 = {
  numero: [475, 130.1],
  unidad: [45, 183.0],
  area: [215, 183.0],
  director: [330, 183.0],
  fecha: [45, 210.5],
  trabajos: {
    'CarpinterÃ­a': [46.0, 228.5],
    'Electricidad': [138.7, 228.5],
    'Pintura': [219.4, 228.5],
    'RefrigeraciÃ³n': [276.1, 228.5],
    'EbanisterÃ­a': [369.6, 228.5],
    'Limpieza': [459.0, 228.5],
    'PlomerÃ­a': [46.0, 244.1]
  },
  descripcion: [45, 298.0],
  seccion: [45, 532.0],
  division: [173, 532.0],
  distrito: [300, 532.0],
  area_loc: [431, 532.0],
  negociado: [45, 561.5],
  superintendencia: [300, 561.5],
  firma: [45, 591.0],
  telefono: [380, 591.0],
  autorizado: [45, 642.0],
  fecha_aut: [423, 642.0],
  viajar_a_nombre: [45, 671.5],
  viajar_a_lugar: [344, 671.5],
  tablilla: [45, 701.0],
  acompanante: [300, 701.0]
};

const COORDS_137_3 = {"ext": [[1, 246.4], [1, 262.4], [1, 277.9], [1, 389.4], [1, 405.5], [1, 421.5], [1, 437.5], [1, 453.5], [1, 469.7], [1, 485.8], [1, 501.9], [1, 517.9], [1, 533.9]], "int": [[1, 579.2], [1, 595.3], [1, 611.3], [1, 374.6], [1, 469.7], [1, 738.9], [1, 754.5], [1, 782.6], [1, 333.2], [1, 668.5], [1, 517.9], [1, 859.4], [1, 875.4], [1, 891.6]], "com": [[2, 57.1], [2, 85.2], [2, 127.1], [2, 183.3], [2, 198.9], [2, 241.3], [2, 270.6], [2, 367.7], [2, 423.4], [2, 451.5], [2, 521.5]], "adm": [[2, 784.8], [2, 57.1], [2, 70.9], [2, 451.5], [2, 637.3], [2, 653.5], [2, 669.5], [2, 685.5], [2, 367.7], [2, 717.7], [2, 733.7], [2, 749.9]], "bib": [[2, 784.8], [2, 57.1], [2, 70.9], [2, 832.5], [2, 367.7], [2, 872.5], [2, 423.4], [2, 521.5]], "aca": [[3, 79.4], [3, 95.4], [3, 111.5], [3, 127.7], [3, 143.6], [3, 159.7], [3, 175.9], [3, 191.8], [3, 208.0]], "ban": [[3, 242.8], [3, 258.8], [3, 191.8], [3, 291.0], [3, 307.1], [3, 323.2], [3, 339.2], [3, 355.4], [3, 371.3], [3, 208.0], [3, 403.0]], "tec": [[3, 455.1], [3, 471.2], [3, 291.0], [3, 503.3], [3, 519.4], [3, 535.4], [3, 551.5]], "can": [[3, 586.0], [3, 619.1], [3, 635.4], [3, 651.2], [3, 667.3], [3, 111.5], [3, 699.6], [3, 715.7], [3, 371.3], [3, 224.9], [3, 763.8], [3, 175.9], [3, 535.4], [3, 291.0]], "seg": [[3, 846.5], [3, 892.9], [3, 944.0], [4, 38.6], [4, 54.8], [4, 70.9], [4, 86.4]], "ele": [[4, 128.8], [4, 161.5], [4, 194.2], [4, 226.8], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6]], "dor": [[4, 142.0], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6], [4, 240.6]]};

/* â•â•â• EXPORTAR PDF â•â•â• */
function pdfHeader(doc, titulo) {
  const azul  = [10, 25, 47];
  const gold  = [197, 160, 89];
  const W     = doc.internal.pageSize.getWidth();
  const ts    = new Date().toLocaleString('es-PR');

  // Fondo encabezado
  doc.setFillColor(...azul);
  doc.rect(0, 0, W, 38, 'F');

  // TÃ­tulo principal
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DACE ARECIBO', W / 2, 13, { align: 'center' });

  // SubtÃ­tulo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PolicÃ­a de Puerto Rico', W / 2, 20, { align: 'center' });

  // LÃ­nea dorada
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.8);
  doc.line(10, 25, W - 10, 25);

  // TÃ­tulo del reporte
  doc.setTextColor(...gold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo.toUpperCase(), W / 2, 33, { align: 'center' });

  // Fecha generaciÃ³n
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${ts}  |  Agte. Aponte Cancel Â· Placa 31093`, W / 2, 37, { align: 'center' });

  return 45; // y de inicio del contenido
}

function pdfLinea(doc, y, W) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(10, y, W - 10, y);
  return y + 4;
}

function checkPage(doc, y, needed = 20) {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed > H - 15) {
    doc.addPage();
    return 15;
  }
  return y;
}

/* â”€â”€ HELPER: RENDERIZAR FICHA OFICIAL PPR-137.1 â”€â”€ */
async function renderSingleQ1PageWithPdfLib(pdfDoc, d, incluirFotos) {
  const { rgb, StandardFonts } = PDFLib;
  const pages = pdfDoc.getPages();
  const page = pages[0]; // Plantilla original solo tiene 1 pÃ¡gina
  const height = page.getHeight();
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const textColor = rgb(0.04, 0.1, 0.18); // Color de tinta azul marino oscuro
  
  // Helper para escribir texto con autoajuste de tamaÃ±o de letra para evitar desbordes (por defecto 12pt Bold)
  const write = (text, [x, top_y], font = fontBold, defaultSize = 12, maxWidth = null) => {
    if (text === undefined || text === null || text === '') return;
    let size = defaultSize;
    if (maxWidth) {
      const textWidth = font.widthOfTextAtSize(String(text), defaultSize);
      if (textWidth > maxWidth) {
        size = Math.max(5.5, defaultSize * (maxWidth / textWidth));
      }
    }
    page.drawText(String(text), {
      x: x,
      y: height - top_y + 3.0, // Subir ligeramente para centrar en las cajas
      size: size,
      font: font,
      color: textColor
    });
  };

  // Escribir campos simples
  write(d.numero, COORDS_137_1.numero, fontBold, 12, 80);
  write(d.unidad, COORDS_137_1.unidad, fontBold, 12, 150);
  write(d.area, COORDS_137_1.area, fontBold, 12, 100);
  write(d.director, COORDS_137_1.director, fontBold, 12, 230);
  write(d.fecha, COORDS_137_1.fecha, fontBold, 12, 150);
  
  // Trabajos solicitados (checkboxes)
  const works = d.trabajos || [];
  Object.keys(COORDS_137_1.trabajos).forEach(name => {
    if (works.includes(name)) {
      const [cx, ctop] = COORDS_137_1.trabajos[name];
      // Dibujar una X
      page.drawText('X', {
        x: cx + 2.0, // Desplazar un poco a la derecha para centrar en el cuadro
        y: height - ctop - 5.5, // Bajar un poco mÃ¡s para centrar verticalmente
        size: 11,
        font: fontBold,
        color: rgb(0.8, 0.1, 0.1) // Check en rojo para que destaque
      });
    }
  });
  
  // DescripciÃ³n Servicio Solicitado (multilinea)
  if (d.descripcion) {
    const descText = String(d.descripcion);
    const words = descText.split(' ');
    let lines = [];
    let currentLine = '';
    words.forEach(w => {
      const testLine = currentLine ? currentLine + ' ' + w : w;
      const width = fontBold.widthOfTextAtSize(testLine, 12);
      if (width > 520) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    // Escribir lÃ­neas
    let startY = COORDS_137_1.descripcion[1];
    lines.slice(0, 12).forEach((line, idx) => {
      write(line, [COORDS_137_1.descripcion[0], startY + (idx * 14.5)], fontBold, 12);
    });
  }
  
  // LocalizaciÃ³n
  write(d.seccion, COORDS_137_1.seccion, fontBold, 12, 115);
  write(d.division, COORDS_137_1.division, fontBold, 12, 115);
  write(d.distrito, COORDS_137_1.distrito, fontBold, 12, 115);
  write(d.area2 || d.area_loc, COORDS_137_1.area_loc, fontBold, 12, 135);
  write(d.negociado, COORDS_137_1.negociado, fontBold, 12, 235);
  write(d.super, COORDS_137_1.superintendencia, fontBold, 12, 265);
  write(d.solicitante, COORDS_137_1.firma, fontBold, 12, 355);
  write(d.telefono, COORDS_137_1.telefono, fontBold, 12, 145);
  
  // Para uso oficial
  write(d.adminAutorizado, COORDS_137_1.autorizado, fontBold, 12, 355);
  write(d.adminFecha, COORDS_137_1.fecha_aut, fontBold, 12, 145);
  write(d.adminAutorizaA, COORDS_137_1.viajar_a_nombre, fontBold, 12, 280);
  write(d.adminViajarA, COORDS_137_1.viajar_a_lugar, fontBold, 12, 220);
  write(d.adminTablilla, COORDS_137_1.tablilla, fontBold, 12, 235);
  write(d.adminAcompanante, COORDS_137_1.acompanante, fontBold, 12, 265);
  
  // Evidencia fotogrÃ¡fica (Si existe, va en una pÃ¡gina aÃ±adida al final)
  if (d.fotoUrl && incluirFotos) {
    try {
      const imgData = await cargarImagenComoBase64(d.fotoUrl);
      if (imgData) {
        const newPage = pdfDoc.addPage([612, 792]);
        const { width: pW, height: pH } = newPage.getSize();
        
        newPage.drawRectangle({
          x: 0,
          y: pH - 30,
          width: pW,
          height: 30,
          color: rgb(0.04, 0.1, 0.18)
        });
        
        newPage.drawText('ANEXO: EVIDENCIA FOTOGRÃFICA', {
          x: pW / 2 - 100,
          y: pH - 20,
          size: 11,
          font: fontBold,
          color: rgb(1, 1, 1)
        });
        
        let embeddedImage;
        if (imgData.startsWith('data:image/png')) {
          embeddedImage = await pdfDoc.embedPng(imgData);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imgData);
        }
        
        const dims = embeddedImage.scale(0.5);
        const imgW = pW - 60;
        const imgH = (dims.height / dims.width) * imgW;
        
        newPage.drawImage(embeddedImage, {
          x: 30,
          y: pH - 50 - imgH,
          width: imgW,
          height: imgH
        });
      }
    } catch (e) {
      console.warn('No se pudo aÃ±adir la foto al PDF anexo con pdf-lib:', e);
    }
  }
}

/* â”€â”€ EXPORTAR PDF INDIVIDUAL DE PPR-137.1 â”€â”€ */
async function exportarPDF_Q1_Single(d) {
  showToast('<i class="ph-fill ph-hourglass"></i> Generando PDF Oficial...', '#0a192f');
  
  let incluirFotos = false;
  if (d.fotoUrl) {
    incluirFotos = confirm('Â¿Deseas incluir la evidencia fotogrÃ¡fica en el PDF?');
  }
  
  try {
    const { PDFDocument } = PDFLib;
    const arrayBuffer = base64ToArrayBuffer(PDF_137_1);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    await renderSingleQ1PageWithPdfLib(pdfDoc, d, incluirFotos);
    
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SOL-137.1-${d.numero || 'sin-numero'}.pdf`;
    link.click();
    
    showToast('<i class="ph-bold ph-check"></i> PDF generado correctamente', '#166534');
  } catch (error) {
    console.error('Error generando PDF:', error);
    showToast('<i class="ph-bold ph-x"></i> Error generando PDF', '#dc2626');
  }
}

async function renderSingleQ3PageWithPdfLib(pdfDoc, d, incluirFotos) {
  const { rgb, StandardFonts } = PDFLib;
  const pages = pdfDoc.getPages();
  const height = pages[0].getHeight(); // Todas las pÃ¡ginas tienen la misma altura de 1008
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.04, 0.1, 0.18); // Tinta azul marino oscuro
  
  const writeOnPage = (pageNum, text, x, top_y, font = fontBold, defaultSize = 12, maxWidth = null) => {
    if (text === undefined || text === null || text === '') return;
    let size = defaultSize;
    if (maxWidth) {
      const textWidth = font.widthOfTextAtSize(String(text), defaultSize);
      if (textWidth > maxWidth) {
        size = Math.max(5.5, defaultSize * (maxWidth / textWidth));
      }
    }
    const page = pages[pageNum - 1];
    page.drawText(String(text), {
      x: x,
      y: height - top_y - 7.5, // Centrado vertical en la celda
      size: size,
      font: font,
      color: textColor
    });
  };
  
  // 1. Cabecera (PÃ¡gina 1)
  writeOnPage(1, d.numero, 30, 148, fontBold, 12, 160);
  writeOnPage(1, d.lugar, 222, 148, fontBold, 12, 160);
  writeOnPage(1, d.area || 'Arecibo', 402, 148, fontBold, 12, 160);
  writeOnPage(1, d.director, 30, 177, fontBold, 12, 350);
  writeOnPage(1, d.telefono, 402, 177, fontBold, 12, 160);
  writeOnPage(1, d.direccion, 30, 206, fontBold, 12, 350);
  writeOnPage(1, d.fecha, 402, 206, fontBold, 12, 160);
  
  // 2. Rellenar las Secciones de la InspecciÃ³n
  if (d.inspeccion) {
    Object.keys(COORDS_137_3).forEach(sec => {
      const secData = d.inspeccion[sec];
      if (!secData || !Array.isArray(secData)) return;
      
      secData.forEach((it, idx) => {
        const coord = COORDS_137_3[sec][idx];
        if (!coord) return;
        const [pNum, top_y] = coord;
        
        // Determinar coordenadas X de checkboxes
        // Buen Estado = 'E', ReparaciÃ³n = 'R', Reemplazo = 'P'
        let checkX = null;
        if (it.estado === 'E' || it.estado === 'B' || it.estado === 'Buen Estado') {
          checkX = 320;
        } else if (it.estado === 'R' || it.estado === 'ReparaciÃ³n') {
          checkX = 269;
        } else if (it.estado === 'P' || it.estado === 'Reemplazo') {
          checkX = 218;
        }
        
        if (checkX) {
          const page = pages[pNum - 1];
          page.drawText('X', {
            x: checkX,
            y: height - top_y - 8.5, // centrado vertical en checkbox â˜
            size: 11,
            font: fontBold,
            color: rgb(0.8, 0.1, 0.1) // Rojo para destacar
          });
        }
        
        // Escribir cantidad
        if (it.cantidad) {
          writeOnPage(pNum, it.cantidad, 356, top_y, fontBold, 12, 55);
        }
        
        // Escribir observaciones
        if (it.observaciones) {
          writeOnPage(pNum, it.observaciones, 424, top_y, fontBold, 11, 150);
        }
      });
    });
  }
  
  // 3. Observaciones Generales (PÃ¡gina 4)
  const obsGen = [
    d.observacionesGenerales,
    d.hallazgos ? `Hallazgos: ${d.hallazgos}` : '',
    d.recomendaciones ? `Recomendaciones: ${d.recomendaciones}` : '',
    d.medidas ? `Medidas Tomadas: ${d.medidas}` : ''
  ].filter(Boolean).join('\n');
  
  if (obsGen) {
    const lines = obsGen.split('\n');
    let startY = 645;
    lines.forEach((line, idx) => {
      const words = line.split(' ');
      let currentLine = '';
      words.forEach(w => {
        const testLine = currentLine ? currentLine + ' ' + w : w;
        const width = fontRegular.widthOfTextAtSize(testLine, 8);
        if (width > 520) {
          writeOnPage(4, currentLine, 30, startY, fontRegular, 8);
          startY += 10;
          currentLine = w;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) {
        writeOnPage(4, currentLine, 30, startY, fontRegular, 8);
        startY += 12;
      }
    });
  }
  
  // 4. Firmas (PÃ¡gina 4)
  writeOnPage(4, d.supervisor, 30, 770, fontBold, 8.5);
  writeOnPage(4, 'Coordinador DACE', 30, 799);
  writeOnPage(4, d.fecha, 312, 799);
  
  // 5. Evidencia fotogrÃ¡fica (Si existe, se aÃ±ade al final de las 4 pÃ¡ginas)
  if (d.fotoUrl && incluirFotos) {
    try {
      const imgData = await cargarImagenComoBase64(d.fotoUrl);
      if (imgData) {
        const newPage = pdfDoc.addPage([612, 1008]);
        const { width: pW, height: pH } = newPage.getSize();
        
        newPage.drawRectangle({
          x: 0,
          y: pH - 30,
          width: pW,
          height: 30,
          color: rgb(0.04, 0.1, 0.18)
        });
        
        newPage.drawText('ANEXO: EVIDENCIA FOTOGRÃFICA', {
          x: pW / 2 - 100,
          y: pH - 20,
          size: 11,
          font: fontBold,
          color: rgb(1, 1, 1)
        });
        
        let embeddedImage;
        if (imgData.startsWith('data:image/png')) {
          embeddedImage = await pdfDoc.embedPng(imgData);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imgData);
        }
        
        const dims = embeddedImage.scale(0.5);
        const imgW = pW - 60;
        const imgH = (dims.height / dims.width) * imgW;
        
        newPage.drawImage(embeddedImage, {
          x: 30,
          y: pH - 50 - imgH,
          width: imgW,
          height: imgH
        });
      }
    } catch (e) {
      console.warn('No se pudo aÃ±adir la foto al PDF anexo de Q3:', e);
    }
  }
}

async function exportarPDF_Q1_Single_By_Id(id) {
  if (typeof _cache === 'undefined' || !_cache.q1) {
    showToast('âš ï¸ Datos no cargados en cachÃ©', '#dc2626');
    return;
  }
  const d = _cache.q1.find(x => x._id === id);
  if (!d) {
    showToast('âš ï¸ Registro no encontrado', '#dc2626');
    return;
  }
  await exportarPDF_Q1_Single(d);
}

async function exportarPDF(modulo) {
  showToast('<i class="ph-fill ph-hourglass"></i> Generando PDF...', '#0a192f');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W   = doc.internal.pageSize.getWidth();
  const azul  = [10, 25, 47];
  const gold  = [197, 160, 89];

  let titulo, y;

  const keyMap = { q137_1: 'q1', q137_3: 'q3', casos: 'c', maestro: 'rm', mantenimiento: 'mt' };
  const key = keyMap[modulo] || modulo;
  const items = obtenerDatosFiltrados(key);

  if (!items || items.length === 0) {
    showToast('<i class="ph-bold ph-x"></i> No hay registros para exportar', '#92400e');
    return;
  }

  // Confirmar si incluir imÃ¡genes para no congelar el navegador en reportes grandes
  let incluirFotos = false;
  const tieneFotos = items.some(d => d.fotoUrl);
  if (tieneFotos) {
    incluirFotos = confirm(
      `El reporte contiene ${items.length} registro(s).\n\n` +
      `Â¿Deseas incluir las fotos de evidencia fotogrÃ¡fica en el PDF?\n` +
      `(Nota: Si exportas muchos registros con fotos, la generaciÃ³n tardarÃ¡ mÃ¡s tiempo y podrÃ­a congelar el navegador).`
    );
  }

  try {
    if (modulo === 'q137_1') {
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();
      
      for (let i = 0; i < items.length; i++) {
        const templateBuffer = base64ToArrayBuffer(PDF_137_1);
        const tempPdf = await PDFDocument.load(templateBuffer);
        await renderSingleQ1PageWithPdfLib(tempPdf, items[i], incluirFotos);
        
        const copiedPages = await mergedPdf.copyPages(tempPdf, tempPdf.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const fechaFile = new Date().toISOString().split('T')[0];
      link.download = `DACE_Arecibo_PPR-137.1_Incidentes_${fechaFile}.pdf`;
      link.click();
      
      showToast('<i class="ph-bold ph-check"></i> PDF generado correctamente', '#166534');
      return;
    }

    else if (modulo === 'q137_3') {
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();
      
      for (let i = 0; i < items.length; i++) {
        const templateBuffer = base64ToArrayBuffer(PDF_137_3);
        const tempPdf = await PDFDocument.load(templateBuffer);
        await renderSingleQ3PageWithPdfLib(tempPdf, items[i], incluirFotos);
        
        const copiedPages = await mergedPdf.copyPages(tempPdf, tempPdf.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const fechaFile = new Date().toISOString().split('T')[0];
      link.download = `DACE_Arecibo_PPR-137.3_Inspecciones_${fechaFile}.pdf`;
      link.click();
      
      showToast('<i class="ph-bold ph-check"></i> PDF generado correctamente', '#166534');
      return;
    }

    else if (modulo === 'casos') {
      titulo = 'Registro de Casos Activos';
      y      = pdfHeader(doc, titulo);

      for (let i = 0; i < items.length; i++) {
        const d = items[i];
        y = checkPage(doc, y, 40);

        const prioColor = { Alta:[220,38,38], Media:[146,112,10], Baja:[22,163,74] }[d.prioridad] || [60,60,60];
        doc.setFillColor(245, 245, 245);
        doc.rect(10, y, W-20, 7, 'F');
        doc.setTextColor(...prioColor);
        doc.setFontSize(9);
        doc.setFont('helvetica','bold');
        doc.text(`#${i+1}  ${d.numero||'â€”'}  [${d.prioridad||''}]`, 13, y+5);
        doc.setFont('helvetica','normal');
        doc.setTextColor(100,100,100);
        doc.setFontSize(7);
        doc.text(`${d.fecha||''}`, W-13, y+5, {align:'right'});
        y += 10;

        const campos = [
          ['DescripciÃ³n', d.descripcion],
          ['Responsable', d.responsable],
          ['PrÃ³xima AcciÃ³n', d.accion],
          ['Estatus', d.estatus],
        ];
        campos.forEach(([label, val]) => {
          if (!val) return;
          y = checkPage(doc, y, 10);
          doc.setTextColor(...azul);
          doc.setFontSize(7);
          doc.setFont('helvetica','bold');
          doc.text(label + ':', 13, y);
          doc.setFont('helvetica','normal');
          doc.setTextColor(60,60,60);
          const lines = doc.splitTextToSize(val, W - 55);
          doc.text(lines, 45, y);
          y += (lines.length * 4) + 2;
        });

        y = pdfLinea(doc, y+2, W);
      }
    }

    else if (modulo === 'maestro') {
      titulo = 'Registro Maestro de Actividades';
      y      = pdfHeader(doc, titulo);

      for (let i = 0; i < items.length; i++) {
        const d = items[i];
        y = checkPage(doc, y, 30);

        doc.setFillColor(245, 245, 245);
        doc.rect(10, y, W-20, 7, 'F');
        doc.setTextColor(...azul);
        doc.setFontSize(9);
        doc.setFont('helvetica','bold');
        doc.text(`#${i+1}  ${d.tipo||'â€”'}`, 13, y+5);
        doc.setFont('helvetica','normal');
        doc.setTextColor(100,100,100);
        doc.setFontSize(7);
        doc.text(`${d.fecha||''} ${d.hora||''}`, W-13, y+5, {align:'right'});
        y += 10;

        if (d.descripcion) {
          y = checkPage(doc, y, 10);
          doc.setTextColor(60,60,60);
          doc.setFontSize(8);
          doc.setFont('helvetica','normal');
          const lines = doc.splitTextToSize(d.descripcion, W - 25);
          doc.text(lines, 13, y);
          y += (lines.length * 4) + 2;
        }
        if (d.notas) {
          y = checkPage(doc, y, 8);
          doc.setTextColor(130,130,130);
          doc.setFontSize(7);
          const lines = doc.splitTextToSize('Notas: ' + d.notas, W - 25);
          doc.text(lines, 13, y);
          y += (lines.length * 4) + 2;
        }

        y = pdfLinea(doc, y+1, W);
      }
    }

    else if (modulo === 'mantenimiento') {
      titulo = 'Registro de Trabajos de Mantenimiento';
      y      = pdfHeader(doc, titulo);

      for (let i = 0; i < items.length; i++) {
        const d = items[i];
        y = checkPage(doc, y, 40);

        doc.setFillColor(245, 240, 255);
        doc.rect(10, y, W-20, 7, 'F');
        doc.setTextColor(124, 58, 237);
        doc.setFontSize(9);
        doc.setFont('helvetica','bold');
        doc.text(`#${i+1}  ${d.lugar||'â€”'}  Â·  ${d.departamento||''}`, 13, y+5);
        doc.setFont('helvetica','normal');
        doc.setTextColor(100,100,100);
        doc.setFontSize(7);
        doc.text(`${d.fecha||''} ${d.hora||''}`, W-13, y+5, {align:'right'});
        y += 10;

        const campos = [
          ['DescripciÃ³n', d.descripcion],
          ['Notificado A', d.notificadoA],
          ['MÃ©todo', d.metodo],
          ['Estatus', d.estatus],
        ];
        campos.forEach(([label, val]) => {
          if (!val) return;
          y = checkPage(doc, y, 10);
          doc.setTextColor(124, 58, 237);
          doc.setFontSize(7);
          doc.setFont('helvetica','bold');
          doc.text(label + ':', 13, y);
          doc.setFont('helvetica','normal');
          doc.setTextColor(60,60,60);
          const lines = doc.splitTextToSize(val, W - 55);
          doc.text(lines, 45, y);
          y += (lines.length * 4) + 2;
        });

        y = pdfLinea(doc, y+2, W);
      }
    }

    // Agregar firma en Ãºltima pÃ¡gina de 137.1 y 137.3
    if (modulo === 'q137_1' || modulo === 'q137_3') {
      const lastPage = doc.internal.getNumberOfPages();
      doc.setPage(lastPage);
      y = checkPage(doc, y, 35);

      // LÃ­nea de firma
      doc.setDrawColor(...azul);
      doc.setLineWidth(0.5);
      doc.line(10, y+20, 95, y+20);
      doc.line(115, y+20, W-10, y+20);

      // Firma imagen
      try {
        doc.addImage(FIRMA_B64, 'PNG', 10, y, 85, 18);
      } catch(e) { console.warn('Firma no disponible'); }

      doc.setTextColor(...azul);
      doc.setFontSize(8);
      doc.setFont('helvetica','bold');
      doc.text('Agte. Jose C. Aponte Cancel', 10, y+25);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.setTextColor(100,100,100);
      doc.text('Coordinador Auxiliar DACE Â· Placa 31093', 10, y+30);
      doc.text('DACE Arecibo â€” Ãrea Arecibo', 10, y+34);

      // Fecha de generaciÃ³n
      doc.setTextColor(...azul);
      doc.setFontSize(8);
      doc.setFont('helvetica','bold');
      doc.text('Fecha:', 115, y+25);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.setTextColor(100,100,100);
      doc.text(new Date().toLocaleDateString('es-PR',{day:'2-digit',month:'long',year:'numeric'}), 115, y+30);
    }

    // Pie de pÃ¡gina en todas las pÃ¡ginas (dibujado al final para asegurar la pÃ¡gina de firma si esta overflows)
    const totalPags = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
      doc.setPage(p);
      doc.setFillColor(...azul);
      doc.rect(0, doc.internal.pageSize.getHeight()-10, W, 10, 'F');
      doc.setTextColor(150,150,150);
      doc.setFontSize(7);
      doc.setFont('helvetica','normal');
      doc.text(`DACE Arecibo â€” NPPR â€” Documento oficial  |  PÃ¡gina ${p} de ${totalPags}`,
        W/2, doc.internal.pageSize.getHeight()-3, {align:'center'});
    }

    // Nombre del archivo
    const nombres = {
      q137_1: 'PPR-137.1_Incidentes',
      q137_3: 'PPR-137.3_Inspecciones',
      casos:  'Casos_Activos',
      maestro:'Registro_Maestro',
      mantenimiento: 'Registro_Mantenimiento'
    };
    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`DACE_Arecibo_${nombres[modulo]||modulo}_${fecha}.pdf`);
    showToast('<i class="ph-bold ph-check"></i> PDF generado correctamente', '#166534');

  } catch(e) {
    showToast('<i class="ph-bold ph-x"></i> Error al generar PDF: ' + e.message, '#dc2626');
    console.error(e);
  }
}

async function registrarEnMaestroAuto(tipo, descripcion, notas = '') {
  try {
    await db.collection('dace_maestro').add({
      tipo,
      fecha: hoy(),
      hora: ahora(),
      descripcion,
      notas,
      usuario: 'Sistema Â· SincronizaciÃ³n',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) {
    console.error('Error auto-sincronizando al Registro Maestro:', e);
  }
}

/* â•â•â• EXPORTAR REPORTE GENERAL (PANEL) â•â•â• */
async function exportarPanelPDF() {
  showToast('<i class="ph-fill ph-hourglass"></i> Generando reporte general...', '#0a192f');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W   = doc.internal.pageSize.getWidth();
  const azul = [10, 25, 47];
  const gold  = [197, 160, 89];

  try {
    let y = pdfHeader(doc, 'Reporte General del Sistema');

    // Contadores
    const [s1, s2, s3, s4] = await Promise.all([
      db.collection('dace_q137_1').get(),
      db.collection('dace_q137_3').get(),
      db.collection('dace_casos').get(),
      db.collection('dace_maestro').get(),
    ]);

    y += 5;
    doc.setTextColor(...azul);
    doc.setFontSize(11);
    doc.setFont('helvetica','bold');
    doc.text('RESUMEN ESTADÃSTICO', W/2, y, {align:'center'});
    y += 8;

    const stats = [
      ['Ã“rdenes de Trabajo PPR-137.1', s1.size, [10,25,47]],
      ['Inspecciones PPR-137.3', s2.size, [92,112,10]],
      ['Casos Activos', s3.size, [22,163,74]],
      ['Registro Maestro', s4.size, [220,38,38]],
    ];

    stats.forEach(([label, count, color]) => {
      doc.setFillColor(...color);
      doc.rect(10, y, W-20, 12, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(10);
      doc.setFont('helvetica','bold');
      doc.text(label, 16, y+8);
      doc.setFontSize(14);
      doc.text(String(count), W-16, y+9, {align:'right'});
      y += 15;
    });

    const sortRecientes = (docs) => {
      return [...docs].sort((a,b) => {
        const t1 = a.data().createdAt?.seconds || 0;
        const t2 = b.data().createdAt?.seconds || 0;
        return t2 - t1;
      }).slice(0, 5);
    };

    const q1Recientes = sortRecientes(s1.docs);
    const q3Recientes = sortRecientes(s2.docs);
    const casosRecientes = sortRecientes(s3.docs);
    const rmRecientes = sortRecientes(s4.docs);

    // 1. INCIDENTES 137.1
    y += 5;
    doc.setTextColor(...azul);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text('ACTIVIDAD RECIENTE â€” INCIDENTES 137.1', 10, y);
    y += 5;

    if (!q1Recientes.length) {
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(150,150,150);
      doc.text('No hay registros de incidentes.', 13, y+4);
      y += 10;
    } else {
      q1Recientes.forEach((docSnap) => {
        const d = docSnap.data();
        y = checkPage(doc, y, 16);
        doc.setFillColor(245,248,252);
        doc.rect(10, y, W-20, 13, 'F');
        
        doc.setTextColor(...azul); doc.setFontSize(8); doc.setFont('helvetica','bold');
        doc.text(d.numero || 'â€”', 13, y+5);
        doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(120,120,120);
        doc.text(d.fecha || 'â€”', 13, y+10);
        
        doc.setTextColor(60,60,60);
        const desc = limpiarDesc(d.descripcion || '', 70);
        doc.text(desc, 55, y+5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Estatus: ${d.estatus || 'â€”'}`, 55, y+10);
        
        doc.setFont('helvetica', 'normal');
        doc.text(limpiarDesc(d.unidad || '', 30), W-13, y+5, {align:'right'});
        doc.text(limpiarDesc(d.usuario || '', 30), W-13, y+10, {align:'right'});
        y += 16;
      });
    }

    // 2. INSPECCIONES 137.3
    y += 3;
    doc.setTextColor(...azul);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text('ACTIVIDAD RECIENTE â€” INSPECCIONES 137.3', 10, y);
    y += 5;

    if (!q3Recientes.length) {
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(150,150,150);
      doc.text('No hay registros de inspecciones.', 13, y+4);
      y += 10;
    } else {
      q3Recientes.forEach((docSnap) => {
        const d = docSnap.data();
        y = checkPage(doc, y, 16);
        doc.setFillColor(255,251,235);
        doc.rect(10, y, W-20, 13, 'F');
        
        doc.setTextColor(92,70,10); doc.setFontSize(8); doc.setFont('helvetica','bold');
        doc.text(d.numero || 'â€”', 13, y+5);
        doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(120,120,120);
        doc.text(d.fecha || 'â€”', 13, y+10);
        
        doc.setTextColor(60,60,60);
        const lugarTipo = limpiarDesc(`${d.lugar || ''} Â· ${d.tipo || ''}`, 70);
        doc.text(lugarTipo, 55, y+5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Estatus: ${d.estatus || 'â€”'}`, 55, y+10);
        
        doc.setFont('helvetica', 'normal');
        doc.text(limpiarDesc(d.director || '', 30), W-13, y+5, {align:'right'});
        doc.text(limpiarDesc(d.usuario || '', 30), W-13, y+10, {align:'right'});
        y += 16;
      });
    }

    // 3. CASOS ACTIVOS
    y += 3;
    doc.setTextColor(...azul);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text('ACTIVIDAD RECIENTE â€” CASOS ACTIVOS', 10, y);
    y += 5;

    if (!casosRecientes.length) {
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(150,150,150);
      doc.text('No hay registros de casos activos.', 13, y+4);
      y += 10;
    } else {
      casosRecientes.forEach((docSnap) => {
        const d = docSnap.data();
        y = checkPage(doc, y, 16);
        doc.setFillColor(240,253,244);
        doc.rect(10, y, W-20, 13, 'F');
        
        doc.setTextColor(21,128,61); doc.setFontSize(8); doc.setFont('helvetica','bold');
        doc.text(d.numero || 'â€”', 13, y+5);
        doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(120,120,120);
        doc.text(d.fecha || 'â€”', 13, y+10);
        
        doc.setTextColor(60,60,60);
        const desc = limpiarDesc(d.descripcion || '', 70);
        doc.text(desc, 55, y+5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Prioridad: ${d.prioridad || ''} Â· Estatus: ${d.estatus || ''}`, 55, y+10);
        
        doc.setFont('helvetica', 'normal');
        doc.text(limpiarDesc(d.responsable || '', 30), W-13, y+5, {align:'right'});
        doc.text(limpiarDesc(d.usuario || '', 30), W-13, y+10, {align:'right'});
        y += 16;
      });
    }

    // 4. REGISTRO MAESTRO
    y += 3;
    doc.setTextColor(...azul);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text('ACTIVIDAD RECIENTE â€” REGISTRO MAESTRO', 10, y);
    y += 5;

    if (!rmRecientes.length) {
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(150,150,150);
      doc.text('No hay registros en el maestro.', 13, y+4);
      y += 10;
    } else {
      rmRecientes.forEach((docSnap) => {
        const d = docSnap.data();
        y = checkPage(doc, y, 16);
        doc.setFillColor(254,242,242);
        doc.rect(10, y, W-20, 13, 'F');
        
        doc.setTextColor(153,27,27); doc.setFontSize(8); doc.setFont('helvetica','bold');
        doc.text(d.tipo || 'â€”', 13, y+5);
        doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(120,120,120);
        doc.text(`${d.fecha || ''} ${d.hora || ''}`, 13, y+10);
        
        doc.setTextColor(60,60,60);
        const desc = limpiarDesc(d.descripcion || '', 70);
        doc.text(desc, 55, y+5);
        doc.text(limpiarDesc(d.notas || '', 70), 55, y+10);
        
        doc.setFont('helvetica', 'normal');
        doc.text(limpiarDesc(d.usuario || '', 30), W-13, y+10, {align:'right'});
        y += 16;
      });
    }

    // Firma en reporte general
    y = checkPage(doc, y, 35);
    try {
      doc.addImage(FIRMA_B64, 'PNG', 10, y+5, 70, 14);
    } catch(e) {}
    doc.setDrawColor(...azul); doc.setLineWidth(0.5);
    doc.line(10, y+22, 85, y+22);
    doc.setTextColor(...azul); doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.text('Agte. Jose C. Aponte Cancel Â· Placa 31093', 10, y+26);
    doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
    doc.text('Coordinador Auxiliar DACE Arecibo', 10, y+30);

    // Dibujar pie de pÃ¡gina en todas las hojas creadas
    const totalPags = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
      doc.setPage(p);
      doc.setFillColor(...azul);
      doc.rect(0, doc.internal.pageSize.getHeight()-10, W, 10, 'F');
      doc.setTextColor(150,150,150);
      doc.setFontSize(7);
      doc.setFont('helvetica','normal');
      doc.text(`DACE Arecibo â€” NPPR â€” Reporte General del Sistema  |  PÃ¡gina ${p} de ${totalPags}`,
        W/2, doc.internal.pageSize.getHeight()-3, {align:'center'});
    }

    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`DACE_Arecibo_Reporte_General_${fecha}.pdf`);
    showToast('<i class="ph-bold ph-check"></i> Reporte general generado', '#166534');

  } catch(e) {
    showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626');
    console.error(e);
  }
}

/* â”€â”€ AUTENTICACIÃ“N FIREBASE â”€â”€ */
let authReady = false;

function loginFirebase() {
  const email = document.getElementById('login_email')?.value?.trim();
  const pass  = document.getElementById('login_pass')?.value;
  const errEl = document.getElementById('login_error');
  errEl.textContent = '';

  if (!email || !pass) { errEl.textContent = 'âš ï¸ Completa correo y contraseÃ±a.'; return; }

  const btn = document.querySelector('#loginScreen button');
  btn.textContent = '<i class="ph-fill ph-hourglass"></i> Verificando...';
  btn.disabled = true;

  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(() => {
      // Auth exitoso â€” ocultar login, mostrar PIN
      document.getElementById('loginScreen').style.display = 'none';
      // Si ya tiene PIN en sesiÃ³n, ir directo a la app
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        document.getElementById('lockScreen').style.display = 'none';
      }
    })
    .catch(err => {
      btn.textContent = '<i class="ph-fill ph-lock-key"></i> ACCEDER';
      btn.disabled = false;
      const msgs = {
        'auth/wrong-password':    '<i class="ph-bold ph-x"></i> ContraseÃ±a incorrecta.',
        'auth/user-not-found':    '<i class="ph-bold ph-x"></i> Usuario no encontrado.',
        'auth/invalid-email':     '<i class="ph-bold ph-x"></i> Correo invÃ¡lido.',
        'auth/too-many-requests': 'â›” Demasiados intentos. Espera unos minutos.',
        'auth/invalid-credential':'<i class="ph-bold ph-x"></i> Credenciales incorrectas.',
      };
      errEl.textContent = msgs[err.code] || '<i class="ph-bold ph-x"></i> Error: ' + err.message;
    });
}

/* â”€â”€ SISTEMA DE PIN â”€â”€ */
const PIN_CORRECTO = '5464';
const SESSION_KEY  = 'dace_auth_ok';
let pinActual = '';

function mostrarPinSiNecesario() {
  // PIN desactivado â€” Firebase Auth es suficiente
  document.getElementById('lockScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';
}

function pinPress(n) {
  if (pinActual.length >= 4) return;
  pinActual += n;
  actualizarDots();
  if (pinActual.length === 4) {
    setTimeout(verificarPin, 120);
  }
}

function pinDel() {
  pinActual = pinActual.slice(0, -1);
  actualizarDots();
  document.getElementById('lockMsg').textContent = 'Introduce tu PIN de acceso';
}

function actualizarDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('d' + i);
    if (!dot) return;
    dot.classList.toggle('filled', i < pinActual.length);
    dot.classList.remove('error');
  }
}

function verificarPin() {
  if (pinActual === PIN_CORRECTO) {
    sessionStorage.setItem(SESSION_KEY, '1');
    const ls = document.getElementById('lockScreen');
    ls.style.transition = 'opacity 0.4s';
    ls.style.opacity = '0';
    setTimeout(() => ls.style.display = 'none', 400);
  } else {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('d' + i);
      if (dot) { dot.classList.add('error'); dot.classList.remove('filled'); }
    }
    document.getElementById('lockMsg').textContent = '<i class="ph-bold ph-x"></i> PIN incorrecto. Intenta de nuevo.';
    pinActual = '';
    setTimeout(actualizarDots, 800);
  }
}

/* â”€â”€ FIREBASE CONFIG â€” DACE-ARECIBO-OFICIAL â”€â”€ */
const firebaseConfig = {
  apiKey: decryptApiKey("JSgZBAwYMSMzOwUJKDJRVSo8Jy4XDF4tEGhbXGdQCgQRKgU3ICge"),
  authDomain:        "dace-arecibo-oficial.firebaseapp.com",
  projectId:         "dace-arecibo-oficial",
  storageBucket:     "dace-arecibo-oficial.firebasestorage.app",
  messagingSenderId: "106138453670",
  appId:             "1:106138453670:web:0df609d6159739af58aa9b"
};

/* â”€â”€ INICIALIZAR â”€â”€ */
let db;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();

  db.enablePersistence({ synchronizeTabs: true })
    .catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn('Persistencia: mÃºltiples tabs detectadas');
      } else if (err.code === 'unimplemented') {
        console.warn('Persistencia offline no soportada en este navegador');
      }
    });

  // Observar estado de autenticaciÃ³n
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // Autenticado â€” ocultar login, mostrar PIN o app
      document.getElementById('loginScreen').style.display = 'none';
      setFbStatus('online', '<i class="ph-bold ph-check"></i> Firebase conectado Â· dace-arecibo-oficial Â· SincronizaciÃ³n activa');
      // Mostrar PIN si no ha sido validado en esta sesiÃ³n
      mostrarPinSiNecesario();
      if (!authReady) {
        authReady = true;
        initListeners();
      }
    } else {
      // No autenticado â€” mostrar login, ocultar todo lo demÃ¡s
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('lockScreen').style.display  = 'none';
      setFbStatus('error', 'ðŸ”’ SesiÃ³n no iniciada â€” Inicia sesiÃ³n para continuar');
    }
  });

} catch(e) {
  setFbStatus('error', '<i class="ph-bold ph-x"></i> Error de conexiÃ³n: ' + e.message);
  console.error('Firebase init error:', e);
}

/* â”€â”€ ESTADO CONEXIÃ“N â”€â”€ */
function setFbStatus(state, msg) {
  document.getElementById('fbDot').className = 'fb-dot ' + state;
  document.getElementById('fbText').innerHTML = msg;
  const ms = document.getElementById('masStatus');
  if (ms) {
    ms.innerHTML = msg;
    ms.style.color = state === 'online' ? '#16a34a' : '#dc2626';
  }
}

/* â”€â”€ NAVEGACIÃ“N â”€â”€ */
function changeTab(id) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + id);
  if (btn) btn.classList.add('active');
  window.scrollTo(0, 0);
}

/* â”€â”€ TOAST PREMIUM CON BARRA DE PROGRESO â”€â”€ */
let _tTimer;
function showToast(msg, bg) {
  const t = document.getElementById('toast');
  const txt = document.getElementById('toast-text') || t;
  txt.innerHTML = msg;
  t.style.background = bg || 'var(--navy)';
  
  const prog = document.getElementById('toast-progress');
  if (prog) {
    prog.style.width = '100%';
    prog.style.transition = 'none';
    prog.offsetHeight; // trigger reflow
    prog.style.transition = 'width 3.2s linear';
    prog.style.width = '0%';
  }
  
  clearTimeout(_tTimer);
  t.classList.add('show');
  _tTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* â”€â”€ ADMINISTRADOR DE TEMAS (DÃA / NOCHE) â”€â”€ */
function applyTheme(mode) {
  const body = document.body;
  if (mode === 'auto') {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    if (isDay) {
      body.classList.remove('theme-night');
      body.classList.add('theme-day');
    } else {
      body.classList.remove('theme-day');
      body.classList.add('theme-night');
    }
  } else if (mode === 'day') {
    body.classList.remove('theme-night');
    body.classList.add('theme-day');
  } else if (mode === 'night') {
    body.classList.remove('theme-day');
    body.classList.add('theme-night');
  }
}

function changeThemeMode(mode) {
  localStorage.setItem('theme_preference', mode);
  applyTheme(mode);
  showToast(`âœ… Tema cambiado a: ${mode === 'auto' ? 'AutomÃ¡tico' : mode === 'day' ? 'DÃ­a (Claro)' : 'Noche (Oscuro)'}`, '#166534');
}

function initTheme() {
  const saved = localStorage.getItem('theme_preference') || 'auto';
  const select = document.getElementById('theme_select');
  if (select) select.value = saved;
  applyTheme(saved);
  
  setInterval(() => {
    const current = localStorage.getItem('theme_preference') || 'auto';
    if (current === 'auto') {
      applyTheme('auto');
    }
  }, 60000); // verify auto theme every minute
}

/* â”€â”€ ACCIONES BOTÃ“N ACCIÃ“N FLOTANTE (FAB) MÃ“VIL â”€â”€ */
function toggleFabMenu(event) {
  if (event) event.stopPropagation();
  const btn = document.getElementById('fabBtn');
  const menu = document.getElementById('fabMenu');
  if (btn && menu) {
    btn.classList.toggle('open');
    menu.classList.toggle('show');
  }
}

function closeFabMenu() {
  const btn = document.getElementById('fabBtn');
  const menu = document.getElementById('fabMenu');
  if (btn && menu) {
    btn.classList.remove('open');
    menu.classList.remove('show');
  }
}

// Cierra el FAB si se hace clic fuera
document.addEventListener('click', () => {
  closeFabMenu();
});

function fabAction(tabId) {
  closeFabMenu();
  changeTab(tabId);
  // Auto scroll a los campos de inserciÃ³n correspondientes
  setTimeout(() => {
    let focusInputId = '';
    if (tabId === 'q137_1') focusInputId = 'q1_solicitante';
    else if (tabId === 'q137_3') focusInputId = 'q3_lugar';
    else if (tabId === 'casos') focusInputId = 'c_descripcion';
    else if (tabId === 'mantenimiento') focusInputId = 'mt_lugar';
    
    if (focusInputId) {
      const el = document.getElementById(focusInputId);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, 200);
}

/* â”€â”€ VALIDACIÃ“N VISUAL EN FORMULARIOS â”€â”€ */
function resaltarValidacion(elId, esValido) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!esValido) {
    el.classList.add('input-invalid');
    el.classList.remove('input-valid');
    setTimeout(() => el.classList.remove('input-invalid'), 600);
  } else {
    el.classList.remove('input-invalid');
    el.classList.add('input-valid');
    setTimeout(() => el.classList.remove('input-valid'), 2000);
  }
}

/* â”€â”€ FECHA / HORA â”€â”€ */
function hoy()  { return new Date().toISOString().split('T')[0]; }
function ahora(){ return new Date().toTimeString().slice(0, 5); }

function prefill() {
  ['q1_fecha','q3_fecha','c_fecha','rm_fecha','mt_fecha','ag_fecha','arc_fecha','gen_fecha','jedi_fecha'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = hoy();
  });
  ['q1_hora','q3_hora','rm_hora','mt_hora','ag_hora','gen_hora','jedi_hora'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = ahora();
  });
}

/* â”€â”€ BADGES â”€â”€ */
function bEstatus(e) {
  const m = {
    'Pendiente':'b-pending','En Proceso':'b-process',
    'Completado':'b-done','Activo':'b-process',
    'Cerrado':'b-done','Archivado':'b-archived',
    'Pendiente ResoluciÃ³n':'b-pending'
  };
  return `<span class="badge ${m[e]||'b-pending'}">${e||'â€”'}</span>`;
}
function bPrio(p) {
  const m = { 'Alta':'b-alta','Media':'b-media','Baja':'b-baja' };
  return `<span class="badge ${m[p]||'b-media'}">${p||'â€”'}</span>`;
}

/* â•â•â• LISTENERS TIEMPO REAL â•â•â•
   onSnapshot dispara automÃ¡ticamente cada vez que Firestore
   detecta un cambio â€” en cualquier dispositivo conectado.
   Sin necesidad de recargar la pÃ¡gina.
*/
let feedCache = {};

function initListeners() {
  prefill();

  /* 137.1 */
  db.collection('dace_q137_1')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('cnt1').textContent     = snap.size;
      document.getElementById('q1_total').textContent = snap.size;
      _cache.q1 = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      aplicarFiltros('q1');
      feedCache.q1 = snap.docs.slice(0,3).map(d => feedRow('<i class="ph-fill ph-scales"></i>', d.data().numero||'Incidente', `137.1 Â· ${d.data().fecha||''} Â· ${d.data().estatus||''}`, 'q137_1', d.data().numero || d.id));
      renderFeed();
    }, e => console.error('137.1:', e));

  /* 137.3 */
  db.collection('dace_q137_3')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('cnt3').textContent     = snap.size;
      document.getElementById('q3_total').textContent = snap.size;
      _cache.q3 = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      aplicarFiltros('q3');
      feedCache.q3 = snap.docs.slice(0,3).map(d => feedRow('ðŸ—ï¸', d.data().numero||'InspecciÃ³n', `137.3 Â· ${d.data().lugar||''} Â· ${d.data().estatus||''}`, 'q137_3', d.data().numero || d.id));
      renderFeed();
    }, e => console.error('137.3:', e));

  /* CASOS */
  db.collection('dace_casos')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('cntC').textContent    = snap.size;
      document.getElementById('c_total').textContent = snap.size;
      _cache.c = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      aplicarFiltros('c');
      feedCache.casos = snap.docs.slice(0,3).map(d => feedRow('<i class="ph-fill ph-clipboard-text"></i>', d.data().numero||'Caso', trunc(d.data().descripcion||'', 55), 'casos', d.data().numero || d.id));
      renderFeed();
    }, e => console.error('casos:', e));

  /* MAESTRO */
  db.collection('dace_maestro')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('cntM').textContent     = snap.size;
      document.getElementById('rm_total').textContent = snap.size;
      _cache.rm = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      aplicarFiltros('rm');
      feedCache.maestro = snap.docs.slice(0,2).map(d => feedRow('ðŸ“', d.data().tipo||'Entrada', trunc(d.data().descripcion||'', 55), 'maestro', d.data().tipo || d.id));
      renderFeed();
    }, e => console.error('maestro:', e));

  /* MANTENIMIENTO */
  db.collection('dace_mantenimiento')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('mt_total').textContent = snap.size;
      _cache.mt = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      aplicarFiltros('mt');
      feedCache.mt = snap.docs.slice(0,2).map(d => feedRow('<i class="ph-fill ph-wrench"></i>', d.data().lugar||'Mantenimiento', trunc(d.data().descripcion||'', 55), 'mantenimiento', d.data().lugar || d.id));
      renderFeed();
    }, e => console.error('mantenimiento:', e));

  /* AGENDA */
  db.collection('dace_agenda')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('ag_total').textContent = snap.size;
      const docs = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      renderAgenda(docs);
    }, e => console.error('agenda:', e));

  /* DIRECTORIO */
  db.collection('dace_directorio')
    .orderBy('nombre', 'asc')
    .onSnapshot(snap => {
      document.getElementById('dir_total').textContent = snap.size;
      _dirCache = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      renderDirectorio(_dirCache);
    }, e => console.error('directorio:', e));

  /* ARCHIVO */
  db.collection('dace_archivo')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('arc_total').textContent = snap.size;
      _arcCache = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      renderArchivo(_arcCache);
    }, e => console.error('archivo:', e));

  /* GENERADORES */
  db.collection('dace_generadores')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('gen_total').textContent = snap.size;
      _genCache = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      renderGeneradores(_genCache);
    }, e => console.error('generadores:', e));

  /* INSPECCIONES GENERADOR PPR-312.2 */
  db.collection('dace_insp_generadores')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      _insp312Cache = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      renderInsp312_2(_insp312Cache);
    }, e => console.error('insp312:', e));

  /* JEDI / ASG */
  db.collection('dace_jedi')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      document.getElementById('jedi_total').textContent = snap.size;
      _jediCache = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      renderJedi(_jediCache);
    }, e => console.error('jedi:', e));

  // Generar reportes iniciales
  setTimeout(generarReportes, 2000);
  // Mostrar prÃ³ximo nÃºmero de inspecciÃ³n
  // Mostrar prÃ³ximo nÃºmero de inspecciÃ³n
  setTimeout(async () => {
    try {
      const snap = await db.collection('dace_q137_3').get();
      const total = snap.size + 1;
      const anio  = new Date().getFullYear();
      const el = document.getElementById('q3_num');
      if (el) el.placeholder = `INS-137.3-${anio}-${String(total).padStart(3,'0')}`;
    } catch(e) {}
  }, 1500);
}

/* â”€â”€ FEED RECIENTE â”€â”€ */
function feedRow(icon, title, sub, targetTab, searchQuery) { return { icon, title, sub, targetTab, searchQuery }; }
function trunc(s, n) { return s.length > n ? s.substring(0, n) + 'â€¦' : s; }

function renderFeed() {
  const all = Object.values(feedCache).flat().slice(0, 7);
  const el  = document.getElementById('feedArea');
  if (!all.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">ðŸ“­</span><p>Sin actividad registrada aÃºn</p></div>';
    return;
  }
  el.innerHTML = all.map(r => `
    <div class="activity-item" onclick="irARegistro('${r.targetTab || ''}', '${r.searchQuery || ''}')">
      <span class="activity-icon">${r.icon}</span>
      <div class="activity-info">
        <strong>${r.title}</strong>
        <span>${r.sub}</span>
      </div>
    </div>`).join('');
}

/* â”€â”€ NAVEGACIÃ“N INTELIGENTE DESDE FEED â”€â”€ */
function irARegistro(targetTab, searchQuery) {
  if (!targetTab) return;
  
  let moduloKey = '';
  let searchInputId = '';
  if (targetTab === 'q137_1') { searchInputId = 'q1_search'; moduloKey = 'q1'; }
  else if (targetTab === 'q137_3') { searchInputId = 'q3_search'; moduloKey = 'q3'; }
  else if (targetTab === 'casos') { searchInputId = 'c_search'; moduloKey = 'c'; }
  else if (targetTab === 'maestro') { searchInputId = 'rm_search'; moduloKey = 'rm'; }
  else if (targetTab === 'mantenimiento') { searchInputId = 'mt_search'; moduloKey = 'mt'; }
  
  if (moduloKey && typeof _filtros !== 'undefined' && _filtros[moduloKey]) {
    _filtros[moduloKey] = { texto: '', desde: '', hasta: '' };
    
    const desdeEl = document.getElementById(moduloKey + '_desde');
    const hastaEl = document.getElementById(moduloKey + '_hasta');
    if (desdeEl) desdeEl.value = '';
    if (hastaEl) hastaEl.value = '';
    
    const tabContainer = document.getElementById(targetTab);
    if (tabContainer) {
      tabContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    }
  }
  
  changeTab(targetTab);
  
  if (searchInputId && searchQuery) {
    const input = document.getElementById(searchInputId);
    if (input) {
      input.value = searchQuery;
      if (typeof aplicarFiltros === 'function') {
        aplicarFiltros(moduloKey);
      }
    }
  }
}
window.irARegistro = irARegistro;

/* â”€â”€ RENDER GENÃ‰RICO â”€â”€ */
function renderLista(cid, docs, fn) {
  const el = document.getElementById(cid);
  if (!docs || !docs.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon"><i class="ph-fill ph-file-pdf"></i></span><p>No hay registros aÃºn</p></div>';
    return;
  }
  el.innerHTML = docs.map(fn).join('');
}

/* â”€â”€ RENDER: 137.1 â”€â”€ */
function item_Q1(doc) {
  const d = doc.data ? doc.data() : doc;
  const id = doc.id || doc._id;
  return `<div class="record-item">
    <div class="record-head">
      <span class="record-id">${d.numero||'â€”'}</span>
      <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
    </div>
    ${d.solicitante ? `<p class="record-body"><strong>Solicitante:</strong> ${d.solicitante}</p>` : ''}
    ${d.unidad      ? `<p class="record-body"><strong>Unidad:</strong> ${d.unidad}</p>` : ''}
    <p class="record-body">${d.descripcion||''}</p>
    ${d.observaciones ? `<p class="record-body" style="color:#94a3b8;font-style:italic">${d.observaciones}</p>` : ''}
    ${d.fotoUrl ? `<img src="${d.fotoUrl}" style="width:100%;border-radius:8px;margin-top:8px;max-height:140px;object-fit:cover">` : ''}
    <div class="record-foot">
      ${bEstatus(d.estatus)}
      <button class="btn-edit" onclick="editarQ1('${id}')">âœï¸ Editar</button>
      <button class="btn-del" onclick="eliminar('dace_q137_1','${id}','Orden')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

/* â”€â”€ RENDER: 137.3 â”€â”€ */
function item_Q3(doc) {
  const d = doc.data ? doc.data() : doc;
  const id = doc.id || doc._id;
  return `<div class="record-item gold">
    <div class="record-head">
      <span class="record-id">${d.numero||'â€”'}</span>
      <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
    </div>
    ${d.lugar ? `<p class="record-body"><strong>Lugar:</strong> ${d.lugar}</p>` : ''}
    <p class="record-body">${d.hallazgos||''}</p>
    ${d.recomendaciones ? `<p class="record-body" style="color:#94a3b8;font-style:italic"><strong>Rec:</strong> ${d.recomendaciones}</p>` : ''}
    ${d.fotoUrl ? `<img src="${d.fotoUrl}" style="width:100%;border-radius:8px;margin-top:8px;max-height:140px;object-fit:cover">` : ''}
    <div class="record-foot">
      ${bEstatus(d.estatus)}
      <button class="btn-edit" onclick="editarQ3('${id}')">âœï¸ Editar</button>
      <button class="btn-del" onclick="eliminar('dace_q137_3','${id}','InspecciÃ³n')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

/* â”€â”€ RENDER: CASOS â”€â”€ */
function item_Caso(doc) {
  const d   = doc.data ? doc.data() : doc;
  const id  = doc.id || doc._id;
  const cls = { Alta:'red', Media:'gold', Baja:'green' }[d.prioridad] || '';
  return `<div class="record-item ${cls}">
    <div class="record-head">
      <span class="record-id">${d.numero||'â€”'}</span>
      <span class="record-ts">${d.fecha||''}</span>
    </div>
    <p class="record-body">${d.descripcion||''}</p>
    ${d.responsable ? `<p class="record-body"><strong>Responsable:</strong> ${d.responsable}</p>` : ''}
    ${d.accion      ? `<p class="record-body"><strong>PrÃ³xima acciÃ³n:</strong> ${d.accion}</p>` : ''}
    <div class="record-foot">
      ${bPrio(d.prioridad)} ${bEstatus(d.estatus)}
      <button class="btn-edit" onclick="editarCaso('${id}')">âœï¸ Editar</button>
      <button class="btn-del" onclick="eliminar('dace_casos','${id}','Caso')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

/* â”€â”€ RENDER: MAESTRO â”€â”€ */
function item_Maestro(doc) {
  const d  = doc.data ? doc.data() : doc;
  const id = doc.id || doc._id;
  return `<div class="record-item gray">
    <div class="record-head">
      <span class="record-id">${d.tipo||'â€”'}</span>
      <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
    </div>
    <p class="record-body">${d.descripcion||''}</p>
    ${d.notas ? `<p class="record-body" style="color:#94a3b8;font-style:italic">${d.notas}</p>` : ''}
    <div class="record-foot">
      <button class="btn-edit" onclick="editarMaestro('${id}')">âœï¸ Editar</button>
      <button class="btn-del" onclick="eliminar('dace_maestro','${id}','Entrada')"><i class="ph-bold ph-trash"></i></button>
    </div>
  </div>`;
}

/* â•â•â• EDICIÃ“N â€” ESTADO GLOBAL â•â•â• */
let _editando = { col: null, id: null };

function modoEdicion(col, id, labelBtn) {
  _editando = { col, id };
  // Cambiar botÃ³n guardar a "ACTUALIZAR"
  const btns = document.querySelectorAll('.btn-save');
  btns.forEach(b => {
    if (b.textContent.includes('GUARDAR') || b.textContent.includes('ACTUALIZAR')) {
      b.style.background = '#b45309';
      b.innerHTML = 'ðŸ’¾ ACTUALIZAR ' + labelBtn;
    }
  });
  showToast('âœï¸ Modo ediciÃ³n activo â€” modifica y toca ACTUALIZAR', '#b45309');
  window.scrollTo(0, 0);
}

function cancelarEdicion(label) {
  _editando = { col: null, id: null };
}

/* â”€â”€ EDITAR: 137.1 â”€â”€ */
async function editarQ1(id) {
  try {
    const docSnap = await db.collection('dace_q137_1').doc(id).get();
    if (!docSnap.exists) { showToast('<i class="ph-bold ph-x"></i> Registro no encontrado', '#dc2626'); return; }
    const d = docSnap.data();
    changeTab('q137_1');
    setTimeout(() => {
      set('q1_fecha', d.fecha||'');
      set('q1_solicitante', d.solicitante||'');
      set('q1_tel', d.telefono||'');
      set('q1_director', d.director||'');
      set('q1_desc', d.descripcion||'');
      set('q1_obs', d.observaciones||'');
      set('q1_seccion', d.seccion||'');
      set('q1_division', d.division||'');
      set('q1_distrito', d.distrito||'');
      set('q1_area', d.area||'Arecibo');
      set('q1_area2', d.area2||'Arecibo');
      set('q1_negociado', d.negociado||'NPPR');
      set('q1_super', d.super||'');
      set('q1_admin_autorizado', d.adminAutorizado||'');
      set('q1_admin_fecha', d.adminFecha||'');
      set('q1_admin_autoriza_a', d.adminAutorizaA||'');
      set('q1_admin_viajar_a', d.adminViajarA||'');
      set('q1_admin_tablilla', d.adminTablilla||'');
      set('q1_admin_acompanante', d.adminAcompanante||'');
      set('q1_estatus', d.estatus||'Pendiente');
      if (d.unidad) { const el = document.getElementById('q1_unidad'); if(el) el.value = d.unidad; }
      if (d.trabajos) {
        ['carp','elec','pint','refr','eban','limp','plom'].forEach(t => {
          const el = document.getElementById('q1_'+t); if(el) el.checked = false;
        });
        d.trabajos.forEach(t => {
          const map = {'CarpinterÃ­a':'carp','Electricidad':'elec','Pintura':'pint','RefrigeraciÃ³n':'refr','EbanisterÃ­a':'eban','Limpieza':'limp','PlomerÃ­a':'plom'};
          const el = document.getElementById('q1_'+(map[t]||''));
          if(el) el.checked = true;
        });
      }
      document.getElementById('q1_num').placeholder = d.numero || '';
      _editando = { col: 'dace_q137_1', id };
      const btn = document.querySelector('#q137_1 .btn-save');
      if(btn) { btn.style.background='#b45309'; btn.innerHTML='ðŸ’¾ ACTUALIZAR ORDEN'; }
    }, 300);
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); }
}

/* â”€â”€ EDITAR: 137.3 â”€â”€ */
async function editarQ3(id) {
  try {
    const docSnap = await db.collection('dace_q137_3').doc(id).get();
    if (!docSnap.exists) { showToast('<i class="ph-bold ph-x"></i> Registro no encontrado', '#dc2626'); return; }
    const d = docSnap.data();
    changeTab('q137_3');
    setTimeout(() => {
      set('q3_fecha', d.fecha||'');
      set('q3_director', d.director||'');
      set('q3_tel', d.telefono||'');
      set('q3_dir', d.direccion||'');
      set('q3_area', d.area||'Arecibo');
      set('q3_obs_gen', d.observacionesGenerales||'');
      set('q3_hallazgos', d.hallazgos||'');
      set('q3_rec', d.recomendaciones||'');
      set('q3_estatus', d.estatus||'Pendiente');
      if (d.lugar) { const el = document.getElementById('q3_lugar'); if(el) el.value = d.lugar; }
      document.getElementById('q3_num').placeholder = d.numero || '';
      _editando = { col: 'dace_q137_3', id };
      const btn = document.querySelector('#q137_3 .btn-save.gold-btn');
      if(btn) { btn.style.background='#b45309'; btn.innerHTML='ðŸ’¾ ACTUALIZAR INSPECCIÃ“N'; }
      showToast('âœï¸ Modo ediciÃ³n activo â€” modifica y toca ACTUALIZAR', '#b45309');
    }, 300);
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); }
}

/* â”€â”€ EDITAR: MANTENIMIENTO â”€â”€ */
async function editarMantenimiento(id) {
  try {
    const doc = await db.collection('dace_mantenimiento').doc(id).get();
    const d   = doc.data();
    changeTab('mantenimiento');
    setTimeout(() => {
      set('mt_lugar',   d.lugar||'');
      set('mt_dept',    d.departamento||'');
      set('mt_fecha',   d.fecha||'');
      set('mt_hora',    d.hora||'');
      set('mt_desc',    d.descripcion||'');
      set('mt_notifico',d.notificadoA||'');
      set('mt_metodo',  d.metodo||'Personal');
      set('mt_estatus', d.estatus||'Pendiente');
      _editando = { col: 'dace_mantenimiento', id };
      const btn = document.querySelector('#mantenimiento .btn-save');
      if(btn) { btn.style.background='#b45309'; btn.innerHTML='ðŸ’¾ ACTUALIZAR MANTENIMIENTO'; }
      showToast('âœï¸ Modo ediciÃ³n â€” modifica y toca ACTUALIZAR', '#b45309');
    }, 300);
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); }
}

/* â”€â”€ EDITAR: CASO â”€â”€ */
async function editarCaso(id) {
  try {
    const doc = await db.collection('dace_casos').doc(id).get();
    const d   = doc.data();
    changeTab('casos');
    setTimeout(() => {
      set('c_num', d.numero||'');
      set('c_fecha', d.fecha||'');
      set('c_desc', d.descripcion||'');
      set('c_resp', d.responsable||'');
      set('c_accion', d.accion||'');
      set('c_estatus', d.estatus||'Activo');
      set('c_prioridad', d.prioridad||'Media');
      _editando = { col: 'dace_casos', id };
      const btn = document.querySelector('#casos .btn-save');
      if(btn) { btn.style.background='#b45309'; btn.innerHTML='ðŸ’¾ ACTUALIZAR CASO'; }
    }, 300);
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); }
}

/* â”€â”€ EDITAR: MAESTRO â”€â”€ */
async function editarMaestro(id) {
  try {
    const doc = await db.collection('dace_maestro').doc(id).get();
    const d   = doc.data();
    changeTab('maestro');
    setTimeout(() => {
      set('rm_tipo', d.tipo||'');
      set('rm_fecha', d.fecha||'');
      set('rm_hora', d.hora||'');
      set('rm_desc', d.descripcion||'');
      set('rm_notas', d.notas||'');
      _editando = { col: 'dace_maestro', id };
      const btn = document.querySelector('#maestro .btn-save');
      if(btn) { btn.style.background='#b45309'; btn.innerHTML='ðŸ’¾ ACTUALIZAR ENTRADA'; }
    }, 300);
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); }
}

/* â•â•â• GUARDAR: CASOS (con soporte ediciÃ³n) â•â•â• */
async function guardarCaso() {
  if (_guardando) return;
  const num = v('c_num'), desc = v('c_desc');
  let isValid = true;
  if (!desc) { resaltarValidacion('c_desc', false); isValid = false; } else { resaltarValidacion('c_desc', true); }
  const esEdicion = _editando.col === 'dace_casos' && _editando.id;
  if (!num && !esEdicion) { resaltarValidacion('c_num', false); isValid = false; } else if (num) { resaltarValidacion('c_num', true); }
  if (!isValid) {
    if (!desc) showToast('âš ï¸ La descripciÃ³n es requerida', '#92400e');
    else showToast('âš ï¸ NÃºmero es requerido', '#92400e');
    return;
  }
  _guardando = true;
  const datos = {
    numero: num, fecha: v('c_fecha'), prioridad: v('c_prioridad'),
    descripcion: desc, responsable: v('c_resp'), accion: v('c_accion'),
    estatus: v('c_estatus'), usuario: 'Agte. Aponte Cancel Â· 31093'
  };
  try {
    if (_editando.col === 'dace_casos' && _editando.id) {
      await db.collection('dace_casos').doc(_editando.id).update(datos);
      await registrarEnMaestroAuto(
        'Caso Activo (EdiciÃ³n)',
        `Caso actualizado: ${num || _editando.id}`,
        `Estatus: ${v('c_estatus')} Â· Responsable: ${v('c_resp')} Â· Desc: ${desc}`
      );
      showToast('<i class="ph-bold ph-check"></i> Caso actualizado', '#166534');
      _editando = { col: null, id: null };
      const btn = document.querySelector('#casos .btn-save');
      if(btn) { btn.style.background=''; btn.innerHTML='ðŸ’¾ GUARDAR CASO'; }
    } else {
      if (!num) { showToast('âš ï¸ NÃºmero es requerido', '#92400e'); _guardando = false; return; }
      datos.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('dace_casos').add(datos);
      await registrarEnMaestroAuto(
        'Caso Activo',
        `Caso registrado: ${num}`,
        `Prioridad: ${v('c_prioridad')} Â· Responsable: ${v('c_resp')} Â· Desc: ${desc}`
      );
      showToast('<i class="ph-bold ph-check"></i> Caso guardado y sincronizado', '#166534');
    }
    limpiar(['c_num','c_desc','c_resp','c_accion']);
    set('c_estatus','Activo'); set('c_prioridad','Media'); set('c_fecha', hoy());
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); } finally { _guardando = false; }
}

/* â•â•â• GUARDAR: MANTENIMIENTO (con soporte ediciÃ³n) â•â•â• */
async function guardarMantenimiento() {
  if (_guardando) return;
  const lugar = v('mt_lugar'), desc = v('mt_desc');
  let isValid = true;
  if (!lugar) { resaltarValidacion('mt_lugar', false); isValid = false; } else { resaltarValidacion('mt_lugar', true); }
  if (!desc) { resaltarValidacion('mt_desc', false); isValid = false; } else { resaltarValidacion('mt_desc', true); }
  if (!isValid) { showToast('âš ï¸ Lugar y descripciÃ³n son requeridos', '#92400e'); return; }
  _guardando = true;
  const datos = {
    lugar, departamento: v('mt_dept'),
    fecha: v('mt_fecha'), hora: v('mt_hora'),
    descripcion: desc, notificadoA: v('mt_notifico'),
    metodo: v('mt_metodo'), estatus: v('mt_estatus'),
    usuario: 'Agte. Aponte Cancel Â· 31093'
  };
  try {
    if (_editando.col === 'dace_mantenimiento' && _editando.id) {
      await db.collection('dace_mantenimiento').doc(_editando.id).update(datos);
      await registrarEnMaestroAuto(
        'Mantenimiento (EdiciÃ³n)',
        `Trabajo de Mantenimiento actualizado en ${lugar} (${v('mt_dept')})`,
        `Estatus: ${v('mt_estatus')} Â· Notificado A: ${v('mt_notifico')} Â· Desc: ${desc}`
      );
      showToast('<i class="ph-bold ph-check"></i> Mantenimiento actualizado', '#166534');
      _editando = { col: null, id: null };
    } else {
      datos.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('dace_mantenimiento').add(datos);
      await registrarEnMaestroAuto(
        'Mantenimiento',
        `Nuevo Trabajo de Mantenimiento registrado en ${lugar} (${v('mt_dept')})`,
        `Estatus: ${v('mt_estatus')} Â· Notificado A: ${v('mt_notifico')} Â· Desc: ${desc}`
      );
      showToast('<i class="ph-bold ph-check"></i> Mantenimiento guardado y sincronizado', '#166534');
    }
    limpiar(['mt_desc','mt_notifico']);
    set('mt_lugar',''); set('mt_estatus','Pendiente');
    set('mt_fecha', hoy()); set('mt_hora', ahora());
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); } finally { _guardando = false; }
}

/* â•â•â• GUARDAR: MAESTRO (con soporte ediciÃ³n) â•â•â• */
async function guardarMaestro() {
  if (_guardando) return;
  const desc = v('rm_desc');
  if (!desc) { showToast('âš ï¸ La descripciÃ³n es requerida', '#92400e'); return; }
  _guardando = true;
  const datos = {
    tipo: v('rm_tipo'), fecha: v('rm_fecha'), hora: v('rm_hora'),
    descripcion: desc, notas: v('rm_notas'),
    usuario: 'Agte. Aponte Cancel Â· 31093'
  };
  try {
    if (_editando.col === 'dace_maestro' && _editando.id) {
      await db.collection('dace_maestro').doc(_editando.id).update(datos);
      showToast('<i class="ph-bold ph-check"></i> Entrada actualizada', '#166534');
      _editando = { col: null, id: null };
      const btn = document.querySelector('#maestro .btn-save');
      if(btn) { btn.style.background=''; btn.innerHTML='ðŸ’¾ GUARDAR ENTRADA'; }
    } else {
      datos.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('dace_maestro').add(datos);
      showToast('<i class="ph-bold ph-check"></i> Entrada guardada y sincronizada', '#166534');
    }
    limpiar(['rm_desc','rm_notas']);
    set('rm_fecha', hoy()); set('rm_hora', ahora());
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); } finally { _guardando = false; }
}

/* â•â•â• ELIMINAR â•â•â• */
async function eliminar(col, id, tipo) {
  if (!confirm('Â¿Eliminar este registro de ' + tipo + '?\n\nEsta acciÃ³n es permanente.')) return;
  try {
    await db.collection(col).doc(id).delete();
    showToast('<i class="ph-bold ph-trash"></i> ' + tipo + ' eliminado', '#475569');
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error al eliminar: ' + e.message, '#dc2626'); }
}

/* â”€â”€ HELPERS â”€â”€ */
function v(id)        { return document.getElementById(id)?.value?.trim() || ''; }
function set(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function limpiar(ids) { ids.forEach(id => set(id, '')); }

// Elimina texto repetido â€” toma el primer segmento Ãºnico
function limpiarDesc(texto, maxLen) {
  if (!texto) return '';
  // Si hay repeticiÃ³n con " â€” ", tomar solo el primer segmento
  const partes = texto.split(' â€” ');
  const primera = partes[0].trim();
  // Si la primera parte se repite, usar solo esa
  const limpio = primera || texto;
  return limpio.length > maxLen ? limpio.substring(0, maxLen) + 'â€¦' : limpio;
}

/* â•â•â• TRABAJOS REALIZADOS â•â•â• */
function cargarTrabajosRealizados() {
  const el = document.getElementById('lista_trabajos');
  el.innerHTML = '<div class="loading-state"><i class="ph-fill ph-hourglass"></i> Cargando trabajos...</div>';
  
  Promise.all([
    db.collection('dace_q137_1').where('estatus', '==', 'Completado').get(),
    db.collection('dace_q137_3').where('estatus', '==', 'Completado').get(),
    db.collection('dace_mantenimiento').where('estatus', '==', 'Completado').get()
  ]).then(([snap1, snap3, snapMt]) => {
    let docs = [];
    snap1.forEach(d => { const data=d.data(); data._id=d.id; data._col='dace_q137_1'; data._tipo='Orden'; docs.push(data); });
    snap3.forEach(d => { const data=d.data(); data._id=d.id; data._col='dace_q137_3'; data._tipo='InspecciÃ³n'; docs.push(data); });
    snapMt.forEach(d => { const data=d.data(); data._id=d.id; data._col='dace_mantenimiento'; data._tipo='Mantenimiento'; docs.push(data); });
    
    docs.sort((a,b) => (b.createdAt?.toMillis()||0) - (a.createdAt?.toMillis()||0));
    document.getElementById('tr_total').textContent = docs.length;
    
    if(!docs.length) {
      el.innerHTML = '<div class="empty-state"><span class="empty-icon">ðŸ“</span><p>No hay trabajos completados aÃºn</p></div>';
      return;
    }
    
    el.innerHTML = docs.map(d => {
      const isOrden = d._col === 'dace_q137_1';
      const isMt = d._col === 'dace_mantenimiento';
      const colorCls = isOrden ? '' : (isMt ? 'gray' : 'gold');
      const ts = `${d.fecha||''} ${d.hora||''}`;
      const info = isOrden ? (d.descripcion||'') : (isMt ? (d.descripcion||'') : (d.hallazgos||''));
      
      return `<div class="record-item ${colorCls}">
        <div class="record-head">
          <span class="record-id">${d.numero || d.lugar || 'â€”'} <span style="color:#64748b;font-size:10px;">[${d._tipo}]</span></span>
          <span class="record-ts">${ts}</span>
        </div>
        <p class="record-body">${limpiarDesc(info, 100)}</p>
        <div class="record-foot">
          <button class="btn-edit" style="color:#166534;" onclick="imprimirIndividualPDF('${d._col}', '${d._id}')"><i class="ph-bold ph-printer"></i> Imprimir</button>
        </div>
      </div>`;
    }).join('');
  }).catch(e => {
    el.innerHTML = `<div class="empty-state"><p>Error: ${e.message}</p></div>`;
  });
}

function pdfHeaderSingle(doc, titulo) {
  const W = doc.internal.pageSize.getWidth();
  const gold = [197, 160, 89];
  doc.setTextColor(10, 25, 47);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DACE ARECIBO', W / 2, 13, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PolicÃ­a de Puerto Rico', W / 2, 20, { align: 'center' });
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.8);
  doc.line(10, 25, W - 10, 25);
  doc.setTextColor(...gold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo.toUpperCase(), W / 2, 33, { align: 'center' });
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const ts = new Date().toLocaleString('es-PR');
  doc.text(`Generado: ${ts}  |  Agte. Aponte Cancel Â· Placa 31093`, W / 2, 37, { align: 'center' });
  return 45;
}

async function imprimirPPR137_1(id) {
  showToast('<i class="ph-bold ph-printer"></i> Generando Formulario PPR-137.1...', '#16a34a');
  try {
    const snap = await db.collection('dace_q137_1').doc(id).get();
    if(!snap.exists) {
      showToast('<i class="ph-bold ph-x"></i> Registro no encontrado', '#dc2626');
      return;
    }
    const d = snap.data();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // 1. CARGAR LOGO
    const logoBase64 = await cargarImagenComoBase64('./policia.png');
    if(logoBase64) {
      doc.addImage(logoBase64, 'PNG', 12, 10, 22, 22);
    }

    // 2. ENCABEZADO OFICIAL (Centro)
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ESTADO LIBRE ASOCIADO DE PUERTO RICO', 108, 13, { align: 'center' });
    doc.text('NEGOCIADO DE LA POLICÃA DE PUERTO RICO', 108, 17, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('DIVISIÃ“N DE ADMINISTRACIÃ“N DE CONTROL DE EDIFICIOS (DACE)', 108, 21, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('SOLICITUD DE ORDEN DE TRABAJO', 108, 26, { align: 'center' });

    // 3. CAJITA PPR-137.1 (Derecha)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(155, 10, 48, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FORMULARIO', 179, 15, { align: 'center' });
    doc.setFontSize(13);
    doc.text('PPR-137.1', 179, 21, { align: 'center' });
    doc.setFontSize(7);
    doc.text('Efectivo: 15 de agosto de 2018', 179, 26, { align: 'center' });

    // LÃ­nea divisoria superior
    doc.setLineWidth(0.8);
    doc.line(12, 32, W - 12, 32);

    // 4. SECCIÃ“N I - IDENTIFICACIÃ“N DE LA SOLICITUD
    let y = 37;
    doc.setFillColor(230, 230, 230);
    doc.rect(12, y, W - 24, 6, 'F');
    doc.rect(12, y, W - 24, 6, 'D');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('I. IDENTIFICACIÃ“N DE LA SOLICITUD', 15, y + 4.5);
    y += 6;

    // Grid SecciÃ³n I
    doc.setLineWidth(0.3);
    // Fila 1
    doc.rect(12, y, 65, 10);
    doc.rect(77, y, 65, 10);
    doc.rect(142, y, 61.9, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('1. NÃšMERO DE SOLICITUD:', 14, y + 3);
    doc.text('2. FECHA DE SOLICITUD (DD/MM/AAAA):', 79, y + 3);
    doc.text('3. HORA:', 144, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.numero || 'â€”', 14, y + 7.5);
    doc.text(d.fecha ? d.fecha.split('-').reverse().join('/') : 'â€”', 79, y + 7.5);
    doc.text(d.hora || 'â€”', 144, y + 7.5);
    y += 10;

    // Fila 2
    doc.rect(12, y, 130, 10);
    doc.rect(142, y, 61.9, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('4. UNIDAD SOLICITANTE:', 14, y + 3);
    doc.text('5. ÃREA POLICIAL:', 144, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.unidad || 'â€”', 14, y + 7.5);
    doc.text(d.area || 'Arecibo', 144, y + 7.5);
    y += 10;

    // Fila 3
    doc.rect(12, y, 130, 10);
    doc.rect(142, y, 61.9, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('6. DIRECTOR / SUPERVISOR DE LA UNIDAD:', 14, y + 3);
    doc.text('7. TELÃ‰FONO DE CONTACTO:', 144, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.director || 'â€”', 14, y + 7.5);
    doc.text(d.tel || 'â€”', 144, y + 7.5);
    y += 10;

    // Fila 4
    doc.rect(12, y, W - 24, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('8. NOMBRE DEL SOLICITANTE (SI ES DISTINTO AL SUPERVISOR):', 14, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.solicitante || 'â€”', 14, y + 7.5);
    y += 15;

    // 5. SECCIÃ“N II - TRABAJO SOLICITADO (CHECKBOXES)
    doc.setFillColor(230, 230, 230);
    doc.rect(12, y, W - 24, 6, 'F');
    doc.rect(12, y, W - 24, 6, 'D');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('II. TIPO DE TRABAJO SOLICITADO', 15, y + 4.5);
    y += 6;

    // Caja de checkboxes
    doc.rect(12, y, W - 24, 20);
    doc.setFontSize(8);

    // Tipos de trabajo
    const trabajos = d.trabajos || [];
    const carp = trabajos.includes('CarpinterÃ­a') || d.carp;
    const elec = trabajos.includes('Electricidad') || d.elec;
    const pint = trabajos.includes('Pintura') || d.pint;
    const refr = trabajos.includes('RefrigeraciÃ³n') || d.refr;
    const eban = trabajos.includes('EbanisterÃ­a') || d.eban;
    const limp = trabajos.includes('Limpieza') || d.limp;
    const plom = trabajos.includes('PlomerÃ­a') || d.plom;

    // Dibujar checks [] CarpinterÃ­a, etc.
    const drawCheckbox = (label, checked, xCoord, yCoord) => {
      doc.rect(xCoord, yCoord - 2.5, 3.5, 3.5);
      if(checked) {
        doc.setFont('helvetica', 'bold');
        doc.text('X', xCoord + 0.8, yCoord + 0.2);
      }
      doc.setFont('helvetica', 'normal');
      doc.text(label, xCoord + 5, yCoord);
    };

    drawCheckbox('CarpinterÃ­a', carp, 16, y + 6);
    drawCheckbox('Electricidad', elec, 64, y + 6);
    drawCheckbox('Pintura', pint, 112, y + 6);
    drawCheckbox('RefrigeraciÃ³n', refr, 160, y + 6);

    drawCheckbox('EbanisterÃ­a', eban, 16, y + 14);
    drawCheckbox('Limpieza', limp, 64, y + 14);
    drawCheckbox('PlomerÃ­a', plom, 112, y + 14);
    y += 20 + 5;

    // 6. SECCIÃ“N III - DESCRIPCIÃ“N DEL SERVICIO
    doc.setFillColor(230, 230, 230);
    doc.rect(12, y, W - 24, 6, 'F');
    doc.rect(12, y, W - 24, 6, 'D');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('III. DESCRIPCIÃ“N DETALLADA DEL SERVICIO SOLICITADO', 15, y + 4.5);
    y += 6;

    // Caja de descripciÃ³n
    doc.rect(12, y, W - 24, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const linesDesc = doc.splitTextToSize(d.descripcion || 'â€”', W - 30);
    doc.text(linesDesc, 15, y + 5);
    y += 45 + 5;

    // 7. SECCIÃ“N IV - LOCALIZACIÃ“N DE LA AVERÃA O PROPIEDAD
    doc.setFillColor(230, 230, 230);
    doc.rect(12, y, W - 24, 6, 'F');
    doc.rect(12, y, W - 24, 6, 'D');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('IV. LOCALIZACIÃ“N DE LA AVERÃA O PROPIEDAD', 15, y + 4.5);
    y += 6;

    // Grid SecciÃ³n IV
    // Fila 1
    doc.rect(12, y, 96, 10);
    doc.rect(108, y, 95.9, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('1. SECCIÃ“N:', 14, y + 3);
    doc.text('2. DIVISIÃ“N:', 110, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.seccion || 'â€”', 14, y + 7.5);
    doc.text(d.division || 'â€”', 110, y + 7.5);
    y += 10;

    // Fila 2
    doc.rect(12, y, 96, 10);
    doc.rect(108, y, 95.9, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('3. DISTRITO / PRECINTO / UNIDAD:', 14, y + 3);
    doc.text('4. ÃREA:', 110, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.distrito || 'â€”', 14, y + 7.5);
    doc.text(d.area2 || 'Arecibo', 110, y + 7.5);
    y += 10;

    // Fila 3
    doc.rect(12, y, 96, 10);
    doc.rect(108, y, 95.9, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('5. NEGOCIADO:', 14, y + 3);
    doc.text('6. SUPERINTENDENCIA AUXILIAR:', 110, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.negociado || 'NPPR', 14, y + 7.5);
    doc.text(d.super || 'â€”', 110, y + 7.5);
    y += 10 + 5;

    // 8. SECCIÃ“N V - AUTORIZACIÃ“N (USO OFICIAL)
    doc.setFillColor(230, 230, 230);
    doc.rect(12, y, W - 24, 6, 'F');
    doc.rect(12, y, W - 24, 6, 'D');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('V. USO OFICIAL Y AUTORIZACIÃ“N (DIV. DE INFRAESTRUCTURA)', 15, y + 4.5);
    y += 6;

    // Caja AutorizaciÃ³n
    doc.rect(12, y, W - 24, 30);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTATUS DE LA ACCIÃ“N:', 14, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.estatus || 'Pendiente', 14, y + 9);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES DE AUTORIZACIÃ“N:', 80, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const linesObs = doc.splitTextToSize(d.observaciones || 'Sin notas de seguimiento aÃºn.', W - 96);
    doc.text(linesObs, 80, y + 9);

    // Firmas al pie de la caja
    y += 30 + 10;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    
    // LÃ­neas de firma
    doc.line(15, y, 70, y);
    doc.line(80, y, 135, y);
    doc.line(145, y, 200, y);

    doc.text('Firma del Solicitante', 15, y + 3.5);
    doc.text('Firma Director / Supervisor', 80, y + 3.5);
    doc.text('Firma Administrador DACE', 145, y + 3.5);

    // 9. IMAGEN DE EVIDENCIA (Si existe, va en la segunda pÃ¡gina)
    if (d.fotoUrl) {
      doc.addPage();
      let y2 = pdfHeaderSingle(doc, 'Evidencia FotogrÃ¡fica de la AverÃ­a');
      
      doc.setFillColor(240, 244, 248);
      doc.rect(10, y2, W - 20, 7, 'F');
      doc.setTextColor(10, 25, 47);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Solicitud #${d.numero || id.substring(0, 6)}`, 13, y2 + 5);
      y2 += 12;

      try {
        const evBase64 = await cargarImagenComoBase64(d.fotoUrl);
        if (evBase64) {
          doc.addImage(evBase64, 'JPEG', 15, y2, W - 30, H - y2 - 20);
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text('[Error al cargar la imagen de evidencia fotogrÃ¡fica]', 15, y2 + 10);
        }
      } catch (eImg) {
        console.warn('Foto no disponible en PDF:', eImg);
      }
    }

    doc.save(`Formulario_PPR-137.1_${d.numero || id.substring(0,6)}.pdf`);
    showToast('<i class="ph-bold ph-check"></i> Formulario PPR-137.1 Guardado', '#166534');
  } catch (e) {
    showToast('<i class="ph-bold ph-x"></i> Error al generar formulario: ' + e.message, '#dc2626');
    console.error(e);
  }
}

async function imprimirIndividualPDF(col, id) {
  if (col === 'dace_q137_1') {
    return imprimirPPR137_1(id);
  }
  showToast('<i class="ph-bold ph-printer"></i> Generando PDF del trabajo...', '#16a34a');
  try {
    const snap = await db.collection(col).doc(id).get();
    if(!snap.exists) return;
    const d = snap.data();
    
    if (col === 'dace_q137_1') {
      await exportarPDF_Q1_Single(d);
      return;
    }
    
    if (col === 'dace_q137_3') {
      let incluirFotos = false;
      if (d.fotoUrl) {
        incluirFotos = confirm('Â¿Deseas incluir la evidencia fotogrÃ¡fica en el PDF?');
      }
      const { PDFDocument } = PDFLib;
      const arrayBuffer = base64ToArrayBuffer(PDF_137_3);
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      await renderSingleQ3PageWithPdfLib(pdfDoc, d, incluirFotos);
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Trabajo_PPR-137.3_${d.numero || id.substring(0,6)}.pdf`;
      link.click();
      
      showToast('<i class="ph-bold ph-check"></i> PDF Guardado', '#166534');
      return;
    }
    
    // Si no es Q1 ni Q3, seguimos usando jsPDF (para mantenimiento)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const azul = [10, 25, 47];
    
    let titulo = 'Registro Mantenimiento (Indiv.)';
    let campos = [
      ['Lugar', d.lugar], ['Departamento', d.departamento],
      ['Fecha', `${d.fecha||''} ${d.hora||''}`],
      ['DescripciÃ³n', d.descripcion], ['Notificado A', d.notificadoA],
      ['Estatus', d.estatus]
    ];
    
    let y = pdfHeaderSingle(doc, titulo);
    doc.setFillColor(240, 244, 248);
    doc.rect(10, y, W-20, 7, 'F');
    doc.setTextColor(...azul);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text(`Registro #${d.numero || id.substring(0,6)}`, 13, y+5);
    y += 12;
    
    campos.forEach(([label, val]) => {
      if (!val) return;
      y = checkPage(doc, y, 10);
      doc.setTextColor(...azul);
      doc.setFontSize(9);
      doc.setFont('helvetica','bold');
      doc.text(label + ':', 13, y);
      doc.setFont('helvetica','normal');
      doc.setTextColor(60,60,60);
      const lines = doc.splitTextToSize(String(val), W - 55);
      doc.text(lines, 45, y);
      y += (lines.length * 5) + 3;
    });
    
    if(d.fotoUrl) {
      y = checkPage(doc, y, 60);
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(7);
      doc.text('Foto adjunta:', 13, y);
      doc.addImage(d.fotoUrl, 'JPEG', 13, y+3, 60, 60);
    }
    
    doc.save(`Trabajo_${d.numero || id.substring(0,6)}.pdf`);
    showToast('<i class="ph-bold ph-check"></i> PDF Guardado', '#166534');
  } catch(e) {
    showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626');
  }
}

/* â•â•â• CISTERNAS DEL ÃREA â•â•â• */
async function guardarCisterna() {
  if (_guardando) return;
  const lugar = v('cis_lugar');
  const obs = v('cis_obs');
  let estatus = '';
  document.getElementsByName('cis_estatus').forEach(r => { if(r.checked) estatus = r.value; });
  
  if (!lugar) { showToast('âš ï¸ El lugar es requerido', '#92400e'); return; }
  _guardando = true;
  
  const datos = {
    lugar, estatus, observaciones: obs,
    fecha: v('cis_fecha'), hora: v('cis_hora'),
    usuario: 'Agte. Aponte Cancel Â· 31093',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    await db.collection('dace_cisternas').add(datos);

    await registrarEnMaestroAuto(
      'BitÃ¡cora Cisterna',
      `Actividad en Cisterna de ${lugar}`,
      `Estatus/CondiciÃ³n: ${estatus} Â· Observaciones: ${obs}`
    );

    showToast('<i class="ph-bold ph-check"></i> Cisterna registrada', '#166534');
    set('cis_lugar', ''); set('cis_obs', '');
    set('cis_fecha', hoy()); set('cis_hora', ahora());
  } catch(e) { showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'); } finally { _guardando = false; }
}

function cargarCisternas() {
  const el = document.getElementById('lista_cisternas');
  el.innerHTML = '<div class="loading-state"><i class="ph-fill ph-hourglass"></i> Cargando...</div>';
  
  db.collection('dace_cisternas').orderBy('createdAt','desc').onSnapshot(snap => {
    document.getElementById('cis_total').textContent = snap.docs.length;
    if (snap.empty) {
      el.innerHTML = '<div class="empty-state"><p>No hay cisternas registradas</p></div>';
      return;
    }
    
    el.innerHTML = snap.docs.map(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      let cl = '';
      if(d.estatus === 'No Funciona') cl = 'red';
      else if(d.estatus === 'Necesita ReparaciÃ³n') cl = 'gold';
      else if(d.estatus === 'Cambio') cl = 'blue';
      
      let ebg = d.estatus === 'Funciona' ? '#dcfce7;color:#166534' : 
               (d.estatus === 'No Funciona' ? '#fee2e2;color:#991b1b' : 
               (d.estatus === 'Cambio' ? '#dbeafe;color:#1e40af' : '#fef3c7;color:#92400e'));
               
      return `<div class="record-item ${cl}">
        <div class="record-head">
          <span class="record-id"><i class="ph-fill ph-drop"></i> ${d.lugar}</span>
          <span class="record-ts">${d.fecha||''} ${d.hora||''}</span>
        </div>
        <p class="record-body">${d.observaciones || ''}</p>
        <div class="record-foot" style="margin-top:12px;">
          <span class="badge" style="background:${ebg.split(';')[0]};color:${ebg.split('color:')[1]}">${d.estatus}</span>
          <div style="flex:1"></div>
          <button class="btn-edit" style="color:#166534; font-size:9px;" onclick="imprimirCisternaPDF('${id}', '137.3')"><i class="ph-bold ph-printer"></i> 137.3 (Insp.)</button>
          <button class="btn-edit" style="color:#115e59; font-size:9px;" onclick="imprimirCisternaPDF('${id}', '137.1')"><i class="ph-bold ph-printer"></i> 137.1 (Ord.)</button>
          <button class="btn-del" onclick="eliminar('dace_cisternas','${id}','Cisterna')"><i class="ph-bold ph-trash"></i></button>
        </div>
      </div>`;
    }).join('');
  }, err => {
    el.innerHTML = `<p style="text-align:center;color:red;font-size:12px">${err.message}</p>`;
  });
}

function imprimirCisternaPDF(id, tipo) {
  showToast(`<i class="ph-bold ph-printer"></i> Generando PDF (${tipo})...`, '#0ea5e9');
  db.collection('dace_cisternas').doc(id).get().then(snap => {
    if(!snap.exists) return;
    const d = snap.data();
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const azul = [10, 25, 47];
    
    let titulo = tipo === '137.1' ? 'PPR-137.1 Orden de Trabajo (Cisterna)' : 'PPR-137.3 InspecciÃ³n (Cisterna)';
    let y = pdfHeaderSingle(doc, titulo);
    
    doc.setFillColor(240, 244, 248);
    doc.rect(10, y, W-20, 7, 'F');
    doc.setTextColor(...azul);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text(`Cisterna: ${d.lugar}`, 13, y+5);
    y += 12;
    
    let campos = [];
    if(tipo === '137.1') {
      campos = [
        ['Fecha/Hora', `${d.fecha||''} ${d.hora||''}`],
        ['Tipo de Trabajo', 'PlomerÃ­a / Cisterna'],
        ['Estatus Actual', d.estatus],
        ['DescripciÃ³n / Problema', d.observaciones || 'Favor realizar evaluaciÃ³n de funcionamiento o reparaciÃ³n.']
      ];
    } else {
      campos = [
        ['Fecha/Hora', `${d.fecha||''} ${d.hora||''}`],
        ['Lugar de InspecciÃ³n', d.lugar],
        ['Estatus (CondiciÃ³n)', d.estatus],
        ['Hallazgos / Notas', d.observaciones || 'InspecciÃ³n de cisterna rutinaria.']
      ];
    }
    
    campos.forEach(([label, val]) => {
      if (!val) return;
      y = checkPage(doc, y, 10);
      doc.setTextColor(...azul);
      doc.setFontSize(9);
      doc.setFont('helvetica','bold');
      doc.text(label + ':', 13, y);
      doc.setFont('helvetica','normal');
      doc.setTextColor(60,60,60);
      const lines = doc.splitTextToSize(String(val), W - 55);
      doc.text(lines, 45, y);
      y += (lines.length * 5) + 3;
    });
    
    doc.save(`Cisterna_${d.lugar}_${tipo}.pdf`);
    showToast('<i class="ph-bold ph-check"></i> PDF Guardado', '#166534');
  }).catch(e => showToast('<i class="ph-bold ph-x"></i> Error: ' + e.message, '#dc2626'));
}

async function importarConversacionesChatGPT() {
  const input = document.getElementById('import_chat_input');
  const statusEl = document.getElementById('import_chat_status');
  if (!input || !input.files || !input.files[0]) return;

  const file = input.files[0];
  statusEl.textContent = 'â³ Leyendo archivo...';
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const chats = JSON.parse(e.target.result);
      if (!Array.isArray(chats)) {
        throw new Error('El archivo no tiene el formato oficial de exportaciÃ³n de ChatGPT.');
      }

      statusEl.textContent = 'ðŸ” Buscando coincidencias DACE...';
      let importados = 0;

      // Palabras clave para filtrar (incluyendo las nuevas provistas por el usuario)
      const keywords = [
        'dace', 'arecibo', 'ppr-137', 'cisterna', 'generador', 'inspeccion', 
        'cuartel', 'record', 'trabajos', 'informacion', 'planta fisica', 
        'reservas de agua'
      ];

      for (const chat of chats) {
        const title = chat.title || 'Chat sin tÃ­tulo';
        const titleLower = title.toLowerCase();
        
        let chatText = '';
        if (chat.mapping) {
          Object.values(chat.mapping).forEach(node => {
            const message = node.message;
            if (message && message.content && message.content.parts) {
              message.content.parts.forEach(part => {
                if (typeof part === 'string') {
                  chatText += ' ' + part;
                }
              });
            }
          });
        }
        const textLower = chatText.toLowerCase();

        // Verificar si coincide con palabras clave
        const coincide = keywords.some(kw => titleLower.includes(kw) || textLower.includes(kw));

        if (coincide) {
          // Extraer fecha/hora del chat
          const createTime = chat.create_time;
          let fechaStr = hoy();
          let horaStr = ahora();
          if (createTime) {
            const date = new Date(createTime * 1000);
            fechaStr = date.toISOString().split('T')[0];
            horaStr = date.toTimeString().split(' ')[0].substring(0, 5);
          }

          // Resumir mensajes
          let mensajesLimpios = '';
          if (chat.mapping) {
            const nodes = Object.values(chat.mapping)
              .filter(node => node.message && node.message.content && node.message.content.parts)
              .sort((a, b) => (a.message.create_time || 0) - (b.message.create_time || 0));

            nodes.forEach(node => {
              const role = node.message.author?.role === 'user' ? 'Usuario' : 'ChatGPT';
              const part = node.message.content.parts[0];
              if (typeof part === 'string' && part.trim()) {
                mensajesLimpios += `[${role}]: ${part.substring(0, 400)}${part.length > 400 ? '...' : ''}\n\n`;
              }
            });
          }

          // Limitar a un tamaÃ±o seguro de Firestore
          mensajesLimpios = mensajesLimpios.substring(0, 3000);

          // Guardar en dace_maestro
          await db.collection('dace_maestro').add({
            tipo: 'ImportaciÃ³n ChatGPT',
            fecha: fechaStr,
            hora: horaStr,
            descripcion: `Chat: ${title}`,
            notas: mensajesLimpios || 'Sin contenido de texto extraÃ­ble.',
            usuario: 'Importador ChatGPT',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          importados++;
        }
      }

      statusEl.textContent = `âœ… Importados ${importados} chats con Ã©xito`;
      showToast(`âœ… Se importaron ${importados} conversaciones sobre DACE Arecibo`, '#166534');
      if (typeof cargarMaestro === 'function') cargarMaestro();
      
    } catch(err) {
      statusEl.textContent = 'âŒ Error al importar';
      showToast('âŒ Error: ' + err.message, '#dc2626');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

/* --- EXPORTAR A WINDOW (MODULARIZACION) --- */
window.generarDescripcionIA = generarDescripcionIA;
window.importarConversacionesChatGPT = importarConversacionesChatGPT;
window.trunc = trunc;
window.imprimirIndividualPDF = imprimirIndividualPDF;
window.imprimirPPR137_1 = imprimirPPR137_1;
window.mostrarPinSiNecesario = mostrarPinSiNecesario;
window.moduloTabId = moduloTabId;
window.renderFeed = renderFeed;
window.guardarGenerador = guardarGenerador;
window.clearFotoGen = clearFotoGen;
window.guardarAgenda = guardarAgenda;
window.eliminar = eliminar;
window.showToast = showToast;
window.cerrarSesion = cerrarSesion;
window.item_Maestro_data = item_Maestro_data;
window.cargarCisternas = cargarCisternas;
window.usarHallazgoIA = usarHallazgoIA;
window.previewFoto = previewFoto;
window.limpiarFiltros = limpiarFiltros;
window.checkPage = checkPage;
window.editarQ1 = editarQ1;
window.v = v;
window.toggleChip = toggleChip;
window.cancelarEdicion = cancelarEdicion;
window.renderAgenda = renderAgenda;
window.recopilarInspeccion = recopilarInspeccion;
window.item_Q1 = item_Q1;
window.pdfHeaderSingle = pdfHeaderSingle;
window.guardarArchivo = guardarArchivo;
window.renderLista = renderLista;
window.exportarGeneradoresPDF = exportarGeneradoresPDF;
window.item_Q3_data = item_Q3_data;
window.guardarCisterna = guardarCisterna;
window.buscarJedi = buscarJedi;
window.cargarImagenComoBase64 = cargarImagenComoBase64;
window.bPrio = bPrio;
window.item_Q1_data = item_Q1_data;
window.guardarQ3 = guardarQ3;
window.actualizarDots = actualizarDots;
window.hoy = hoy;
window.initListeners = initListeners;
window.bEstatus = bEstatus;
window.guardarMantenimiento = guardarMantenimiento;
window.setFbStatus = setFbStatus;
window.buscarArchivo = buscarArchivo;
window.guardarCaso = guardarCaso;
window.renderDirectorio = renderDirectorio;
window.item_Q3 = item_Q3;
window.prefill = prefill;
window.renderArchivo = renderArchivo;
window.previewFotoGen = previewFotoGen;
window.editarMaestro = editarMaestro;
window.filtrarJediEstatus = filtrarJediEstatus;
window.imprimirCisternaPDF = imprimirCisternaPDF;
window.makeInspRows = makeInspRows;
window.item_Caso = item_Caso;
window.set = set;
window.aplicarFiltros = aplicarFiltros;
window.calcularResumenGen = calcularResumenGen;
window.verificarPin = verificarPin;
window.buscarDirectorio = buscarDirectorio;
window.subirFoto = subirFoto;
window.guardarMaestro = guardarMaestro;
window.previewFotoJedi = previewFotoJedi;
window.usarTextoIA = usarTextoIA;
window.editarCaso = editarCaso;
window.changeTab = changeTab;
window.item_Mt_data = item_Mt_data;
window.filtrarGenTipo = filtrarGenTipo;
window.guardarDirectorio = guardarDirectorio;
window.guardarJedi = guardarJedi;
window.renderGeneradores = renderGeneradores;
window.guardarQ1 = guardarQ1;
window.exportarJediPDF = exportarJediPDF;
window.item_Caso_data = item_Caso_data;
window.limpiar = limpiar;
window.buscarGeneradores = buscarGeneradores;
window.editarJedi = editarJedi;
window.cargarTrabajosRealizados = cargarTrabajosRealizados;
window.pinDel = pinDel;
window.limpiarDesc = limpiarDesc;
window.pdfLinea = pdfLinea;
window.editarMantenimiento = editarMantenimiento;
window.clearFotoJedi = clearFotoJedi;
window.llamarGemini = llamarGemini;
window.generarHallazgoIA = generarHallazgoIA;
window.exportarPanelPDF = exportarPanelPDF;
window.exportarPDF = exportarPDF;
window.switchGenTab = switchGenTab;
window.feedRow = feedRow;
window.renderJedi = renderJedi;
window.completarTarea = completarTarea;
window.item_Maestro = item_Maestro;
window.generarReportes = generarReportes;
window.loginFirebase = loginFirebase;
window.editarQ3 = editarQ3;
window.switchInnerTab = switchInnerTab;
window.pdfHeader = pdfHeader;
window.modoEdicion = modoEdicion;
window.clearFoto = clearFoto;
window.ahora = ahora;
window.pinPress = pinPress;
if (typeof _cache !== 'undefined') window._cache = _cache;
if (typeof _filtros !== 'undefined') window._filtros = _filtros;
if (typeof _genCache !== 'undefined') window._genCache = _genCache;
if (typeof _genFotoData !== 'undefined') window._genFotoData = _genFotoData;
if (typeof _genFiltroTipo !== 'undefined') window._genFiltroTipo = _genFiltroTipo;
if (typeof _agendaCache !== 'undefined') window._agendaCache = _agendaCache;
if (typeof _dirCache !== 'undefined') window._dirCache = _dirCache;
if (typeof _arcCache !== 'undefined') window._arcCache = _arcCache;
if (typeof _jediCache !== 'undefined') window._jediCache = _jediCache;
if (typeof _jediFotoData !== 'undefined') window._jediFotoData = _jediFotoData;
if (typeof _jediFilterEstatus !== 'undefined') window._jediFilterEstatus = _jediFilterEstatus;
if (typeof FIRMA_B64 !== 'undefined') window.FIRMA_B64 = FIRMA_B64;
if (typeof _fotoData !== 'undefined') window._fotoData = _fotoData;
if (typeof authReady !== 'undefined') window.authReady = authReady;
if (typeof PIN_CORRECTO !== 'undefined') window.PIN_CORRECTO = PIN_CORRECTO;
if (typeof SESSION_KEY !== 'undefined') window.SESSION_KEY = SESSION_KEY;
if (typeof pinActual !== 'undefined') window.pinActual = pinActual;
if (typeof firebaseConfig !== 'undefined') window.firebaseConfig = firebaseConfig;
if (typeof feedCache !== 'undefined') window.feedCache = feedCache;
if (typeof _editando !== 'undefined') window._editando = _editando;
if (typeof db !== 'undefined') window.db = db;
if (typeof auth !== 'undefined') window.auth = auth;
if (typeof storage !== 'undefined') window.storage = storage;
if (typeof fbFunctions !== 'undefined') window.fbFunctions = fbFunctions;

window.changeThemeMode = changeThemeMode;
window.toggleFabMenu = toggleFabMenu;
window.fabAction = fabAction;
window.resaltarValidacion = resaltarValidacion;
window.exportarPDF_Q1_Single = exportarPDF_Q1_Single;
window.exportarPDF_Q1_Single_By_Id = exportarPDF_Q1_Single_By_Id;
window.imprimirIndividualPDF = imprimirIndividualPDF;

// PPR-312.2 Exports
window.guardarInsp312_2 = guardarInsp312_2;
window.buscarInsp312_2 = buscarInsp312_2;
window.exportarPDF_312_2_Single_By_Id = exportarPDF_312_2_Single_By_Id;
window.eliminarInsp312_2 = eliminarInsp312_2;
window.editarInsp312_2 = editarInsp312_2;

initTheme();



