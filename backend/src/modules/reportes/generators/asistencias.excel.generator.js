const ExcelJS = require('exceljs');
const { formatDuration } = require('../../../utils/date.util');

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: { bottom: { style: 'thin', color: { argb: 'FF4F46E5' } } },
};

const generateAsistenciasExcel = async ({ empleados, dias_habiles }, filters) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema Teletrabajo';
  wb.created = new Date();

  // ── Hoja resumen ──────────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Asistencias', { views: [{ state: 'frozen', ySplit: 3 }] });

  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'REPORTE DE ASISTENCIAS POR EMPLEADO';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `Período: ${filters.fecha_inicio} al ${filters.fecha_fin}   |   Días hábiles: ${dias_habiles}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } };

  const headers = ['Empleado', 'Email', 'Departamento', 'Días Presentes', 'Días Ausentes', 'Días Hábiles', '% Asistencia', 'Total Horas'];
  const widths  = [28, 30, 22, 16, 15, 15, 15, 15];

  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, HEADER_STYLE);
  });
  headerRow.height = 22;
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  empleados.forEach((emp, idx) => {
    const r = ws.addRow([
      emp.empleado,
      emp.email,
      emp.departamento || 'N/A',
      emp.dias_presentes,
      emp.dias_ausentes,
      emp.dias_habiles,
      emp.porcentaje / 100,          // Excel lo muestra como porcentaje
      emp.total_min / 60,            // Excel lo muestra como horas
    ]);

    // Formato numérico
    r.getCell(7).numFmt = '0%';
    r.getCell(8).numFmt = '0.0"h"';

    // Color % asistencia
    const pct = emp.porcentaje;
    const pctColor = pct >= 90 ? 'FF10B981' : pct >= 70 ? 'FFF59E0B' : 'FFEF4444';
    r.getCell(7).font = { color: { argb: pctColor }, bold: true };

    // Color días ausentes
    if (emp.dias_ausentes > 0) {
      r.getCell(5).font = { color: { argb: 'FFEF4444' } };
    }

    // Zebra
    if (idx % 2 === 0) {
      r.eachCell(cell => {
        if (!cell.font?.color) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      });
    }
  });

  // Totales
  ws.addRow([]);
  const totRow = ws.addRow([
    'TOTALES',
    '',
    '',
    empleados.reduce((s, e) => s + e.dias_presentes, 0),
    empleados.reduce((s, e) => s + e.dias_ausentes, 0),
    '',
    '',
    '',
  ]);
  totRow.font = { bold: true };

  // ── Hoja detalle de jornadas ──────────────────────────────────────────────
  const wd = wb.addWorksheet('Detalle Jornadas', { views: [{ state: 'frozen', ySplit: 1 }] });

  const dHeaders = ['Empleado', 'Departamento', 'Fecha', 'Estado', 'Hora Inicio', 'Hora Fin', 'Duración'];
  const dWidths  = [28, 22, 14, 12, 12, 12, 14];
  const dRow = wd.getRow(1);
  dHeaders.forEach((h, i) => {
    const cell = dRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, HEADER_STYLE);
  });
  dRow.height = 22;
  dWidths.forEach((w, i) => { wd.getColumn(i + 1).width = w; });

  let dIdx = 0;
  for (const emp of empleados) {
    for (const j of emp.jornadas) {
      const r = wd.addRow([
        emp.empleado,
        emp.departamento || 'N/A',
        j.fecha,
        j.estado,
        j.hora_inicio ? new Date(j.hora_inicio).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '-',
        j.hora_fin    ? new Date(j.hora_fin).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '-',
        formatDuration(j.duracion_min),
      ]);
      const colors = { finalizada: 'FF10B981', activa: 'FF3B82F6', pausada: 'FFF59E0B' };
      r.getCell(4).font = { color: { argb: colors[j.estado] || 'FF6B7280' }, bold: true };
      if (dIdx % 2 === 0) {
        r.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        });
      }
      dIdx++;
    }
  }

  return wb.xlsx.writeBuffer();
};

module.exports = { generateAsistenciasExcel };
