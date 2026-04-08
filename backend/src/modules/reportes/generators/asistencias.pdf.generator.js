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

const generateAsistenciasPDF = ({ empleados, dias_habiles }, filters, empresaNombre = 'Mi Institución') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── ENCABEZADO ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text(empresaNombre, 40, 15);
    doc.fontSize(11).font('Helvetica')
       .text('REPORTE DE ASISTENCIAS POR EMPLEADO', 40, 38);
    doc.fontSize(9)
       .text(
         `Período: ${filters.fecha_inicio} al ${filters.fecha_fin}   |   Días hábiles: ${dias_habiles}   |   Generado: ${new Date().toLocaleDateString('es')}`,
         40, 54
       );

    // ── TABLA ─────────────────────────────────────────────────────────────────
    const tableTop = 90;
    const cols = [
      { label: 'Empleado',       width: 150 },
      { label: 'Departamento',   width: 100 },
      { label: 'Presentes',      width: 65  },
      { label: 'Ausentes',       width: 65  },
      { label: 'Días Hábiles',   width: 70  },
      { label: '% Asistencia',   width: 80  },
      { label: 'Total Horas',    width: 70  },
    ];

    let x = 40;
    doc.rect(40, tableTop, doc.page.width - 80, 20).fill('#E8E7FF');
    doc.fillColor(COLORS.primary).fontSize(8).font('Helvetica-Bold');
    cols.forEach(col => {
      doc.text(col.label, x + 3, tableTop + 6, { width: col.width - 6, align: 'center', ellipsis: true });
      x += col.width;
    });

    let y = tableTop + 20;
    doc.fontSize(8).font('Helvetica');

    for (let i = 0; i < empleados.length; i++) {
      const emp = empleados[i];

      if (y > doc.page.height - 60) {
        doc.addPage({ layout: 'landscape' });
        y = 40;
      }

      const bg = i % 2 === 0 ? 'white' : COLORS.light;
      doc.rect(40, y, doc.page.width - 80, 18).fill(bg);
      doc.fillColor(COLORS.text);

      x = 40;
      const pct = emp.porcentaje;
      const pctColor = pct >= 90 ? COLORS.success : pct >= 70 ? COLORS.warning : COLORS.danger;
      const horas = (emp.total_min / 60).toFixed(1) + 'h';

      const vals = [
        { text: emp.empleado,                     color: COLORS.text,    bold: false },
        { text: emp.departamento || 'N/A',         color: COLORS.secondary, bold: false },
        { text: String(emp.dias_presentes),        color: COLORS.success, bold: true  },
        { text: String(emp.dias_ausentes),         color: emp.dias_ausentes > 0 ? COLORS.danger : COLORS.text, bold: emp.dias_ausentes > 0 },
        { text: String(emp.dias_habiles),          color: COLORS.text,    bold: false },
        { text: `${pct}%`,                        color: pctColor,       bold: true  },
        { text: horas,                             color: COLORS.text,    bold: false },
      ];

      vals.forEach((v, vi) => {
        doc.fillColor(v.color).font(v.bold ? 'Helvetica-Bold' : 'Helvetica')
           .text(v.text, x + 3, y + 5, { width: cols[vi].width - 6, align: 'center', ellipsis: true });
        x += cols[vi].width;
      });

      doc.moveTo(40, y + 18).lineTo(doc.page.width - 40, y + 18)
         .strokeColor(COLORS.border).lineWidth(0.5).stroke();
      y += 18;
    }

    // ── RESUMEN FINAL ─────────────────────────────────────────────────────────
    y += 12;
    if (y > doc.page.height - 80) { doc.addPage({ layout: 'landscape' }); y = 40; }

    const totalPresentes = empleados.reduce((s, e) => s + e.dias_presentes, 0);
    const totalAusentes  = empleados.reduce((s, e) => s + e.dias_ausentes, 0);
    const promPct        = empleados.length
      ? Math.round(empleados.reduce((s, e) => s + e.porcentaje, 0) / empleados.length)
      : 0;

    doc.rect(40, y, doc.page.width - 80, 36).fill('#E8E7FF');
    doc.fillColor(COLORS.primary).fontSize(8).font('Helvetica-Bold')
       .text(`Total empleados: ${empleados.length}`, 50, y + 5)
       .text(`Total días presentes: ${totalPresentes}`, 200, y + 5)
       .text(`Total días ausentes: ${totalAusentes}`,   380, y + 5)
       .text(`% Asistencia promedio: ${promPct}%`,      560, y + 5);

    doc.end();
  });
};

module.exports = { generateAsistenciasPDF };
