/**
 * Script para reparar la doble codificación UTF-8 en los archivos JS del proyecto DACE.
 * 
 * El problema: los archivos fueron leídos como Latin-1 y guardados como UTF-8,
 * causando que caracteres como · → Â· y ó → Ã³, etc.
 * 
 * La solución: leer como UTF-8, interpretar como Latin-1, y recodificar como UTF-8 correcto.
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_FIX = [
  'src/app.js',
  'REFACTORED_RENDERING.js',
  'REFACTORED_CRUD.js',
  'REFACTORED_AUTH.js',
  'SECURITY_UTILS.js',
  'pdfs.js',
  'app.js',
];

function fixDoubleEncoding(content) {
  // Convierte chars Unicode (leídos como UTF-8) → bytes Latin-1 → re-interpreta como UTF-8
  return Buffer.from(content, 'latin1').toString('utf8');
}

function hasCorruption(content) {
  // Detecta patrones comunes de doble codificación
  return (
    content.includes('Ã³') ||  // ó
    content.includes('Ã©') ||  // é
    content.includes('Ã±') ||  // ñ
    content.includes('Ã¡') ||  // á
    content.includes('Ã­') ||  // í
    content.includes('Ã') ||   // Á/À/etc
    content.includes('Â·') ||  // · (middle dot)
    content.includes('â€') ||  // " " —
    content.includes('ðŸ') ||  // emojis
    content.includes('â"')     // box drawing chars
  );
}

let fixedCount = 0;

FILES_TO_FIX.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }

  // Leer el archivo como binario (latin1) para obtener los bytes reales
  const rawContent = fs.readFileSync(filePath, 'latin1');
  
  // Intentar re-interpretar como UTF-8
  let fixed;
  try {
    fixed = Buffer.from(rawContent, 'latin1').toString('utf8');
  } catch(e) {
    console.log(`❌ Error procesando ${filePath}: ${e.message}`);
    return;
  }
  
  // Verificar si el archivo original tenía corrupción
  const original = fs.readFileSync(filePath, 'utf8');
  if (hasCorruption(original)) {
    // Guardar una copia de respaldo
    fs.writeFileSync(filePath + '.backup', original, 'utf8');
    // Escribir la versión corregida
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log(`✅ Reparado: ${filePath}`);
    fixedCount++;
  } else {
    console.log(`✓  Sin problemas: ${filePath}`);
  }
});

console.log(`\n📊 Total reparados: ${fixedCount} archivo(s)`);
