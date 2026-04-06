import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { JornadaService } from '../../../core/services/jornada.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { DepartamentoService } from '../../../core/services/departamento.service';
import { AuthService } from '../../../core/services/auth.service';
import { RolPipe } from '../../../shared/pipes/rol.pipe';

@Component({
  selector: 'app-jornadas-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RolPipe],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Jornadas</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Historial de jornadas registradas</p>
      </div>

      <!-- Filtros -->
      <div class="card p-4 flex flex-wrap gap-4 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha inicio</label>
          <input type="date" [(ngModel)]="filtroFechaInicio" class="form-input text-sm">
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha fin</label>
          <input type="date" [(ngModel)]="filtroFechaFin" class="form-input text-sm">
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Estado</label>
          <select [(ngModel)]="filtroEstado" class="form-input text-sm min-w-[140px]">
            <option value="">Todos</option>
            <option value="activa">Activa</option>
            <option value="pausada">Pausada</option>
            <option value="finalizada">Finalizada</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
        @if (puedeVerFiltrosDpto()) {
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Departamento</label>
            <select [(ngModel)]="filtroDepartamento" [disabled]="isJefeDepartamento()" class="form-input text-sm min-w-[160px] disabled:opacity-60 disabled:cursor-not-allowed">
              @if (isAdminOrSupervisor()) {
                <option value="">Todos</option>
              }
              @for (d of departamentos(); track d.id) {
                <option [value]="d.id">{{ d.nombre }}</option>
              }
            </select>
          </div>
        }
        @if (isAdminOrSupervisor()) {
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Empleado</label>
            <select [(ngModel)]="filtroUsuario" class="form-input text-sm min-w-[180px]">
              <option value="">Todos</option>
              @for (u of usuarios(); track u.id) {
                <option [value]="u.id">{{ u.nombre }} {{ u.apellido }}</option>
              }
            </select>
          </div>
        }
        <div class="flex gap-2">
          <button (click)="buscar()" class="btn-primary text-sm">Buscar</button>
          <button (click)="limpiar()" class="btn-secondary text-sm">Limpiar</button>
        </div>
        <span class="ml-auto text-xs text-gray-500 dark:text-gray-400 self-center">
          {{ pagination()?.total ?? 0 }} jornadas encontradas
        </span>
      </div>

      <!-- Cargando -->
      @if (cargando()) {
        <div class="text-center py-12">
          <svg class="animate-spin h-8 w-8 mx-auto text-primary-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-500 dark:text-gray-400">Cargando jornadas...</p>
        </div>
      }

      @if (error()) {
        <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {{ error() }}
        </div>
      }

      <!-- Tabla -->
      @if (!cargando() && jornadas() !== null) {
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Usuario</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Rol</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Departamento</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Fecha</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Horario</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Duración</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                @for (jornada of jornadas()!; track jornada.id) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="px-4 py-3">
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ jornada.usuario_nombre }} {{ jornada.usuario_apellido }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                          {{ formatFecha(jornada.fecha) }}
                        </p>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {{ jornada.usuario_rol | rol }}
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {{ jornada.departamento_nombre ?? '—' }}
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      {{ formatFecha(jornada.fecha) }}
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {{ formatHora(jornada.hora_inicio) }}-{{ jornada.hora_fin ? formatHora(jornada.hora_fin) : '...' }}
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {{ formatDuration(jornada.duracion_neta_min ?? jornada.duracion_total_min) }}
                    </td>
                    <td class="px-4 py-3">
                      <span [class]="estadoClass(jornada.estado)">{{ jornada.estado }}</span>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <a [routerLink]="['/jornada', jornada.id, 'reporte']"
                         class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium
                                bg-primary-50 text-primary-700 hover:bg-primary-100
                                dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40 transition-colors whitespace-nowrap">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <span class="hidden sm:inline">Ver</span>
                      </a>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="px-4 py-12 text-center text-gray-400">
                      <p class="text-lg mb-1">Sin jornadas registradas</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Paginación -->
        @if ((pagination()?.pages ?? 0) > 1) {
          <div class="flex items-center justify-center gap-2">
            <button [disabled]="paginaActual() <= 1"
                    (click)="cambiarPagina(paginaActual() - 1)"
                    class="btn-secondary text-sm disabled:opacity-50">Anterior</button>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Página {{ paginaActual() }} de {{ pagination()?.pages }}
            </span>
            <button [disabled]="paginaActual() >= (pagination()?.pages ?? 1)"
                    (click)="cambiarPagina(paginaActual() + 1)"
                    class="btn-secondary text-sm disabled:opacity-50">Siguiente</button>
          </div>
        }
      }
    </div>
  `,
})
export class JornadasListComponent implements OnInit {
  private jornadaService      = inject(JornadaService);
  private usuarioService      = inject(UsuarioService);
  private departamentoService = inject(DepartamentoService);
  private auth                = inject(AuthService);
  private destroyRef          = inject(DestroyRef);

  jornadas       = signal<any[] | null>(null);
  usuarios       = signal<any[]>([]);
  departamentos  = signal<any[]>([]);
  pagination     = signal<any>(null);
  paginaActual = signal(1);
  cargando     = signal(false);
  error        = signal('');

  isAdminOrSupervisor  = computed(() => this.auth.hasRole('admin') || this.auth.hasRole('supervisor'));
  isJefeDepartamento   = computed(() => this.auth.hasRole('jefe_departamento'));
  puedeVerFiltrosDpto  = computed(() => this.isAdminOrSupervisor() || this.isJefeDepartamento());

  filtroFechaInicio  = this.firstDayOfMonth();
  filtroFechaFin     = this.today();
  filtroEstado       = '';
  filtroUsuario      = '';
  filtroDepartamento = '';

  ngOnInit() {
    if (this.isAdminOrSupervisor()) {
      this.usuarioService.getAll({ page: 1, limit: 200, estado: 'activo' }).subscribe({
        next: (r: any) => { if (r.success) this.usuarios.set(r.data ?? []); },
      });
      this.departamentoService.getAll().subscribe({
        next: (r: any) => { if (r.success) this.departamentos.set(r.data ?? []); },
      });
    } else if (this.isJefeDepartamento()) {
      // Pre-fijar el filtro al departamento del jefe (el backend lo fuerza igualmente)
      const deptId = this.auth.currentUser()?.departamento_id;
      if (deptId) this.filtroDepartamento = String(deptId);
      this.departamentoService.getAll().subscribe({
        next: (r: any) => { if (r.success) this.departamentos.set(r.data ?? []); },
      });
    }
    this.buscar();

    // Refrescar la página actual cuando un admin reactiva una jornada de otro día
    this.jornadaService.jornadaHistorialUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.buscar(this.paginaActual()));
  }

  buscar(pagina = 1) {
    this.cargando.set(true);
    this.error.set('');
    this.paginaActual.set(pagina);

    const params: any = { page: pagina, limit: 50 };
    if (this.filtroFechaInicio)  params.fecha_inicio    = this.filtroFechaInicio;
    if (this.filtroFechaFin)     params.fecha_fin       = this.filtroFechaFin;
    if (this.filtroEstado)       params.estado          = this.filtroEstado;
    if (this.filtroUsuario)      params.usuario_id      = this.filtroUsuario;
    if (this.filtroDepartamento) params.departamento_id = this.filtroDepartamento;

    this.jornadaService.getHistorial(params).subscribe({
      next: (r) => {
        this.jornadas.set(r.data ?? []);
        this.pagination.set(r.pagination ?? null);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Error al cargar jornadas');
        this.cargando.set(false);
      },
    });
  }

  limpiar() {
    this.filtroFechaInicio  = '';
    this.filtroFechaFin     = '';
    this.filtroEstado       = '';
    this.filtroUsuario      = '';
    this.filtroDepartamento = '';
    this.buscar();
  }

  cambiarPagina(pagina: number) { this.buscar(pagina); }

  estadoClass(estado: string): string {
    const classes: Record<string, string> = {
      activa:     'badge-activo',
      pausada:    'badge-pausado',
      finalizada: 'badge-finalizado',
      anulada:    'badge-inactivo',
    };
    return classes[estado] ?? 'badge-finalizado';
  }

  formatDuration(minutes?: number): string {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  formatFecha(fecha: any): string {
    if (!fecha) return '-';
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatHora(hora: any): string {
    if (!hora) return '-';
    const date = typeof hora === 'string' ? new Date(hora) : hora;
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  private today() { return new Date().toISOString().slice(0, 10); }
  private firstDayOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
}
