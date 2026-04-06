const MAX_IMAGE_BYTES = 2  * 1024 * 1024;  // 2 MB
const MAX_DOC_BYTES   = 10 * 1024 * 1024;  // 10 MB

/**
 * Mapa de tipos soportados.
 * mime      → MIME type del data-URI
 * magic     → firmas de bytes (offset + bytes esperados)
 * maxBytes  → límite de tamaño
 */
const TYPES = {
  // ── Imágenes ──────────────────────────────────────────────────
  png: {
    mime: 'image/png',
    magic: [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }],
    maxBytes: MAX_IMAGE_BYTES,
  },
  jpg: {
    mime: 'image/jpeg',
    magic: [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
    maxBytes: MAX_IMAGE_BYTES,
  },
  webp: {
    mime: 'image/webp',
    magic: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
    ],
    maxBytes: MAX_IMAGE_BYTES,
  },
  // ── Documentos ───────────────────────────────────────────────
  pdf: {
    mime: 'application/pdf',
    magic: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
    maxBytes: MAX_DOC_BYTES,
  },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }], // PK (ZIP)
    maxBytes: MAX_DOC_BYTES,
  },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    magic: [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }], // PK (ZIP)
    maxBytes: MAX_DOC_BYTES,
  },
};

// Mapeo inverso MIME → ext
const MIME_TO_EXT = {};
for (const [ext, cfg] of Object.entries(TYPES)) MIME_TO_EXT[cfg.mime] = ext;
MIME_TO_EXT['image/jpg'] = 'jpg'; // alias

function checkMagicBytes(buffer, ext) {
  const sigs = TYPES[ext].magic;
  return sigs.every(sig => sig.bytes.every((b, i) => buffer[sig.offset + i] === b));
}

/**
 * Parsea un data-URI base64 y valida MIME, tamaño y magic bytes.
 *
 * @param {string}   dataUri  - Cadena "data:<mime>;base64,<datos>"
 * @param {string[]} allowed  - Extensiones permitidas: 'png','jpg','webp','pdf','docx','xlsx'
 * @returns {{ ext: string, buffer: Buffer }}
 */
function parseAndValidateFile(dataUri, allowed) {
  const allowedMimes = allowed.map(e => TYPES[e]?.mime).filter(Boolean);
  const mimePattern  = allowedMimes.map(m => m.replace(/[+.]/g, '\\$&')).join('|');
  const re = new RegExp(`^data:(${mimePattern});base64,([A-Za-z0-9+/=]+)$`);

  const match = dataUri.match(re);
  if (!match) throw Object.assign(new Error('Formato de archivo inválido'), { statusCode: 400 });

  const ext    = MIME_TO_EXT[match[1]];
  const buffer = Buffer.from(match[2], 'base64');
  const cfg    = TYPES[ext];

  if (buffer.length > cfg.maxBytes) {
    const mb = cfg.maxBytes / (1024 * 1024);
    throw Object.assign(new Error(`El archivo supera el tamaño máximo de ${mb} MB`), { statusCode: 400 });
  }

  if (!checkMagicBytes(buffer, ext)) {
    throw Object.assign(new Error('El contenido del archivo no corresponde al tipo declarado'), { statusCode: 400 });
  }

  return { ext, buffer };
}

module.exports = { parseAndValidateFile };
