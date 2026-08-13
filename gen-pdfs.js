const fs = require('fs');
const path = require('path');

const root = __dirname;
const outPath = path.join(root, 'pdfs.js');

try {
  console.log('Codificando PDFs...');
  const b64_1 = fs.readFileSync(path.join(root, 'PPR-137.1.pdf')).toString('base64');
  console.log('PPR-137.1.pdf -> Listo');
  
  const b64_3 = fs.readFileSync(path.join(root, 'PPR-137.3.pdf')).toString('base64');
  console.log('PPR-137.3.pdf -> Listo');
  
  const content = `const PDF_137_1 = "${b64_1}";\nconst PDF_137_3 = "${b64_3}";\n`;
  fs.writeFileSync(outPath, content);
  
  console.log('Escrito con éxito en pdfs.js');
} catch (e) {
  console.error('Error:', e);
}
