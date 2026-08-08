/**
 * Script CORREGIDO para reparar doble codificación UTF-8 en archivos JS del proyecto DACE.
 * 
 * El problema: los archivos tienen caracteres como Â·, Ã³, ðŸ en lugar de ·, ó, emojis.
 * Esto ocurre cuando un archivo UTF-8 fue leído como Latin-1 y re-guardado como UTF-8.
 * 
 * La solución correcta:
 *   1. Leer el archivo como UTF-8 (obtenemos el string garbled: "Â·")
 *   2. Codificar ese string como Latin-1 → obtenemos los bytes originales [0xC2, 0xB7]
 *   3. Interpretar esos bytes como UTF-8 → obtenemos "·" correcto
 */

const fs = require('fs');

const FILES_TO_FIX = [
  'src/app.js',
  'REFACTORED_RENDERING.js',
  'REFACTORED_CRUD.js',
  'REFACTORED_AUTH.js',
  'SECURITY_UTILS.js',
  'pdfs.js',
  'app.js',
];

function hasCorruption(content) {
  return (
    content.includes('Â·')  ||  // · (middle dot)
    content.includes('Ã³')  ||  // ó
    content.includes('Ã©')  ||  // é
    content.includes('Ã±')  ||  // ñ
    content.includes('Ã¡')  ||  // á
    content.includes('Ã­')  ||  // í
    content.includes('â€"') ||  // —
    content.includes('â€¢') ||  // •
    content.includes('ðŸ')  ||  // emojis
    content.includes('â•')      // box drawing ╔╗
  );
}

function fixDoubleEncoding(garbledUtf8String) {
  // Codificamos el string garbled como Latin-1 para recuperar los bytes originales
  // y luego los interpretamos como UTF-8 correcto
  return Buffer.from(garbledUtf8String, 'latin1').toString('utf8');
}

// Test rápido para verificar que el fix funciona
const testInput = 'Â· Ã³ Ã© Ã± ðŸ';
const testFixed = fixDoubleEncoding(testInput);
console.log('🧪 Test de verificación:');
console.log('   Entrada garbled: ' + testInput);
console.log('   Salida correcta: ' + testFixed);
console.log('');

let fixedCount = 0;

FILES_TO_FIX.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }

  // PASO CRÍTICO: leer como UTF-8 para obtener el string con corrupción
  const original = fs.readFileSync(filePath, 'utf8');

  if (hasCorruption(original)) {
    // Aplicar el fix de doble codificación
    const fixed = fixDoubleEncoding(original);

    // Guardar respaldo
    fs.writeFileSync(filePath + '.bak2', original, 'utf8');
    // Escribir el archivo corregido como UTF-8
    fs.writeFileSync(filePath, fixed, 'utf8');

    // Verificar que el fix funcionó
    const afterFix = fs.readFileSync(filePath, 'utf8');
    if (hasCorruption(afterFix)) {
      console.log(`❌ Fix no completo: ${filePath} (aún tiene corrupción residual)`);
    } else {
      console.log(`✅ Reparado exitosamente: ${filePath}`);
      fixedCount++;
    }
  } else {
    console.log(`✓  Sin problemas: ${filePath}`);
  }
});

console.log(`\n📊 Total reparados: ${fixedCount} archivo(s)`);
