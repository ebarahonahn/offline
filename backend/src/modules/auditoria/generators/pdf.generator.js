const PDFDocument = require('pdfkit');
const { ETIQUETAS_ACCION } = require('../auditoria.service');

const COLORS = {
  primary:   '#4F46E5',
  secondary: '#6B7280',
  text:      '#111827',
  light:     '#F9FAFB',
  border:    '#E5E7EB',
  delete:    '#FEF2F2',
  create:    '#F0FDF4',
  update:    '#FEFCE8',
  export:    '#EFF6FF',
};

const accionColor = (accion) => {
  if (accion.startsWith('DELETE_') || accion === 'LOGOUT') return COLORS.delete;
  if (accion.startsWith('CREATE_') || accion === 'LOGIN')  return COLORS.create;
  if (accion.startsWith('UPDATE_') || accion.startsWith('TOGGLE_') || accion === 'REACTIVAR_JORNADA') return COLORS.update;
  if (accion.startsWith('EXPORT_') || accion.startsWith('REPORTE_')) return COLORS.export;
  return null;
};

const truncar = (str, max = 35) => {
  if (!str) return '';
  const s = String(str);
  return s.length > max ? s.slice(0, max) + '…' : s;
};

const formatJsonCorto = (json) => {
  if (!json) return '';
  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    const claves = Object.keys(obj).slice(0, 3);
    return claves.map(k => `${k}: ${String(obj[k]).slice(0, 20)}`).join(', ') +
           (Object.keys(obj).length > 3 ? '…' : '');
  } catch { return truncar(String(json), 50); }
};

const generateAuditoriaPDF = (data, filters, empresaNombre = 'Mi Institución') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── ENCABEZADO ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 65).fill(COLORS.primary);
    doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
       .text(empresaNombre, 30, 12);
    doc.fontSize(10).font('Helvetica')
       .text('BITÁCORA DE AUDITORÍA DEL SISTEMA', 30, 34);

    const partes = [];
    if (filters.fecha_inicio && filters.fecha_fin)
      partes.push(`${filters.fecha_inicio} al ${filters.fecha_fin}`);
    if (filters.accion)  partes.push(ETIQUETAS_ACCION[filters.accion] || filters.accion);
    if (filters.entidad) partes.push(filters.entidad);
    partes.push(`Generado: ${new Date().toLocaleString('es')}`);

    doc.fontSize(8).text(partes.join('   |   '), 30, 50);

    // ── TABLA ───────────────────────────────────────────────────
    const cols = [
      { label: 'Fecha / Hora',  width: 80  },
      { label: 'Usuario',       width: 90  },
      { label: 'Acción',        width: 105 },
      { label: 'Entidad',       width: 70  },
      { label: 'ID',            width: 28  },
      { label: 'Datos Anteriores', width: 120 },
      { label: 'Datos Nuevos',     width: 120 },
      { label: 'IP',            width: 62  },
    ];
    const tableTop = 78;
    const rowH     = 20;

    const drawHeaderRow = (y) => {
      let x = 30;
      doc.rect(30, y, doc.page.width - 60, rowH).fill('#E8E7FF');
      doc.fillColor(COLORS.primary).fontSize(7.5).font('Helvetica-Bold');
      cols.forEach(col => {
        doc.text(col.label, x + 3, y + 6, { width: col.width - 4, ellipsis: true });
        x += col.width;
      });
    };

    drawHeaderRow(tableTop);
    let y = tableTop + rowH;

    doc.fontSize(7).font('Helvetica');

    data.forEach((row, i) => {
      // Nueva página si no hay espacio
      if (y + rowH > doc.page.height - 40) {
        doc.addPage({ layout: 'landscape' });
        y = 30;
        drawHeaderRow(y);
        y += rowH;
        doc.fontSize(7).font('Helvetica');
      }

      const bg = accionColor(row.accion) || (i % 2 === 0 ? 'white' : COLORS.light);
      doc.rect(30, y, doc.page.width - 60, rowH).fill(bg);
      doc.fillColor(COLORS.text);

      let x = 30;
      const vals = [
        row.created_at ? new Date(row.created_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '',
        truncar(row.usuario_nombre || 'Sistema', 20),
        truncar(row.accion_label || row.accion, 28),
        truncar(row.entidad || '', 16),
        row.entidad_id || '',
        formatJsonCorto(row.datos_ant),
        formatJsonCorto(row.datos_nue),
        row.ip || '',
      ];

      vals.forEach((val, vi) => {
        doc.text(String(val), x + 3, y + 6, { width: cols[vi].width - 5, ellipsis: true });
        x += cols[vi].width;
      });

      // Línea separadora
      doc.moveTo(30, y + rowH).lineTo(doc.page.width - 30, y + rowH)
         .strokeColor(COLORS.border).lineWidth(0.4).stroke();
      y += rowH;
    });

    // Pie de página
    doc.fillColor(COLORS.secondary).fontSize(8)
       .text(`Total: ${data.length} registros`, 30, y + 8);

    doc.end();
  });
};

module.exports = { generateAuditoriaPDF };
