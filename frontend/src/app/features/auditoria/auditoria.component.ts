import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService, RegistroAuditoria } from '../../core/services/auditoria.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { RolPipe } from '../../shared/pipes/rol.pipe';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, RolPipe],
  template: `
    <div class="space-y-5">

      <!-- Encabezado -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Bitácora de Auditoría</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Registro completo de acciones realizadas en el sistema</p>
        </div>
        <div class="flex gap-2">
          <button (click)="exportar('excel')" [disabled]="exportando()"
                  class="btn-secondary text-sm flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Excel
          </button>
          <button (click)="exportar('pdf')" [disabled]="exportando()"
                  class="btn-secondary text-sm flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            PDF
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card p-4">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha inicio</label>
            <input type="date" [(ngModel)]="filtros.fecha_inicio" class="form-input text-sm">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha fin</label>
            <input type="date" [(ngModel)]="filtros.fecha_fin" class="form-input text-sm">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Usuario</label>
            <select [(ngModel)]="filtros.usuario_id" class="form-input text-sm">
              <option value="">Todos</option>
              @for (u of usuarios(); track u.id) {
                <option [value]="u.id">{{ u.nombre }} {{ u.apellido }}</option>
              }
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Acción</label>
            <select [(ngModel)]="filtros.accion" class="form-input text-sm">
              <option value="">Todas</option>
              @for (op of opcionesAccion(); track op.valor) {
                <option [value]="op.valor">{{ op.label }}</option>
              }
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Entidad</label>
            <select [(ngModel)]="filtros.entidad" class="form-input text-sm">
              <option value="">Todas</option>
              @for (e of opcionesEntidad(); track e) {
                <option [value]="e">{{ e }}</option>
              }
            </select>
          </div>
          <div class="flex gap-2">
            <button (click)="buscar()" class="btn-primary text-sm flex-1">Buscar</button>
            <button (click)="limpiar()" class="btn-secondary text-sm px-3">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {{ pagination()?.total ?? 0 }} registros encontrados
        </p>
      </div>

      <!-- Tabla -->
      <div class="card overflow-hidden">
        @if (cargando()) {
          <div class="flex justify-center py-14">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
          </div>
        } @else if (registros().length === 0) {
          <div class="py-14 text-center text-sm text-gray-400">Sin registros para los filtros seleccionados</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha / Hora</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Usuario</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Acción</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Entidad</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Datos anteriores</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Datos nuevos</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">IP</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                @for (reg of registros(); track reg.id) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {{ formatFecha(reg.created_at) }}
                    </td>
                    <td class="px-4 py-3">
                      @if (reg.usuario_nombre) {
                        <p class="text-sm font-medium text-gray-900 dark:text-white">{{ reg.usuario_nombre }}</p>
                        <p class="text-xs text-gray-400">{{ reg.usuario_rol | rol }}</p>
                      } @else {
                        <span class="text-xs text-gray-400 italic">Sistema</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      <span [class]="badgeAccion(reg.accion)" class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
                        {{ reg.accion_label }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      @if (reg.entidad) {
                        <span class="font-mono">{{ reg.entidad }}</span>
                        @if (reg.entidad_id) {
                          <span class="ml-1 text-gray-400">#{{ reg.entidad_id }}</span>
                        }
                      } @else {
                        <span class="text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                    <td class="px-4 py-3 max-w-[200px]">
                      @if (reg.datos_ant) {
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate font-mono"
                           [title]="jsonStr(reg.datos_ant)">
                          {{ jsonResumen(reg.datos_ant) }}
                        </p>
                      } @else {
                        <span class="text-xs text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                    <td class="px-4 py-3 max-w-[200px]">
                      @if (reg.datos_nue) {
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate font-mono"
                           [title]="jsonStr(reg.datos_nue)">
                          {{ jsonResumen(reg.datos_nue) }}
                        </p>
                      } @else {
                        <span class="text-xs text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{{ reg.ip || '—' }}</td>
                    <td class="px-4 py-3">
                      <button (click)="verDetalle(reg)" title="Ver detalle"
                              class="rounded p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          @if ((pagination()?.pages ?? 0) > 1) {
            <div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-3">
              <span class="text-xs text-gray-500 dark:text-gray-400">
                Página {{ pagination()?.page }} de {{ pagination()?.pages }}
                ({{ pagination()?.total }} registros)
              </span>
              <div class="flex gap-2">
                <button [disabled]="(pagination()?.page ?? 1) <= 1"
                        (click)="cambiarPagina((pagination()?.page ?? 1) - 1)"
                        class="btn-secondary text-sm disabled:opacity-50">Anterior</button>
                <button [disabled]="(pagination()?.page ?? 1) >= (pagination()?.pages ?? 1)"
                        (click)="cambiarPagina((pagination()?.page ?? 1) + 1)"
                        class="btn-secondary text-sm disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- Modal detalle -->
    @if (registroDetalle()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
           (click)="registroDetalle.set(null)">
        <div class="card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Detalle de registro</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ formatFecha(registroDetalle()!.created_at) }}
              </p>
            </div>
            <button (click)="registroDetalle.set(null)"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Info general -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usuario</p>
                <p class="text-sm text-gray-900 dark:text-white">{{ registroDetalle()!.usuario_nombre || 'Sistema' }}</p>
                @if (registroDetalle()!.usuario_email) {
                  <p class="text-xs text-gray-400">{{ registroDetalle()!.usuario_email }}</p>
                }
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Acción</p>
                <span [class]="badgeAccion(registroDetalle()!.accion)"
                      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {{ registroDetalle()!.accion_label }}
                </span>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Entidad</p>
                <p class="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {{ registroDetalle()!.entidad || '—' }}
                  @if (registroDetalle()!.entidad_id) {
                    <span class="text-gray-400"> #{{ registroDetalle()!.entidad_id }}</span>
                  }
                </p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">IP</p>
                <p class="text-sm font-mono text-gray-700 dark:text-gray-300">{{ registroDetalle()!.ip || '—' }}</p>
              </div>
            </div>

            <!-- Datos anteriores -->
            @if (registroDetalle()!.datos_ant) {
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Datos anteriores</p>
                <pre class="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-48 whitespace-pre-wrap">{{ jsonStr(registroDetalle()!.datos_ant) }}</pre>
              </div>
            }

            <!-- Datos nuevos -->
            @if (registroDetalle()!.datos_nue) {
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Datos nuevos</p>
                <pre class="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-3 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-48 whitespace-pre-wrap">{{ jsonStr(registroDetalle()!.datos_nue) }}</pre>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class AuditoriaComponent implements OnInit {
  private svc = inject(AuditoriaService);
  private us  = inject(UsuarioService);

  registros       = signal<RegistroAuditoria[]>([]);
  pagination      = signal<any>(null);
  usuarios        = signal<any[]>([]);
  opcionesAccion  = signal<{ valor: string; label: string }[]>([]);
  opcionesEntidad = signal<string[]>([]);
  cargando        = signal(false);
  exportando      = signal(false);
  registroDetalle = signal<RegistroAuditoria | null>(null);

  filtros = {
    fecha_inicio: '',
    fecha_fin:    '',
    usuario_id:   '',
    accion:       '',
    entidad:      '',
  };

  ngOnInit() {
    // Fechas por defecto: último mes
    const hoy   = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.filtros.fecha_inicio = inicio.toISOString().slice(0, 10);
    this.filtros.fecha_fin    = hoy.toISOString().slice(0, 10);

    this.us.getAll({ page: 1, limit: 200 }).subscribe({
      next: (r: any) => { if (r.success) this.usuarios.set(r.data ?? []); },
    });

    this.svc.getOpciones().subscribe({
      next: (r: any) => {
        if (r.success) {
          this.opcionesAccion.set(r.data.acciones ?? []);
          this.opcionesEntidad.set(r.data.entidades ?? []);
        }
      },
    });

    this.buscar();
  }

  buscar(pagina = 1) {
    this.cargando.set(true);
    const params: any = { page: pagina, limit: 25 };
    if (this.filtros.fecha_inicio) params.fecha_inicio = this.filtros.fecha_inicio;
    if (this.filtros.fecha_fin)    params.fecha_fin    = this.filtros.fecha_fin;
    if (this.filtros.usuario_id)   params.usuario_id   = this.filtros.usuario_id;
    if (this.filtros.accion)       params.accion       = this.filtros.accion;
    if (this.filtros.entidad)      params.entidad      = this.filtros.entidad;

    this.svc.getAll(params).subscribe({
      next: (r: any) => {
        this.registros.set(r.data ?? []);
        this.pagination.set(r.pagination ?? null);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  limpiar() {
    this.filtros.fecha_inicio = '';
    this.filtros.fecha_fin    = '';
    this.filtros.usuario_id   = '';
    this.filtros.accion       = '';
    this.filtros.entidad      = '';
    this.buscar();
  }

  cambiarPagina(p: number) { this.buscar(p); }

  exportar(tipo: 'excel' | 'pdf') {
    this.exportando.set(true);
    const params: any = {};
    if (this.filtros.fecha_inicio) params.fecha_inicio = this.filtros.fecha_inicio;
    if (this.filtros.fecha_fin)    params.fecha_fin    = this.filtros.fecha_fin;
    if (this.filtros.usuario_id)   params.usuario_id   = this.filtros.usuario_id;
    if (this.filtros.accion)       params.accion       = this.filtros.accion;
    if (this.filtros.entidad)      params.entidad      = this.filtros.entidad;

    const req = tipo === 'excel' ? this.svc.exportExcel(params) : this.svc.exportPDF(params);
    const ext  = tipo === 'excel' ? 'xlsx' : 'pdf';
    const mime = tipo === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    req.subscribe({
      next: (blob: Blob) => {
        const url  = URL.createObjectURL(new Blob([blob], { type: mime }));
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `bitacora_${new Date().toISOString().slice(0, 10)}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportando.set(false);
      },
      error: () => this.exportando.set(false),
    });
  }

  verDetalle(reg: RegistroAuditoria) { this.registroDetalle.set(reg); }

  badgeAccion(accion: string): string {
    if (accion.startsWith('DELETE_'))                          return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (accion.startsWith('CREATE_'))                          return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (accion.startsWith('UPDATE_') || accion.startsWith('TOGGLE_') || accion === 'REACTIVAR_JORNADA' || accion === 'ESTADO_USUARIO' || accion === 'APROBAR_ACTIVIDAD') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (accion === 'LOGIN')                                    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (accion === 'LOGOUT')                                   return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    if (accion.startsWith('EXPORT_') || accion.startsWith('REPORTE_')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }

  jsonStr(data: any): string {
    if (!data) return '';
    try {
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      return JSON.stringify(obj, null, 2);
    } catch { return String(data); }
  }

  jsonResumen(data: any): string {
    if (!data) return '';
    try {
      const obj   = typeof data === 'string' ? JSON.parse(data) : data;
      const keys  = Object.keys(obj).slice(0, 3);
      const partes = keys.map(k => `${k}: ${String(obj[k]).slice(0, 18)}`);
      return partes.join(' · ') + (Object.keys(obj).length > 3 ? ' …' : '');
    } catch { return String(data).slice(0, 60); }
  }

  formatFecha(dt: string): string {
    return new Date(dt).toLocaleString('es', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
}
