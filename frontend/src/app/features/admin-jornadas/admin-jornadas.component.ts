import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { JornadaService } from '../../core/services/jornada.service';
import { UsuarioService } from '../../core/services/usuario.service';

@Component({
  selector: 'app-admin-jornadas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Jornadas</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Busca y reactiva jornadas finalizadas incorrectamente</p>
      </div>

      <!-- Filtros -->
      <div class="card p-5">
        <form [formGroup]="filterForm" (ngSubmit)="buscar()" class="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label class="form-label">Fecha inicio</label>
            <input type="date" formControlName="fecha_inicio" class="form-input">
          </div>
          <div>
            <label class="form-label">Fecha fin</label>
            <input type="date" formControlName="fecha_fin" class="form-input">
          </div>
          <div>
            <label class="form-label">Estado</label>
            <select formControlName="estado" class="form-input">
              <option value="">Todos</option>
              <option value="finalizada">Finalizada</option>
              <option value="activa">Activa</option>
              <option value="pausada">Pausada</option>
            </select>
          </div>
          <div>
            <label class="form-label">Usuario</label>
            <select formControlName="usuario_id" class="form-input">
              <option value="">Todos</option>
              @for (u of usuarios(); track u.id) {
                <option [value]="u.id">{{ u.nombre }} {{ u.apellido }}</option>
              }
            </select>
          </div>
          <div class="sm:col-span-4 flex gap-3">
            <button type="submit" class="btn-primary" [disabled]="loading()">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {{ loading() ? 'Buscando...' : 'Buscar' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Error -->
      @if (errorMsg()) {
        <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {{ errorMsg() }}
        </div>
      }

      <!-- Resultados -->
      @if (jornadas().length > 0) {
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Jornadas</h2>
            <span class="text-sm text-gray-500">{{ jornadas().length }} registros</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                @for (j of jornadas(); track j.id) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {{ j.usuario_nombre }} {{ j.usuario_apellido }}
                    </td>
                    <td class="px-4 py-3 text-gray-500">{{ j.fecha }}</td>
                    <td class="px-4 py-3 text-gray-500">{{ formatTime(j.hora_inicio) }}</td>
                    <td class="px-4 py-3 text-gray-500">{{ j.hora_fin ? formatTime(j.hora_fin) : '—' }}</td>
                    <td class="px-4 py-3 font-medium text-emerald-600">{{ formatDuration(j.duracion_total_min) }}</td>
                    <td class="px-4 py-3">
                      <span [class]="estadoBadge(j.estado)">{{ j.estado }}</span>
                    </td>
                    <td class="px-4 py-3">
                      @if (j.estado === 'finalizada') {
                        <button
                          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 disabled:opacity-40 transition-colors"
                          [disabled]="reactivando() === j.id"
                          (click)="pedirConfirmacion(j)"
                          title="Reactivar esta jornada">
                          @if (reactivando() === j.id) {
                            <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            Reactivando...
                          } @else {
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                            Reactivar
                          }
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          @if (totalPages() > 1) {
            <div class="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-sm text-gray-500">
              <span>Página {{ page() }} de {{ totalPages() }}</span>
              <div class="flex gap-2">
                <button class="btn-secondary py-1 px-3 text-xs" [disabled]="page() === 1" (click)="changePage(page() - 1)">Anterior</button>
                <button class="btn-secondary py-1 px-3 text-xs" [disabled]="page() === totalPages()" (click)="changePage(page() + 1)">Siguiente</button>
              </div>
            </div>
          }
        </div>
      } @else if (searched()) {
        <div class="card p-12 text-center text-gray-400">
          <p class="text-lg">No se encontraron jornadas con esos filtros</p>
        </div>
      }
    </div>

    <!-- Modal confirmación reactivar -->
    @if (jornadaAReactivar()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3 mb-4">
            <div class="rounded-full p-2 bg-amber-100 dark:bg-amber-900/30">
              <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Reactivar Jornada</h3>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            ¿Estás seguro de que deseas reactivar la jornada de:
          </p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {{ jornadaAReactivar()!.usuario_nombre }} {{ jornadaAReactivar()!.usuario_apellido }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Fecha: {{ jornadaAReactivar()!.fecha }} &nbsp;·&nbsp; Fin registrado: {{ formatTime(jornadaAReactivar()!.hora_fin) }}
          </p>
          <p class="text-xs text-amber-600 dark:text-amber-400 mb-5">
            El empleado podrá continuar registrando tiempo en esta jornada.
          </p>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" (click)="jornadaAReactivar.set(null)">Cancelar</button>
            <button class="btn-primary flex-1" (click)="confirmarReactivar()">Reactivar</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminJornadasComponent implements OnInit {
  private js = inject(JornadaService);
  private us = inject(UsuarioService);
  private fb = inject(FormBuilder);

  jornadas          = signal<any[]>([]);
  usuarios          = signal<any[]>([]);
  loading           = signal(false);
  searched          = signal(false);
  reactivando       = signal<number | null>(null);
  page              = signal(1);
  totalPages        = signal(1);
  errorMsg          = signal('');
  jornadaAReactivar = signal<any | null>(null);

  filterForm = this.fb.group({
    fecha_inicio: [this.today()],
    fecha_fin:    [this.today()],
    estado:       ['finalizada'],
    usuario_id:   [''],
  });

  ngOnInit() {
    this.us.getAll({ limit: 200 }).subscribe(r => { if (r.success) this.usuarios.set(r.data); });
    this.buscar();
  }

  buscar(p = 1) {
    this.loading.set(true);
    this.searched.set(true);
    this.errorMsg.set('');
    this.page.set(p);
    const { fecha_inicio, fecha_fin, estado, usuario_id } = this.filterForm.value;
    const params: any = { page: p, limit: 20 };
    if (fecha_inicio) params['fecha_inicio'] = fecha_inicio;
    if (fecha_fin)    params['fecha_fin']    = fecha_fin;
    if (estado)       params['estado']       = estado;
    if (usuario_id)   params['usuario_id']   = usuario_id;

    this.js.getHistorial(params).subscribe({
      next: (r: any) => {
        const hoy = this.today();
        this.jornadas.set((r.data ?? []).filter((j: any) => String(j.fecha).slice(0, 10) === hoy));
        this.totalPages.set(r.pagination?.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changePage(p: number) { this.buscar(p); }

  pedirConfirmacion(j: any) {
    this.errorMsg.set('');
    this.jornadaAReactivar.set(j);
  }

  confirmarReactivar() {
    const j = this.jornadaAReactivar();
    if (!j) return;
    this.jornadaAReactivar.set(null);
    this.reactivando.set(j.id);
    this.js.reactivar(j.id).subscribe({
      next: () => {
        this.jornadas.update(list => list.map(r => r.id === j.id ? { ...r, estado: 'activa', hora_fin: null } : r));
        this.reactivando.set(null);
      },
      error: (err: any) => {
        this.reactivando.set(null);
        this.errorMsg.set(err?.error?.message ?? 'Error al reactivar la jornada');
      },
    });
  }

  formatTime(dt: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  formatDuration(min?: number) {
    if (!min) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  estadoBadge(estado: string) {
    const map: Record<string, string> = {
      activa:     'badge-pausado',
      pausada:    'badge-pausado',
      finalizada: 'badge-activo',
      anulada:    'badge-finalizado',
    };
    return map[estado] ?? 'badge-finalizado';
  }

  private today() { return new Date().toISOString().slice(0, 10); }
}
