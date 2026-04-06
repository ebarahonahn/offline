const PDFDocument = require('pdfkit');
const { formatDuration } = require('../../../utils/date.util');

const COLORS = {
  primary:   '#4F46E5',
  secondary: '#6B7280',
  success:   '#10B981',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  light:     '#F9FAFB',
  border:    '#E5E7EB',
  text:      '#111827',
};

const generateProductividadPDF = (data, filters, empresaNombre = 'Mi Institución') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── ENCABEZADO ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text(empresaNombre, 40, 15);
    doc.fontSize(11).font('Helvetica')
       .text('REPORTE DE PRODUCTIVIDAD', 40, 38);
    doc.fontSize(9)
       .text(`Período: ${filters.fecha_inicio} al ${filters.fecha_fin}   |   Generado: ${new Date().toLocaleDateString('es')}`, 40, 54);

    // ── TABLA ──────────────────────────────────────────────────
    const tableTop = 90;
    const cols = [
      { label: 'Empleado',         width: 130 },
      { label: 'Departamento',     width: 90  },
      { label: 'Jornadas',         width: 55  },
      { label: 'Total Trabajado',  width: 80  },
      { label: 'Prom./Jornada',    width: 75  },
      { label: 'Inactividad',      width: 70  },
      { label: 'Actividades',      width: 65  },
      { label: 'Eficiencia',       width: 60  },
    ];

    let x = 40;
    doc.rect(40, tableTop, doc.page.width - 80, 20).fill('#E8E7FF');
    doc.fillColor(COLORS.primary).fontSize(8).font('Helvetica-Bold');
    cols.forEach(col => {
      doc.text(col.label, x + 3, tableTop + 6, { width: col.width - 3, ellipsis: true, lineBreak: false });
      x += col.width;
    });

    let y = tableTop + 20;
    doc.fontSize(7.5).font('Helvetica');

    data.forEach((row, i) => {
      if (y > doc.page.height - 60) {
        doc.addPage({ layout: 'landscape' });
        y = 40;
      }

      const trabajadoNeto = Math.max(0, (row.total_trabajado_min || 0) - (row.inactividad_min || 0));
      const eficiencia = row.total_trabajado_min > 0
        ? Math.round((trabajadoNeto / row.total_trabajado_min) * 100)
        : 0;

      const bgColor = i % 2 === 0 ? 'white' : COLORS.light;
      doc.rect(40, y, doc.page.width - 80, 18).fill(bgColor);
      doc.fillColor(COLORS.text);

      x = 40;
      const vals = [
        row.empleado,
        row.departamento || 'N/A',
        String(row.jornadas),
        formatDuration(row.total_trabajado_min),
        formatDuration(row.promedio_min),
        formatDuration(row.inactividad_min),
        String(row.actividades),
        `${eficiencia}%`,
      ];

      vals.forEach((val, vi) => {
        if (vi === 7) {
          const c = eficiencia >= 80 ? COLORS.success : eficiencia >= 60 ? COLORS.warning : COLORS.danger;
          doc.fillColor(c).font('Helvetica-Bold');
        }
        doc.text(String(val), x + 3, y + 5, { width: cols[vi].width - 6, ellipsis: true, lineBreak: false });
        doc.fillColor(COLORS.text).font('Helvetica');
        x += cols[vi].width;
      });

      doc.moveTo(40, y + 18).lineTo(doc.page.width - 40, y + 18)
         .strokeColor(COLORS.border).lineWidth(0.5).stroke();
      y += 18;
    });

    doc.fillColor(COLORS.secondary).fontSize(8)
       .text(`Total: ${data.length} empleados`, 40, y + 10, { lineBreak: false });

    doc.end();
  });
};

module.exports = { generateProductividadPDF };
