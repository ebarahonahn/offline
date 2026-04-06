const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

const UPLOADS_ROOT = path.join(__dirname, '../../../../../uploads');

const COLORS = {
  primary:   '#4F46E5',
  success:   '#10B981',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  secondary: '#6B7280',
  light:     '#F9FAFB',
  border:    '#E5E7EB',
  text:      '#111827',
  white:     '#FFFFFF',
};

const fmtHora = (val) => {
  if (!val) return '-';
  return new Date(val).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
};

const fmtFecha = (val) => {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
};

const fmtDuracion = (min) => {
  if (!min) return '0m';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const estadoColor = (estado) => ({
  activa:     COLORS.success,
  pausada:    COLORS.warning,
  finalizada: COLORS.primary,
  completada: COLORS.success,
  en_progreso: COLORS.warning,
  cancelada:  COLORS.danger,
}[estado] ?? COLORS.secondary);

// Intenta insertar imagen; si falla o no existe, dibuja un placeholder
const tryImage = (doc, filePath, x, y, w, h) => {
  try {
    if (fs.existsSync(filePath)) {
      doc.image(filePath, x, y, { width: w, height: h, cover: [w, h] });
      return true;
    }
  } catch (_) {}
  doc.rect(x, y, w, h).fill('#E5E7EB');
  doc.fillColor(COLORS.secondary).fontSize(7)
     .text('Sin imagen', x, y + h / 2 - 5, { width: w, align: 'center', lineBreak: false });
  return false;
};

// Dibuja una sección con título y línea separadora
const seccion = (doc, titulo) => {
  if (doc.y > doc.page.height - 80) doc.addPage();
  doc.moveDown(0.6);
  const rectY = doc.y;
  doc.rect(doc.page.margins.left, rectY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 18)
     .fill('#EEF2FF');
  doc.fillColor(COLORS.primary).fontSize(9).font('Helvetica-Bold')
     .text(titulo.toUpperCase(), doc.page.margins.left + 6, rectY + 4);
  doc.y = rectY + 22;
  doc.font('Helvetica').fillColor(COLORS.text);
};

const generateReportePDF = (reporte, empresaNombre = 'Mi Institución') => {
  return new Promise((resolve, reject) => {
    const { jornada, actividades = [], capturas = [], pausas = [], inactividades = [] } = reporte;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 80; // ancho útil

    // ── ENCABEZADO ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 65).fill(COLORS.primary);
    doc.fillColor(COLORS.white).fontSize(16).font('Helvetica-Bold')
       .text(empresaNombre, 40, 12);
    doc.fontSize(10).font('Helvetica')
       .text('REPORTE DE JORNADA LABORAL', 40, 32);
    doc.fontSize(8)
       .text(`Generado: ${new Date().toLocaleString('es')}`, 40, 48);
    doc.moveDown(0.5);

    // ── DATOS DEL EMPLEADO ───────────────────────────────────────
    doc.y = 80;
    doc.fillColor(COLORS.text).fontSize(12).font('Helvetica-Bold')
       .text(`${jornada.nombre} ${jornada.apellido}`);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.secondary)
       .text(fmtFecha(jornada.fecha));
    doc.moveDown(0.5);

    // ── RESUMEN EN CAJAS ─────────────────────────────────────────
    const boxW = (W - 9) / 4;
    const boxY = doc.y;
    [
      { label: 'Hora inicio',  value: fmtHora(jornada.hora_inicio) },
      { label: 'Hora fin',     value: jornada.hora_fin ? fmtHora(jornada.hora_fin) : '-' },
      { label: 'Duración',     value: fmtDuracion(jornada.duracion_total_min) },
      { label: 'Estado',       value: jornada.estado, color: estadoColor(jornada.estado) },
    ].forEach((box, i) => {
      const bx = 40 + i * (boxW + 3);
      doc.rect(bx, boxY, boxW, 38).stroke(COLORS.border);
      doc.fillColor(COLORS.secondary).fontSize(7).font('Helvetica')
         .text(box.label, bx + 5, boxY + 5, { lineBreak: false });
      doc.fillColor(box.color ?? COLORS.text).fontSize(11).font('Helvetica-Bold')
         .text(box.value, bx + 5, boxY + 17, { width: boxW - 10, lineBreak: false });
    });
    doc.y = boxY + 48;

    // ── ACTIVIDADES ──────────────────────────────────────────────
    if (actividades.length > 0) {
      seccion(doc, `Actividades (${actividades.length})`);

      actividades.forEach((act) => {
        if (doc.y > doc.page.height - 60) doc.addPage();

        const startY = doc.y;
        doc.rect(40, startY, W, 14).fill(COLORS.light);
        doc.fillColor(COLORS.text).fontSize(9).font('Helvetica-Bold')
           .text(act.nombre, 46, startY + 3, { width: W * 0.7, ellipsis: true, lineBreak: false });

        // badge estado (posición absoluta para no interferir con doc.y)
        doc.fillColor(estadoColor(act.estado)).fontSize(7).font('Helvetica')
           .text(act.estado, 40 + W * 0.7 + 4, startY + 4, { width: W * 0.28, align: 'right', lineBreak: false });

        doc.y = startY + 18;
        doc.fillColor(COLORS.secondary).fontSize(7.5).font('Helvetica')
           .text(`${fmtHora(act.hora_inicio)} – ${act.hora_fin ? fmtHora(act.hora_fin) : '-'}  ·  ${fmtDuracion(act.tiempo_min)}${act.tipo_nombre ? '  ·  ' + act.tipo_nombre : ''}`,
                 46, doc.y);
        doc.moveDown(0.3);

        if (act.descripcion) {
          doc.fillColor(COLORS.text).fontSize(8).font('Helvetica')
             .text(act.descripcion, 46, doc.y, { width: W - 12 });
          doc.moveDown(0.3);
        }

        // Evidencias de la actividad
        const evs = (act.evidencias || []).filter(e => e.id != null);
        if (evs.length > 0) {
          const evLabelY = doc.y;
          doc.fillColor(COLORS.secondary).fontSize(7).font('Helvetica-Bold')
             .text(`Evidencias (${evs.length})`, 46, evLabelY, { lineBreak: false });

          const evW = 80, evH = 60, evGap = 6;
          // Altura fija de cada card: imagen + nombre (10pt) + descripcion (10pt) + márgenes
          const cardH = evH + 22;
          const evPerRow = Math.floor((W + evGap) / (evW + evGap));
          let rowStartY = evLabelY + 12; // espacio después del label
          let rowBottomY = rowStartY + cardH;

          evs.forEach((ev, ei) => {
            const col = ei % evPerRow;
            if (col === 0 && ei > 0) {
              // Nueva fila
              rowStartY = rowBottomY + evGap;
              if (rowStartY > doc.page.height - 100) {
                doc.addPage();
                rowStartY = 40;
              }
              rowBottomY = rowStartY + cardH;
            }
            const evX = 46 + col * (evW + evGap);

            const filePath = path.join(UPLOADS_ROOT, ev.archivo_url);
            if (/\.(png|jpe?g|webp)$/i.test(ev.archivo_url)) {
              tryImage(doc, filePath, evX, rowStartY, evW, evH);
            } else {
              doc.rect(evX, rowStartY, evW, evH).fill('#EEF2FF');
              const ext = (ev.archivo_url.split('.').pop() || 'FILE').toUpperCase();
              doc.fillColor(COLORS.primary).fontSize(9).font('Helvetica-Bold')
                 .text(ext, evX, rowStartY + evH / 2 - 8, { width: evW, align: 'center', lineBreak: false });
            }

            // Nombre: truncado manualmente a 1 línea (font 6.5, ancho 80 ≈ 21 chars)
            const nombre = String(ev.nombre || '').slice(0, 21);
            doc.fillColor(COLORS.secondary).fontSize(6.5).font('Helvetica')
               .text(nombre, evX, rowStartY + evH + 3, { width: evW, lineBreak: false });

            // Descripción: truncada a 1 línea (font 6, ancho 80 ≈ 23 chars)
            if (ev.descripcion) {
              const desc = String(ev.descripcion).slice(0, 23);
              doc.fillColor(COLORS.text).fontSize(6)
                 .text(desc, evX, rowStartY + evH + 12, { width: evW, lineBreak: false });
            }
          });

          doc.y = rowBottomY + 4;
          doc.moveDown(0.3);
        }

        doc.moveTo(40, doc.y).lineTo(40 + W, doc.y)
           .strokeColor(COLORS.border).lineWidth(0.5).stroke();
        doc.moveDown(0.4);
      });
    }

    // ── CAPTURAS DE PANTALLA ─────────────────────────────────────
    if (capturas.length > 0) {
      seccion(doc, `Capturas de Pantalla (${capturas.length})`);

      const capW = 110, capH = 75, capGap = 8;
      const perRow = Math.floor((W + capGap) / (capW + capGap));
      let capX = 40, capY = doc.y;

      capturas.forEach((cap, ci) => {
        if (ci > 0 && ci % perRow === 0) {
          capY += capH + capGap + 14;
          capX = 40;
          if (capY > doc.page.height - 100) { doc.addPage(); capY = 40; }
        }
        const filePath = path.join(UPLOADS_ROOT, cap.ruta_archivo);
        tryImage(doc, filePath, capX, capY, capW, capH);
        doc.fillColor(COLORS.secondary).fontSize(6.5).font('Helvetica')
           .text(fmtHora(cap.capturado_en), capX, capY + capH + 2, { width: capW, align: 'center', lineBreak: false });
        capX += capW + capGap;
      });
      doc.y = capY + capH + 16;
      doc.moveDown(0.3);
    }

    // ── PAUSAS E INACTIVIDADES ───────────────────────────────────
    if (pausas.length > 0) {
      seccion(doc, `Pausas (${pausas.length})`);
      pausas.forEach(p => {
        if (doc.y > doc.page.height - 40) doc.addPage();
        doc.fillColor(COLORS.text).fontSize(8).font('Helvetica')
           .text(`${fmtHora(p.hora_inicio)} – ${p.hora_fin ? fmtHora(p.hora_fin) : '...'}  ·  ${fmtDuracion(p.duracion_min)}  ·  ${p.tipo}${p.motivo ? '  – ' + p.motivo : ''}`,
                 46, doc.y, { width: W - 12 });
        doc.moveDown(0.25);
      });
    }

    if (inactividades.length > 0) {
      seccion(doc, `Inactividades (${inactividades.length})`);
      inactividades.forEach(inac => {
        if (doc.y > doc.page.height - 40) doc.addPage();
        doc.fillColor(COLORS.danger).fontSize(8).font('Helvetica')
           .text(`${fmtHora(inac.hora_inicio)} – ${inac.hora_fin ? fmtHora(inac.hora_fin) : '...'}  ·  ${fmtDuracion(inac.tiempo_min)}`,
                 46, doc.y, { width: W - 12 });
        doc.moveDown(0.25);
      });
    }

    // ── PIE DE PÁGINA ────────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc.fillColor(COLORS.secondary).fontSize(7)
         .text(`Página ${i + 1} de ${pages.count}`,
               40, doc.page.height - 30, { width: W, align: 'right' });
    }

    doc.end();
  });
};

module.exports = { generateReportePDF };
