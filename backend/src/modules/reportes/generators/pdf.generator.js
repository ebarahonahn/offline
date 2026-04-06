const PDFDocument = require('pdfkit');
const { formatDuration } = require('../../../utils/date.util');

const COLORS = {
  primary: '#4F46E5',
  secondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  light: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
};

const generateJornadasPDF = (data, filters, empresaNombre = 'Mi Institución') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ---- ENCABEZADO ----
    doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text(empresaNombre, 40, 15);
    doc.fontSize(11).font('Helvetica')
       .text('REPORTE DE JORNADAS LABORALES', 40, 38);
    doc.fontSize(9)
       .text(`Período: ${filters.fecha_inicio} al ${filters.fecha_fin}   |   Generado: ${new Date().toLocaleDateString('es')}`,
             40, 54);

    // ---- TABLA ----
    const tableTop = 90;
    const cols = [
      { label: 'Empleado',     width: 130 },
      { label: 'Departamento', width: 90  },
      { label: 'Fecha',        width: 70  },
      { label: 'Inicio',       width: 55  },
      { label: 'Fin',          width: 55  },
      { label: 'Trabajado',    width: 65  },
      { label: 'Pausas',       width: 55  },
      { label: 'Estado',       width: 65  },
    ];

    let x = 40;
    // Header row
    doc.rect(40, tableTop, doc.page.width - 80, 20).fill('#E8E7FF');
    doc.fillColor(COLORS.primary).fontSize(8).font('Helvetica-Bold');
    cols.forEach(col => {
      doc.text(col.label, x + 3, tableTop + 6, { width: col.width - 3, ellipsis: true });
      x += col.width;
    });

    // Data rows
    let y = tableTop + 20;
    doc.fontSize(7.5).font('Helvetica');

    data.slice(0, 50).forEach((row, i) => {
      if (y > doc.page.height - 60) {
        doc.addPage({ layout: 'landscape' });
        y = 40;
      }

      const bgColor = i % 2 === 0 ? 'white' : COLORS.light;
      doc.rect(40, y, doc.page.width - 80, 18).fill(bgColor);
      doc.fillColor(COLORS.text);

      x = 40;
      const vals = [
        row.empleado,
        row.departamento || 'N/A',
        row.fecha,
        row.hora_inicio ? new Date(row.hora_inicio).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '-',
        row.hora_fin    ? new Date(row.hora_fin).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '-',
        formatDuration(row.duracion_min),
        formatDuration(row.pausas_min),
        row.estado,
      ];

      vals.forEach((val, vi) => {
        if (vi === 7) {
          const c = { finalizada: COLORS.success, activa: '#3B82F6', pausada: COLORS.warning }[row.estado] || COLORS.secondary;
          doc.fillColor(c).font('Helvetica-Bold');
        }
        doc.text(String(val), x + 3, y + 5, { width: cols[vi].width - 6, ellipsis: true });
        doc.fillColor(COLORS.text).font('Helvetica');
        x += cols[vi].width;
      });

      // Border line
      doc.moveTo(40, y + 18).lineTo(doc.page.width - 40, y + 18)
         .strokeColor(COLORS.border).lineWidth(0.5).stroke();
      y += 18;
    });

    // Footer
    doc.fillColor(COLORS.secondary).fontSize(8)
       .text(`Total: ${data.length} registros`, 40, y + 10);

    doc.end();
  });
};

module.exports = { generateJornadasPDF };
