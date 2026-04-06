import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TipoActividadService, TipoActividad } from '../../core/services/tipo-actividad.service';

@Component({
  selector: 'app-tipos-actividad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 max-w-3xl">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tipos de Actividad</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Categorías para clasificar las actividades laborales</p>
        </div>
        <button class="btn-primary" (click)="openForm()">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo Tipo
        </button>
      </div>

      <!-- Lista -->
      <div class="card overflow-hidden">
        @if (cargando()) {
          <div class="flex justify-center py-12">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
          </div>
        } @else {
          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            @for (tipo of tipos(); track tipo.id) {
              <li class="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div class="flex items-center gap-3">
                  <!-- Muestra de color -->
                  <span class="h-8 w-8 rounded-lg shrink-0 border border-black/10 dark:border-white/10"
                        [style.background]="tipo.color_hex"></span>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ tipo.nombre }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ tipo.color_hex }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <!-- Quién desactivó (solo si está inactivo) -->
                  @if (!tipo.activo && eliminadoPor(tipo)) {
                    <span class="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline"
                          [title]="'Desactivado por: ' + eliminadoPor(tipo)">
                      por {{ eliminadoPor(tipo) }}
                    </span>
                  }
                  <!-- Badge estado -->
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                        [class]="tipo.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                             : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'">
                    {{ tipo.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                  <!-- Editar -->
                  <button (click)="openEdit(tipo)" title="Editar"
                          class="rounded p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                  </button>
                  <!-- Activar / Desactivar -->
                  <button (click)="toggle(tipo)"
                          [title]="tipo.activo ? 'Desactivar' : 'Activar'"
                          class="rounded p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                    @if (tipo.activo) {
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                      </svg>
                    } @else {
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    }
                  </button>
                </div>
              </li>
            } @empty {
              <li class="px-5 py-12 text-center text-sm text-gray-400">
                No hay tipos de actividad registrados
              </li>
            }
          </ul>
        }
      </div>
    </div>

    <!-- Modal crear / editar -->
    @if (showForm()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-sm mx-4 shadow-2xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            {{ editando() ? 'Editar Tipo' : 'Nuevo Tipo de Actividad' }}
          </h3>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="form-label">Nombre *</label>
              <input type="text" formControlName="nombre" class="form-input" placeholder="Ej: Reunión, Desarrollo, Soporte...">
              @if (form.get('nombre')?.invalid && form.get('nombre')?.touched) {
                <p class="mt-1 text-xs text-red-500">El nombre es requerido</p>
              }
            </div>

            <div>
              <label class="form-label">Color</label>
              <div class="flex items-center gap-3">
                <input type="color" formControlName="color_hex"
                       class="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
                <div class="flex-1">
                  <input type="text" formControlName="color_hex" class="form-input font-mono text-sm"
                         placeholder="#6366f1" maxlength="7">
                </div>
                <!-- Presets de colores -->
                <div class="flex gap-1.5">
                  @for (c of colorPresets; track c) {
                    <button type="button" (click)="form.patchValue({ color_hex: c })"
                            class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                            [style.background]="c"
                            [class]="form.value.color_hex === c ? 'border-gray-700 dark:border-white scale-110' : 'border-transparent'">
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Preview -->
            <div class="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <span class="h-3 w-3 rounded-full shrink-0" [style.background]="form.value.color_hex || '#6366f1'"></span>
              <span class="text-sm text-gray-700 dark:text-gray-300">
                {{ form.value.nombre || 'Nombre del tipo' }}
              </span>
            </div>

            @if (formError()) {
              <p class="text-sm text-red-500">{{ formError() }}</p>
            }

            <div class="flex gap-3 pt-1">
              <button type="button" class="btn-secondary flex-1" (click)="closeForm()">Cancelar</button>
              <button type="submit" class="btn-primary flex-1" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : (editando() ? 'Guardar cambios' : 'Crear') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class TiposActividadComponent implements OnInit {
  private svc = inject(TipoActividadService);
  private fb  = inject(FormBuilder);

  tipos    = signal<TipoActividad[]>([]);
  cargando = signal(false);
  showForm = signal(false);
  saving   = signal(false);
  formError = signal('');
  editando  = signal<TipoActividad | null>(null);

  readonly colorPresets = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  form = this.fb.group({
    nombre:    ['', Validators.required],
    color_hex: ['#6366f1'],
  });

  ngOnInit() { this.load(); }

  load() {
    this.cargando.set(true);
    this.svc.getAll().subscribe({
      next:  (r) => { this.tipos.set(r.data ?? []); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  openForm() {
    this.editando.set(null);
    this.form.reset({ nombre: '', color_hex: '#6366f1' });
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(tipo: TipoActividad) {
    this.editando.set(tipo);
    this.form.reset({ nombre: tipo.nombre, color_hex: tipo.color_hex });
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editando.set(null);
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.formError.set('');

    const payload = this.form.value as { nombre: string; color_hex: string };
    const ed = this.editando();
    const req = ed ? this.svc.update(ed.id, payload) : this.svc.create(payload);

    req.subscribe({
      next: (r) => {
        if (r.success) { this.load(); this.closeForm(); }
        this.saving.set(false);
      },
      error: (err) => {
        this.formError.set(err.userMessage ?? 'Error al guardar');
        this.saving.set(false);
      },
    });
  }

  toggle(tipo: TipoActividad) {
    this.svc.toggleActivo(tipo.id).subscribe(r => {
      if (r.success) this.load();
    });
  }

  eliminadoPor(tipo: TipoActividad): string {
    return (tipo as any).eliminado_por_nombre ?? '';
  }
}
