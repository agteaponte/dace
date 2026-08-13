// Script de utilidad CLI para encriptar claves API de Firebase para DACE Arecibo
const key = "dace_arecibo_secure_salt_2026";
const plainText = process.argv[2];

if (!plainText) {
  console.log("Uso: node encrypt_key.js <API_KEY_PLANA>");
  console.log("Ejemplo: node encrypt_key.js AIzaSy...");
  process.exit(1);
}

function encryptApiKey(text) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

console.log("Clave API Encriptada:");
console.log(encryptApiKey(plainText));
