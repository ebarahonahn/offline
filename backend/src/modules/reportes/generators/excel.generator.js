const ExcelJS = require('exceljs');
const { formatDuration } = require('../../../utils/date.util');

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: {
    bottom: { style: 'thin', color: { argb: 'FF4F46E5' } },
  },
};

const generateJornadasExcel = async (data, filters) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema Teletrabajo';
  wb.created = new Date();

  const ws = wb.addWorksheet('Jornadas', { views: [{ state: 'frozen', ySplit: 3 }] });

  // Título
  ws.mergeCells('A1:I1');
  ws.getCell('A1').value = 'REPORTE DE JORNADAS LABORALES';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:I2');
  ws.getCell('A2').value = `Período: ${filters.fecha_inicio} al ${filters.fecha_fin}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } };

  // Headers
  const headers = ['Empleado', 'Email', 'Departamento', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Horas Trabajadas', 'Pausas', 'Estado'];
  const widths  = [25, 28, 20, 12, 12, 12, 18, 12, 12];

  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, HEADER_STYLE);
  });
  headerRow.height = 22;
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Datos
  data.forEach((row, idx) => {
    const r = ws.addRow([
      row.empleado,
      row.email,
      row.departamento || 'N/A',
      row.fecha,
      row.hora_inicio ? new Date(row.hora_inicio).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '-',
      row.hora_fin    ? new Date(row.hora_fin).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '-',
      formatDuration(row.duracion_min),
      formatDuration(row.pausas_min),
      row.estado,
    ]);

    // Zebra striping
    if (idx % 2 === 0) {
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      });
    }

    // Color estado
    const estadoCell = r.getCell(9);
    const colors = { finalizada: 'FF10B981', activa: 'FF3B82F6', pausada: 'FFF59E0B', anulada: 'FFEF4444' };
    estadoCell.font = { color: { argb: colors[row.estado] || 'FF6B7280' }, bold: true };
  });

  // Totales
  ws.addRow([]);
  const totRow = ws.addRow(['TOTAL REGISTROS:', data.length, '', '', '', '', '', '', '']);
  totRow.getCell(1).font = { bold: true };

  return wb.xlsx.writeBuffer();
};

module.exports = { generateJornadasExcel };
