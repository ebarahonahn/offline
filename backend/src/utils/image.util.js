const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// Magic bytes por formato normalizado
const MAGIC = {
  png:  { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] },
  jpg:  { offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  webp: [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
  ],
};

function checkMagicBytes(buffer, ext) {
  const sigs = Array.isArray(MAGIC[ext]) ? MAGIC[ext] : [MAGIC[ext]];
  return sigs.every(sig => sig.bytes.every((b, i) => buffer[sig.offset + i] === b));
}

/**
 * Parsea un data URI base64 y valida formato, tamaño y magic bytes.
 *
 * @param {string}   base64Data - String "data:image/<tipo>;base64,<datos>"
 * @param {string[]} allowed    - Extensiones permitidas en forma normalizada: 'png', 'jpg', 'webp'
 * @returns {{ ext: string, buffer: Buffer }}
 * @throws Error 400 si el formato, tamaño o magic bytes son inválidos
 */
function parseAndValidateImage(base64Data, allowed = ['png', 'jpg', 'webp']) {
  const mimeTypes = allowed.flatMap(e => (e === 'jpg' ? ['jpeg', 'jpg'] : [e]));
  const pattern = new RegExp(`^data:image/(${mimeTypes.join('|')});base64,([A-Za-z0-9+/=]+)$`);
  const match = base64Data.match(pattern);
  if (!match) throw Object.assign(new Error('Formato de imagen inválido'), { statusCode: 400 });

  const ext    = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error('La imagen supera el tamaño máximo de 2 MB'), { statusCode: 400 });
  }

  if (!checkMagicBytes(buffer, ext)) {
    throw Object.assign(new Error('El contenido del archivo no corresponde al tipo declarado'), { statusCode: 400 });
  }

  return { ext, buffer };
}

module.exports = { parseAndValidateImage };
