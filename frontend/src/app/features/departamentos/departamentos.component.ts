import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DepartamentoService, Departamento } from '../../core/services/departamento.service';

@Component({
  selector: 'app-departamentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 max-w-3xl">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Departamentos</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Unidades organizativas de la institución</p>
        </div>
        <button class="btn-primary" (click)="openForm()">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo Departamento
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
            @for (dep of departamentos(); track dep.id) {
              <li class="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                    <svg class="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ dep.nombre }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ dep.total_usuarios }} {{ dep.total_usuarios === 1 ? 'usuario activo' : 'usuarios activos' }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Quién desactivó (solo si está inactivo) -->
                  @if (!dep.activo && eliminadoPor(dep)) {
                    <span class="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline"
                          [title]="'Desactivado por: ' + eliminadoPor(dep)">
                      por {{ eliminadoPor(dep) }}
                    </span>
                  }
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                        [class]="dep.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'">
                    {{ dep.activo ? 'Activo' : 'Inactivo' }}
                  </span>

                  <button (click)="openEdit(dep)" title="Editar"
                          class="rounded p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                  </button>

                  <button (click)="toggle(dep)"
                          [title]="dep.activo ? 'Desactivar' : 'Activar'"
                          [disabled]="dep.activo && dep.total_usuarios > 0"
                          class="rounded p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    @if (dep.activo) {
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
                No hay departamentos registrados
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
            {{ editando() ? 'Editar Departamento' : 'Nuevo Departamento' }}
          </h3>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="form-label">Nombre *</label>
              <input type="text" formControlName="nombre" class="form-input"
                     placeholder="Ej: Tecnología, Recursos Humanos...">
              @if (form.get('nombre')?.invalid && form.get('nombre')?.touched) {
                <p class="mt-1 text-xs text-red-500">El nombre es requerido</p>
              }
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
export class DepartamentosComponent implements OnInit {
  private svc = inject(DepartamentoService);
  private fb  = inject(FormBuilder);

  departamentos = signal<Departamento[]>([]);
  cargando  = signal(false);
  showForm  = signal(false);
  saving    = signal(false);
  formError = signal('');
  editando  = signal<Departamento | null>(null);

  form = this.fb.group({
    nombre: ['', Validators.required],
  });

  ngOnInit() { this.load(); }

  load() {
    this.cargando.set(true);
    this.svc.getAll().subscribe({
      next:  (r) => { this.departamentos.set(r.data ?? []); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  openForm() {
    this.editando.set(null);
    this.form.reset();
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(dep: Departamento) {
    this.editando.set(dep);
    this.form.reset({ nombre: dep.nombre });
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

    const { nombre } = this.form.value as { nombre: string };
    const ed = this.editando();
    const req = ed ? this.svc.update(ed.id, { nombre }) : this.svc.create({ nombre });

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

  toggle(dep: Departamento) {
    if (dep.activo && dep.total_usuarios > 0) return;
    this.svc.toggleActivo(dep.id).subscribe(r => {
      if (r.success) this.load();
    });
  }

  eliminadoPor(dep: Departamento): string {
    return (dep as any).eliminado_por_nombre ?? '';
  }
}
