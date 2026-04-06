const ExcelJS = require('exceljs');
const { ETIQUETAS_ACCION } = require('../auditoria.service');

const HEADER_STYLE = {
  font:      { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  border:    { bottom: { style: 'thin', color: { argb: 'FF4F46E5' } } },
};

const formatJson = (json) => {
  if (!json) return '';
  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' | ');
  } catch { return String(json); }
};

const generateAuditoriaExcel = async (data, filters) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema Teletrabajo';
  wb.created = new Date();

  const ws = wb.addWorksheet('Bitácora', { views: [{ state: 'frozen', ySplit: 3 }] });

  // Título
  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = 'BITÁCORA DE AUDITORÍA DEL SISTEMA';
  ws.getCell('A1').font  = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  // Subtítulo con filtros aplicados
  const partes = [];
  if (filters.fecha_inicio && filters.fecha_fin)
    partes.push(`Período: ${filters.fecha_inicio} al ${filters.fecha_fin}`);
  if (filters.accion)  partes.push(`Acción: ${ETIQUETAS_ACCION[filters.accion] || filters.accion}`);
  if (filters.entidad) partes.push(`Entidad: ${filters.entidad}`);
  partes.push(`Generado: ${new Date().toLocaleString('es')}`);

  ws.mergeCells('A2:J2');
  ws.getCell('A2').value = partes.join('   |   ');
  ws.getCell('A2').font  = { italic: true, color: { argb: 'FF6B7280' } };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  // Cabeceras
  const headers = ['Fecha / Hora', 'Usuario', 'Email', 'Rol', 'Acción', 'Entidad', 'ID Registro', 'Datos Anteriores', 'Datos Nuevos', 'IP'];
  const widths  = [20, 22, 28, 12, 28, 18, 12, 40, 40, 16];

  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, HEADER_STYLE);
  });
  headerRow.height = 24;
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Colores por tipo de acción
  const accionColor = (accion) => {
    if (accion.startsWith('DELETE_') || accion === 'LOGOUT') return { argb: 'FFFEF2F2' };
    if (accion.startsWith('CREATE_') || accion === 'LOGIN')  return { argb: 'FFF0FDF4' };
    if (accion.startsWith('UPDATE_') || accion.startsWith('TOGGLE_') || accion === 'REACTIVAR_JORNADA') return { argb: 'FFFEFCE8' };
    if (accion.startsWith('EXPORT_') || accion.startsWith('REPORTE_')) return { argb: 'FFEFF6FF' };
    return null;
  };

  // Filas de datos
  data.forEach((row, idx) => {
    const r = ws.addRow([
      row.created_at ? new Date(row.created_at).toLocaleString('es') : '',
      row.usuario_nombre || 'Sistema',
      row.usuario_email  || '',
      row.usuario_rol    || '',
      row.accion_label   || row.accion,
      row.entidad        || '',
      row.entidad_id     || '',
      formatJson(row.datos_ant),
      formatJson(row.datos_nue),
      row.ip             || '',
    ]);

    const bgColor = accionColor(row.accion);
    if (bgColor) {
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: bgColor };
      });
    } else if (idx % 2 === 0) {
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      });
    }

    r.getCell(8).alignment = { wrapText: true };
    r.getCell(9).alignment = { wrapText: true };
    r.height = 30;
  });

  // Total
  ws.addRow([]);
  const totRow = ws.addRow([`TOTAL REGISTROS: ${data.length}`]);
  totRow.getCell(1).font = { bold: true };

  return wb.xlsx.writeBuffer();
};

module.exports = { generateAuditoriaExcel };
