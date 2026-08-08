/**
 * Script para reemplazar todos los emojis corruptos (caracteres de reemplazo \uFFFD)
 * en src/app.js con íconos Phosphor o texto plano equivalente.
 */
const fs = require('fs');

const FILE = 'src/app.js';
let content = fs.readFileSync(FILE, 'utf8');
const original = content;

// Función helper para contar reemplazos
let totalReplaced = 0;
function rep(from, to, flags = 'g') {
  const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  const before = content;
  content = content.split(from).join(to);
  if (content !== before) {
    const count = (before.split(from).length - 1);
    console.log(`  ✅ [${count}x] "${from.substring(0,40)}" → "${to.substring(0,40)}"`);
    totalReplaced += count;
  }
}

console.log('🔧 Reemplazando emojis corruptos...\n');

// ── BOTONES DE GUARDAR / ACTUALIZAR (💾) ──
rep('\uFFFDx\uFFFD GUARDAR CASO', '<i class="ph-fill ph-floppy-disk"></i> GUARDAR CASO');
rep('\uFFFDx\uFFFD GUARDAR ORDEN DE TRABAJO', '<i class="ph-fill ph-floppy-disk"></i> GUARDAR ORDEN DE TRABAJO');
rep('\uFFFDx\uFFFD GUARDAR ENTRADA', '<i class="ph-fill ph-floppy-disk"></i> GUARDAR ENTRADA');
rep('\uFFFDx\uFFFD GUARDAR', '<i class="ph-fill ph-floppy-disk"></i> GUARDAR');
rep('\uFFFDx\uFFFD ACTUALIZAR ORDEN', '<i class="ph-fill ph-floppy-disk"></i> ACTUALIZAR ORDEN');
rep('\uFFFDx\uFFFD ACTUALIZAR INSPECCI\uFFFD\u004eN', '<i class="ph-fill ph-floppy-disk"></i> ACTUALIZAR INSPECCIÓN');
rep('\uFFFDx\uFFFD ACTUALIZAR INSPECCI', '<i class="ph-fill ph-floppy-disk"></i> ACTUALIZAR INSPECCI');
rep('\uFFFDx\uFFFD ACTUALIZAR MANTENIMIENTO', '<i class="ph-fill ph-floppy-disk"></i> ACTUALIZAR MANTENIMIENTO');
rep('\uFFFDx\uFFFD ACTUALIZAR CASO', '<i class="ph-fill ph-floppy-disk"></i> ACTUALIZAR CASO');
rep('\uFFFDx\uFFFD ACTUALIZAR ENTRADA', '<i class="ph-fill ph-floppy-disk"></i> ACTUALIZAR ENTRADA');
rep('\uFFFDx\uFFFD ACTUALIZAR', '<i class="ph-fill ph-floppy-disk"></i> ACTUALIZAR');

// ── BOTÓN EDITAR (✏️) ──
rep('\uFFFDS\uFFFD\uFE0F Editar', '<i class="ph-fill ph-pencil-simple"></i> Editar');
rep('\uFFFDS\uFFFD\uFE0F Modo edición activo', '<i class="ph-fill ph-pencil-simple"></i> Modo edición activo');
rep('\uFFFDS\uFFFD\uFE0F Modo edición', '<i class="ph-fill ph-pencil-simple"></i> Modo edición');
rep('\uFFFDS\uFFFD\uFE0F', '<i class="ph-fill ph-pencil-simple"></i>');

// ── WARNINGS / ALERTAS (⚠️) ──
rep('\uFFFDa\uFFFD\uFE0F Completa correo', '⚠️ Completa correo');
rep('\uFFFDa\uFFFD\uFE0F La descripción', '⚠️ La descripción');
rep('\uFFFDa\uFFFD\uFE0F Lugar y descripción', '⚠️ Lugar y descripción');
rep('\uFFFDa\uFFFD\uFE0F El lugar', '⚠️ El lugar');
rep('\uFFFDa\uFFFD\uFE0F Número es requerido', '⚠️ Número es requerido');
rep('\uFFFDa\uFFFD\uFE0F', '⚠️');

// ── ÉXITO / CHECK (✅) ──
rep('\uFFFDS& Importados', '✅ Importados');
rep('\uFFFDS& Se importaron', '✅ Se importaron');
rep('\uFFFDS& Tema cambiado', '🎨 Tema cambiado');
rep('\uFFFDS&', '✅');

// ── ERROR (❌ / 🔴) ──
rep('\uFFFDR Error al importar', '❌ Error al importar');
rep('\uFFFDR Error', '❌ Error');
rep('\uFFFDR', '❌');

// ── LOCK / SESIÓN (🔒) ──
rep('\uFFFDx Sesión no iniciada', '🔒 Sesión no iniciada');
rep('\uFFFDx', '<i class="ph-bold ph-x"></i>');

// ── BUSCANDO (🔍) ──
rep('\uFFFD\uFFFD Buscando coincidencias', '<i class="ph-fill ph-magnifying-glass"></i> Buscando coincidencias');

// ── ÍCONOS VACÍOS EN EMPTY STATES ──
rep('<span class="empty-icon">\uFFFDx\uFFFD</span>', '<span class="empty-icon">📭</span>');
rep('<span class="empty-icon">\uFFFD\uFFFD\uFFFD</span>', '<span class="empty-icon">🔍</span>');
rep('<span class="empty-icon">\uFFFD</span>', '<span class="empty-icon">📂</span>');

// ── BLOQUEO (⛔) ──
rep('\uFFFD:', '⛔');

// ── FALLBACK / PLACEHOLDER (—) ──
// Solo reemplaza \uFFFD cuando se usa como valor fallback (|| '...')
content = content.replace(/\|\| '([^']*)\uFFFD([^']*)'/g, (m, pre, post) => `|| '${pre}—${post}'`);

// ── TEXTO EN PDF (separador) ──
rep('ACTIVIDAD RECIENTE \uFFFD REGISTRO', 'ACTIVIDAD RECIENTE | REGISTRO');
rep('DACE Arecibo \uFFFD NPPR \uFFFD Reporte', 'DACE Arecibo | NPPR | Reporte');

// ── SECTION HEADERS EN COMENTARIOS (limpiar) ──
// Las secuencias múltiples de \uFFFD en comentarios son inofensivas, solo limpiar visualmente
content = content.replace(/\/\*\s*[\uFFFD\u2550\u2554\u2557]+\s*/g, '/* ');
content = content.replace(/\s*[\uFFFD\u2550\u2554\u2557]+\s*\*\//g, ' */');

// ── CUALQUIER \uFFFD RESTANTE en innerHTML/textContent/showToast (solo UI) ──
// Reemplaza cualquier \uFFFD suelto que quede en strings de UI
content = content.replace(/(innerHTML\s*=\s*['"`][^'"`]*)\uFFFD([^'"`]*['"`])/g, '$1-$2');
content = content.replace(/(showToast\(['"`][^'"`]*)\uFFFD([^'"`]*)/g, '$1$2');

// Guardar
fs.writeFileSync(FILE, content, 'utf8');

// Verificar si quedan \uFFFD en código de UI visible
const remaining = (content.match(/\uFFFD/g) || []).length;
console.log(`\n📊 Total reemplazos: ${totalReplaced}`);
console.log(`⚠️  Caracteres \uFFFD restantes en el archivo: ${remaining} (en comentarios o texto de PDF)`);
console.log('✅ Archivo guardado.');
