const PDFDocument = require('pdfkit');

const COLORS = {
  primary:   '#4F46E5',
  success:   '#10B981',
  warning:   '#F59E0B',
  extra:     '#D97706',
  danger:    '#EF4444',
  secondary: '#6B7280',
  light:     '#F9FAFB',
  finde:     '#F3F4F6',
  border:    '#E5E7EB',
  text:      '#111827',
};

const fmtHora = (dt) => dt ? new Date(dt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDur  = (min) => {
  if (!min) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const generateDetallePDF = ({ emp, dias, presentes, ausentes, dias_habiles, porcentaje, total_min, total_extra_min, fecha_inicio, fecha_fin, hora_fin_jornada }, empresaNombre = 'Mi Institución') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── ENCABEZADO ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 65).fill(COLORS.primary);
    doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
       .text(empresaNombre, 40, 12);
    doc.fontSize(10).font('Helvetica')
       .text('DETALLE DE ASISTENCIA POR EMPLEADO', 40, 32);
    doc.fontSize(8)
       .text(`Período: ${fecha_inicio} al ${fecha_fin}   |   Hora fin jornada: ${hora_fin_jornada || '17:00'}   |   Generado: ${new Date().toLocaleDateString('es')}`, 40, 48);

    // ── INFO EMPLEADO ─────────────────────────────────────────────────────────
    let y = 80;
    doc.rect(40, y, doc.page.width - 80, 40).fill('#E8E7FF');
    doc.fillColor(COLORS.primary).fontSize(12).font('Helvetica-Bold')
       .text(emp.empleado, 50, y + 5);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.secondary)
       .text(emp.departamento || 'Sin departamento', 50, y + 20);

    const badgeX = doc.page.width - 310;
    const pctColor = porcentaje >= 90 ? COLORS.success : porcentaje >= 70 ? COLORS.warning : COLORS.danger;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.fillColor(COLORS.success) .text(`✓ ${presentes} presentes`,       badgeX,      y + 5);
    doc.fillColor(ausentes > 0 ? COLORS.danger : COLORS.secondary)
                                  .text(`✗ ${ausentes} ausentes`,          badgeX + 90, y + 5);
    doc.fillColor(pctColor)       .text(`${porcentaje}% asistencia`,       badgeX,      y + 20);
    doc.fillColor(COLORS.primary) .text(`${fmtDur(total_min)} trabajadas`, badgeX + 90, y + 20);
    if (total_extra_min > 0) {
      doc.fillColor(COLORS.extra).text(`+${fmtDur(total_extra_min)} extra`, badgeX + 185, y + 20);
    }

    // ── TABLA ─────────────────────────────────────────────────────────────────
    y += 55;
    const cols = [
      { label: 'Fecha',        width: 70 },
      { label: 'Día',          width: 38 },
      { label: 'Estado',       width: 72 },
      { label: 'Hora inicio',  width: 68 },
      { label: 'Hora fin',     width: 68 },
      { label: 'Duración',     width: 60 },
      { label: 'Tiempo extra', width: 68 },
    ];
    const tableW = cols.reduce((s, c) => s + c.width, 0);
    const tableX = 40;

    doc.rect(tableX, y, tableW, 18).fill('#E8E7FF');
    doc.fillColor(COLORS.primary).fontSize(7).font('Helvetica-Bold');
    let x = tableX;
    cols.forEach(col => {
      doc.text(col.label, x + 2, y + 5, { width: col.width - 4, align: 'center' });
      x += col.width;
    });
    y += 18;

    doc.fontSize(7.5).font('Helvetica');

    dias.forEach((dia, i) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }

      const rowH = 16;
      let bg;
      if (dia.tipo === 'finde')        bg = COLORS.finde;
      else if (dia.tipo === 'ausente') bg = '#FFF1F1';
      else                             bg = i % 2 === 0 ? 'white' : COLORS.light;

      doc.rect(tableX, y, tableW, rowH).fill(bg);

      const estadoColor = dia.tipo === 'presente'
        ? ({ finalizada: COLORS.success, activa: '#3B82F6', pausada: COLORS.warning }[dia.estado] || COLORS.secondary)
        : dia.tipo === 'ausente' ? COLORS.danger : COLORS.secondary;

      const tieneExtra = dia.tipo === 'presente' && dia.tiempo_extra_min > 0;

      const vals = [
        { text: dia.fecha,                                                                          color: dia.tipo === 'finde' ? COLORS.secondary : COLORS.text, bold: false },
        { text: DIAS_ES[dia.dow],                                                                   color: dia.tipo === 'finde' ? COLORS.secondary : COLORS.text, bold: false },
        { text: dia.tipo === 'presente' ? dia.estado : dia.tipo === 'ausente' ? 'Ausente' : 'F/S', color: estadoColor,                                            bold: dia.tipo !== 'finde' },
        { text: dia.tipo === 'presente' ? fmtHora(dia.hora_inicio)            : '—',               color: COLORS.text,                                            bold: false },
        { text: dia.tipo === 'presente' ? fmtHora(dia.hora_fin)               : '—',               color: COLORS.text,                                            bold: false },
        { text: dia.tipo === 'presente' ? fmtDur(dia.duracion_min)            : '—',               color: COLORS.text,                                            bold: false },
        { text: tieneExtra              ? fmtDur(dia.tiempo_extra_min)        : '—',               color: tieneExtra ? COLORS.extra : COLORS.secondary,           bold: tieneExtra },
      ];

      x = tableX;
      vals.forEach((v, vi) => {
        doc.fillColor(v.color).font(v.bold ? 'Helvetica-Bold' : 'Helvetica')
           .text(v.text, x + 2, y + 4, { width: cols[vi].width - 4, align: 'center', ellipsis: true });
        x += cols[vi].width;
      });

      doc.moveTo(tableX, y + rowH).lineTo(tableX + tableW, y + rowH)
         .strokeColor(COLORS.border).lineWidth(0.4).stroke();
      y += rowH;
    });

    // ── PIE ───────────────────────────────────────────────────────────────────
    y += 10;
    if (y > doc.page.height - 40) { doc.addPage(); y = 40; }
    doc.fillColor(COLORS.secondary).fontSize(7.5).font('Helvetica')
       .text(`Total trabajado: ${fmtDur(total_min)}   |   Tiempo extra total: ${fmtDur(total_extra_min)}`, tableX, y);

    doc.end();
  });
};

module.exports = { generateDetallePDF };
