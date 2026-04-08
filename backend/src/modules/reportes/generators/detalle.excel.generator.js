const ExcelJS = require('exceljs');

const HEADER_STYLE = {
  font:      { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border:    { bottom: { style: 'thin', color: { argb: 'FF4F46E5' } } },
};

const fmtHora = (dt) => dt ? new Date(dt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDur  = (min) => {
  if (!min) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const generateDetalleExcel = async ({ emp, dias, presentes, ausentes, dias_habiles, porcentaje, total_min, total_extra_min, fecha_inicio, fecha_fin, hora_fin_jornada }) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema Teletrabajo';
  wb.created = new Date();

  const ws = wb.addWorksheet('Detalle Asistencia', { views: [{ state: 'frozen', ySplit: 5 }] });

  // ── Encabezado ────────────────────────────────────────────────────────────
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = 'DETALLE DE ASISTENCIA POR EMPLEADO';
  ws.getCell('A1').font  = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:G2');
  ws.getCell('A2').value = emp.empleado + (emp.departamento ? `  —  ${emp.departamento}` : '');
  ws.getCell('A2').font  = { bold: true, size: 11, color: { argb: 'FF111827' } };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.mergeCells('A3:G3');
  ws.getCell('A3').value = `Período: ${fecha_inicio} al ${fecha_fin}   |   Hora fin jornada: ${hora_fin_jornada || '17:00'}`;
  ws.getCell('A3').alignment = { horizontal: 'center' };
  ws.getCell('A3').font  = { italic: true, color: { argb: 'FF6B7280' } };

  // ── Fila resumen ──────────────────────────────────────────────────────────
  const resRow = ws.getRow(4);
  const resData = [
    `Presentes: ${presentes}`,
    `Ausentes: ${ausentes}`,
    `Días hábiles: ${dias_habiles}`,
    `% Asistencia: ${porcentaje}%`,
    `Total horas: ${fmtDur(total_min)}`,
    `Tiempo extra: ${fmtDur(total_extra_min)}`,
    '',
  ];
  resData.forEach((v, i) => {
    const cell = resRow.getCell(i + 1);
    cell.value = v;
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: i === 5 && total_extra_min > 0 ? 'FFFFF7ED' : 'FFE8E7FF' } };
    cell.font  = { bold: true, color: { argb: i === 5 && total_extra_min > 0 ? 'FFD97706' : 'FF4F46E5' }, size: 10 };
    cell.alignment = { horizontal: 'center' };
  });
  resRow.height = 20;

  // ── Headers tabla ─────────────────────────────────────────────────────────
  const headers = ['Fecha', 'Día', 'Estado', 'Hora Inicio', 'Hora Fin', 'Duración', 'Tiempo Extra'];
  const widths  = [14, 12, 14, 14, 14, 14, 16];
  const hRow = ws.getRow(5);
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, HEADER_STYLE);
  });
  hRow.height = 22;
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ── Filas de datos ────────────────────────────────────────────────────────
  const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  dias.forEach((dia, idx) => {
    const tieneExtra = dia.tipo === 'presente' && dia.tiempo_extra_min > 0;
    const r = ws.addRow([
      dia.fecha,
      DIAS_ES[dia.dow],
      dia.tipo === 'presente' ? dia.estado : dia.tipo === 'ausente' ? 'Ausente' : 'Fin de semana',
      dia.tipo === 'presente' ? fmtHora(dia.hora_inicio)           : '—',
      dia.tipo === 'presente' ? fmtHora(dia.hora_fin)              : '—',
      dia.tipo === 'presente' ? fmtDur(dia.duracion_min)           : '—',
      dia.tipo === 'presente' ? fmtDur(dia.tiempo_extra_min) || '—' : '—',
    ]);

    if (dia.tipo === 'finde') {
      r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; });
      r.font = { color: { argb: 'FF9CA3AF' } };
    } else if (dia.tipo === 'ausente') {
      r.getCell(3).font = { color: { argb: 'FFEF4444' }, bold: true };
      if (idx % 2 === 0) r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F1' } }; });
    } else {
      const estadoColors = { finalizada: 'FF10B981', activa: 'FF3B82F6', pausada: 'FFF59E0B' };
      r.getCell(3).font = { color: { argb: estadoColors[dia.estado] || 'FF6B7280' }, bold: true };
      if (tieneExtra) r.getCell(7).font = { color: { argb: 'FFD97706' }, bold: true };
      if (idx % 2 === 0) r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; });
    }
  });

  return wb.xlsx.writeBuffer();
};

module.exports = { generateDetalleExcel };
