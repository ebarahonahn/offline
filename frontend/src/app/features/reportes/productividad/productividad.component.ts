import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { RolPipe } from '../../../shared/pipes/rol.pipe';

@Component({
  selector: 'app-productividad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RolPipe],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Productividad</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Resumen de productividad por empleado en el período seleccionado</p>
      </div>

      <!-- Filtros -->
      <div class="card p-5">
        <form [formGroup]="filterForm" (ngSubmit)="buscar()" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="form-label">Fecha inicio *</label>
            <input type="date" formControlName="fecha_inicio" class="form-input">
          </div>
          <div>
            <label class="form-label">Fecha fin *</label>
            <input type="date" formControlName="fecha_fin" class="form-input">
          </div>
          <div>
            <label class="form-label">Departamento</label>
            <select formControlName="departamento_id" [attr.disabled]="isJefeDepartamento() ? true : null" class="form-input disabled:opacity-60 disabled:cursor-not-allowed">
              @if (!isJefeDepartamento()) {
                <option value="">Todos</option>
              }
              @for (dep of departamentos(); track dep.id) {
                <option [value]="dep.id">{{ dep.nombre }}</option>
              }
            </select>
          </div>
          <div class="sm:col-span-3 flex gap-3">
            <button type="submit" class="btn-primary" [disabled]="loading()">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {{ loading() ? 'Buscando...' : 'Buscar' }}
            </button>
            <button type="button" class="btn-secondary" (click)="exportExcel()" [disabled]="!data().length">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Excel
            </button>
            <button type="button" class="btn-secondary" (click)="exportPDF()" [disabled]="!data().length">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              PDF
            </button>
          </div>
        </form>
      </div>

      <!-- Resultados -->
      @if (data().length > 0) {
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Resultados</h2>
            <span class="text-sm text-gray-500">{{ data().length }} empleados</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jornadas</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Trabajado</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prom./Jornada</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inactividad</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actividades</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eficiencia</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                @for (row of data(); track $index) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ row.empleado }}</td>
                    <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ row.rol | rol }}</td>
                    <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ row.departamento || 'N/A' }}</td>
                    <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{{ row.jornadas }}</td>
                    <td class="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{{ fmt(row.total_trabajado_min) }}</td>
                    <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{{ fmt(row.promedio_min) }}</td>
                    <td class="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{{ fmt(row.inactividad_min) }}</td>
                    <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{{ row.actividades }}</td>
                    <td class="px-4 py-3 text-right">
                      <span [class]="eficienciaClass(row)" class="font-semibold tabular-nums">
                        {{ eficiencia(row) }}%
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else if (searched()) {
        <div class="card p-12 text-center text-gray-400">
          <p class="text-lg">Sin resultados para el período seleccionado</p>
        </div>
      }
    </div>
  `,
})
export class ProductividadComponent implements OnInit {
  private rs   = inject(ReporteService);
  private us   = inject(UsuarioService);
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  data                = signal<any[]>([]);
  departamentos       = signal<any[]>([]);
  loading             = signal(false);
  searched            = signal(false);
  isJefeDepartamento  = computed(() => this.auth.hasRole('jefe_departamento'));

  filterForm = this.fb.group({
    fecha_inicio:    [this.firstDayOfMonth()],
    fecha_fin:       [this.today()],
    departamento_id: [''],
  });

  ngOnInit() {
    this.us.getDepartamentos().subscribe(r => {
      if (r.success) {
        this.departamentos.set(r.data);
        if (this.isJefeDepartamento()) {
          const deptId = this.auth.currentUser()?.departamento_id;
          if (deptId) this.filterForm.patchValue({ departamento_id: String(deptId) });
        }
      }
    });
  }

  buscar() {
    this.loading.set(true);
    this.searched.set(true);
    this.rs.getProductividad(this.filterForm.value).subscribe({
      next: r => { if (r.success) this.data.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  exportExcel() {
    const p = this.filterForm.value;
    this.rs.exportProductividadExcel(p).subscribe(r =>
      this.rs.downloadBlob(r, `productividad_${p.fecha_inicio}_${p.fecha_fin}.xlsx`));
  }

  exportPDF() {
    const p = this.filterForm.value;
    this.rs.exportProductividadPDF(p).subscribe(r =>
      this.rs.downloadBlob(r, `productividad_${p.fecha_inicio}_${p.fecha_fin}.pdf`));
  }

  eficiencia(row: any): number {
    if (!row.total_trabajado_min) return 0;
    const neto = Math.max(0, row.total_trabajado_min - (row.inactividad_min || 0));
    return Math.round((neto / row.total_trabajado_min) * 100);
  }

  eficienciaClass(row: any): string {
    const pct = this.eficiencia(row);
    if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  fmt(min?: number): string {
    if (!min) return '-';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private today() { return new Date().toISOString().slice(0, 10); }
  private firstDayOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
}
