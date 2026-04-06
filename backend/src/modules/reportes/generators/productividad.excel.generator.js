const ExcelJS = require('exceljs');
const { formatDuration } = require('../../../utils/date.util');

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: { bottom: { style: 'thin', color: { argb: 'FF4F46E5' } } },
};

const generateProductividadExcel = async (data, filters) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema Teletrabajo';
  wb.created = new Date();

  const ws = wb.addWorksheet('Productividad', { views: [{ state: 'frozen', ySplit: 3 }] });

  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'REPORTE DE PRODUCTIVIDAD';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `Período: ${filters.fecha_inicio} al ${filters.fecha_fin}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } };

  const headers = ['Empleado', 'Departamento', 'Jornadas', 'Total Trabajado', 'Promedio/Jornada', 'Inactividad', 'Actividades', 'Eficiencia'];
  const widths  = [25, 20, 10, 18, 18, 14, 14, 12];

  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, HEADER_STYLE);
  });
  headerRow.height = 22;
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  data.forEach((row, idx) => {
    const trabajadoNeto = Math.max(0, (row.total_trabajado_min || 0) - (row.inactividad_min || 0));
    const eficiencia = row.total_trabajado_min > 0
      ? Math.round((trabajadoNeto / row.total_trabajado_min) * 100)
      : 0;

    const r = ws.addRow([
      row.empleado,
      row.departamento || 'N/A',
      row.jornadas,
      formatDuration(row.total_trabajado_min),
      formatDuration(row.promedio_min),
      formatDuration(row.inactividad_min),
      row.actividades,
      `${eficiencia}%`,
    ]);

    if (idx % 2 === 0) {
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      });
    }

    const efCell = r.getCell(8);
    const color = eficiencia >= 80 ? 'FF10B981' : eficiencia >= 60 ? 'FFF59E0B' : 'FFEF4444';
    efCell.font = { bold: true, color: { argb: color } };
  });

  ws.addRow([]);
  const totRow = ws.addRow(['TOTAL EMPLEADOS:', data.length]);
  totRow.getCell(1).font = { bold: true };

  return wb.xlsx.writeBuffer();
};

module.exports = { generateProductividadExcel };
