import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsuarioService } from '../../../core/services/usuario.service';
import { User } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';
import { RolPipe } from '../../../shared/pipes/rol.pipe';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RolPipe],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Gestión de usuarios del sistema</p>
        </div>
        <button class="btn-primary" (click)="openForm()">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo Usuario
        </button>
      </div>

      <!-- Filtros -->
      <div class="card p-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Departamento</label>
            <select class="form-input text-sm" [value]="filtroDepto()" (change)="onFiltroDep($event)">
              <option value="">Todos</option>
              @for (dep of departamentos(); track dep.id) {
                <option [value]="dep.id">{{ dep.nombre }}</option>
              }
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Estado</label>
            <select class="form-input text-sm" [value]="filtroEstado()" (change)="onFiltroEstado($event)">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </div>
          <div class="flex items-end">
            <button class="btn-secondary text-sm" (click)="limpiarFiltros()">Limpiar</button>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="card overflow-hidden">
        @if (cargando()) {
          <div class="flex justify-center py-12">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
          </div>
        } @else if (errorCarga()) {
          <div class="px-6 py-10 text-center">
            <p class="text-sm text-red-500 dark:text-red-400">{{ errorCarga() }}</p>
            <button (click)="loadUsuarios()" class="mt-3 btn-secondary text-sm">Reintentar</button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Usuario</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Rol</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Departamento</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Último acceso</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Modificado por</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                @for (user of usuarios(); track user.id) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        @if (user.avatar_url) {
                          <img [src]="avatarUrl(user.avatar_url)"
                               class="h-8 w-8 shrink-0 rounded-full object-cover"
                               [alt]="user.nombre">
                        } @else {
                          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold">
                            {{ user.nombre[0] }}{{ user.apellido[0] }}
                          </div>
                        }
                        <div>
                          <p class="font-medium text-gray-900 dark:text-white">{{ user.nombre }} {{ user.apellido }}</p>
                          <p class="text-xs text-gray-500">{{ user.email }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ user.rol | rol }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ user.departamento || '-' }}</td>
                    <td class="px-4 py-3">
                      <span [class]="estadoClass(user.estado)">{{ user.estado }}</span>
                    </td>
                    <td class="px-4 py-3 text-gray-500 text-xs">
                      {{ user.ultimo_acceso ? formatDate(user.ultimo_acceso) : 'Nunca' }}
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      @if (modificadoPor(user)) {
                        <span title="Última modificación">{{ modificadoPor(user) }}</span>
                      } @else {
                        <span class="text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-1">
                        <button (click)="openEdit(user)" title="Editar usuario"
                                class="rounded p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                          </svg>
                        </button>
                        <button (click)="toggleEstado(user)"
                                [title]="user.estado === 'activo' ? 'Desactivar' : 'Activar'"
                                class="rounded p-1 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                          @if (user.estado === 'activo') {
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                            </svg>
                          } @else {
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          }
                        </button>
                        <button (click)="confirmarEliminar(user)" title="Eliminar usuario"
                                class="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">Sin usuarios</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- Modal crear / editar -->
    @if (showForm()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            {{ usuarioEditando() ? 'Editar Usuario' : 'Nuevo Usuario' }}
          </h3>

          <!-- Avatar (solo al editar) -->
          @if (usuarioEditando()) {
            <div class="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div class="relative shrink-0">
                @if (avatarPreview() || usuarioEditando()?.avatar_url) {
                  <img [src]="avatarPreview() || avatarUrl(usuarioEditando()!.avatar_url!)"
                       class="h-20 w-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                       alt="Avatar">
                } @else {
                  <div class="h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl font-bold text-primary-700 dark:text-primary-400 border-2 border-gray-200 dark:border-gray-700">
                    {{ usuarioEditando()!.nombre[0] }}{{ usuarioEditando()!.apellido[0] }}
                  </div>
                }
                @if (uploadingAvatar()) {
                  <div class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <svg class="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  </div>
                }
              </div>

              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">Foto de perfil</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">PNG, JPG o WebP. Máx. 2 MB.</p>
                <label class="btn-secondary text-xs cursor-pointer inline-flex items-center gap-2">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  {{ uploadingAvatar() ? 'Subiendo...' : 'Subir foto' }}
                  <input type="file" accept="image/png,image/jpeg,image/webp"
                         class="hidden" (change)="onAvatarSelected($event)"
                         [disabled]="uploadingAvatar()">
                </label>
                @if (usuarioEditando()?.avatar_url && !avatarPreview()) {
                  <button type="button" (click)="removeAvatar()"
                          class="ml-2 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">
                    Quitar foto
                  </button>
                }
                @if (avatarError()) {
                  <p class="mt-2 text-xs text-red-500 dark:text-red-400">{{ avatarError() }}</p>
                }
              </div>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Nombre *</label>
                <input type="text" formControlName="nombre" class="form-input">
              </div>
              <div>
                <label class="form-label">Apellido *</label>
                <input type="text" formControlName="apellido" class="form-input">
              </div>
            </div>
            <div>
              <label class="form-label">Email *</label>
              <input type="email" formControlName="email" class="form-input">
            </div>
            @if (usuarioEditando()) {
              <div>
                <label class="form-label">Contraseña (dejar en blanco para no cambiar)</label>
                <input type="password" formControlName="password" class="form-input" placeholder="••••••">
              </div>
            } @else {
              <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                Se generará una contraseña provisional y se enviará al correo del usuario para que la cambie en su primer inicio de sesión.
              </div>
            }
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Rol *</label>
                <select formControlName="rol_id" class="form-input">
                  @for (rol of roles(); track rol.id) {
                    <option [value]="rol.id">{{ rol.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="form-label">Departamento</label>
                <select formControlName="departamento_id" class="form-input">
                  <option [value]="null">Sin departamento</option>
                  @for (dep of departamentos(); track dep.id) {
                    <option [value]="dep.id">{{ dep.nombre }}</option>
                  }
                </select>
              </div>
            </div>
            @if (formError()) { <p class="text-sm text-red-500">{{ formError() }}</p> }
            <div class="flex gap-3 pt-2">
              <button type="button" class="btn-secondary flex-1" (click)="closeForm()">Cancelar</button>
              <button type="submit" class="btn-primary flex-1" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : (usuarioEditando() ? 'Guardar cambios' : 'Crear Usuario') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal confirmación de eliminación -->
    @if (usuarioAEliminar()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-sm mx-4 shadow-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Eliminar usuario</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
            ¿Estás seguro de que deseas eliminar a
            <strong class="text-gray-900 dark:text-white">{{ usuarioAEliminar()!.nombre }} {{ usuarioAEliminar()!.apellido }}</strong>?
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-500 mb-5">
            Esta acción es una eliminación lógica. El registro quedará registrado en la auditoría del sistema.
          </p>
          @if (deleteError()) {
            <p class="mb-3 text-sm text-red-500">{{ deleteError() }}</p>
          }
          <div class="flex gap-3">
            <button type="button" class="btn-secondary flex-1" (click)="cancelarEliminar()" [disabled]="deleting()">
              Cancelar
            </button>
            <button type="button" (click)="eliminar()" [disabled]="deleting()"
                    class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
              {{ deleting() ? 'Eliminando...' : 'Sí, eliminar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class UsuariosListComponent implements OnInit {
  private us = inject(UsuarioService);
  private fb = inject(FormBuilder);

  readonly uploadsBase = environment.apiUrl.replace('/api', '') + '/uploads/';

  usuarios          = signal<User[]>([]);
  roles             = signal<any[]>([]);
  departamentos     = signal<any[]>([]);
  showForm          = signal(false);
  saving            = signal(false);
  formError         = signal('');
  usuarioEditando   = signal<User | null>(null);
  cargando          = signal(false);
  errorCarga        = signal('');
  avatarPreview     = signal('');
  uploadingAvatar   = signal(false);
  avatarError       = signal('');
  usuarioAEliminar  = signal<User | null>(null);
  deleting          = signal(false);
  deleteError       = signal('');
  filtroDepto       = signal('');
  filtroEstado      = signal('');

  form = this.fb.group({
    nombre:          ['', Validators.required],
    apellido:        ['', Validators.required],
    email:           ['', [Validators.required, Validators.email]],
    password:        [''],
    rol_id:          [3, Validators.required],
    departamento_id: [null as number | null],
  });

  ngOnInit() {
    this.loadUsuarios();
    this.us.getRoles().subscribe(r => { if (r.success) this.roles.set(r.data); });
    this.us.getDepartamentos().subscribe(r => { if (r.success) this.departamentos.set(r.data); });
  }

  avatarUrl(relativa: string): string {
    return this.uploadsBase + relativa;
  }

  loadUsuarios() {
    this.cargando.set(true);
    this.errorCarga.set('');
    const params: any = {};
    if (this.filtroDepto())  params['departamento_id'] = this.filtroDepto();
    if (this.filtroEstado()) params['estado']          = this.filtroEstado();
    this.us.getAll(params).subscribe({
      next:  (r) => { this.usuarios.set(r.success ? (r.data ?? []) : []); this.cargando.set(false); },
      error: (err) => {
        this.errorCarga.set(err.userMessage ?? err.message ?? 'Error al cargar usuarios');
        this.cargando.set(false);
      },
    });
  }

  onFiltroDep(e: Event)    { this.filtroDepto.set((e.target as HTMLSelectElement).value);   this.loadUsuarios(); }
  onFiltroEstado(e: Event) { this.filtroEstado.set((e.target as HTMLSelectElement).value);  this.loadUsuarios(); }
  limpiarFiltros()         { this.filtroDepto.set(''); this.filtroEstado.set(''); this.loadUsuarios(); }

  openForm() {
    this.usuarioEditando.set(null);
    this.avatarPreview.set('');
    this.form.reset({ rol_id: 3 });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(user: User) {
    this.usuarioEditando.set(user);
    this.avatarPreview.set('');
    this.form.reset({
      nombre:          user.nombre,
      apellido:        user.apellido,
      email:           user.email,
      password:        '',
      rol_id:          (user as any).rol_id ?? 3,
      departamento_id: (user as any).departamento_id ?? null,
    });
    this.form.controls.password.setValidators([Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.usuarioEditando.set(null);
    this.avatarPreview.set('');
  }

  onAvatarSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.avatarError.set('');

    if (file.size > 2 * 1024 * 1024) {
      this.avatarError.set('La imagen supera el tamaño máximo de 2 MB.');
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.avatarPreview.set(base64);
      this.uploadingAvatar.set(true);

      this.us.uploadAvatar(this.usuarioEditando()!.id, base64).subscribe({
        next: (r) => {
          if (r.success) {
            const u = this.usuarioEditando();
            if (u) this.usuarioEditando.set({ ...u, avatar_url: r.data.url });
          }
          this.uploadingAvatar.set(false);
        },
        error: (err) => {
          this.avatarPreview.set('');
          this.uploadingAvatar.set(false);
          this.avatarError.set(err.error?.message || 'Error al subir la imagen.');
        },
      });
    };
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    const u = this.usuarioEditando();
    if (!u) return;
    this.us.deleteAvatar(u.id).subscribe(r => {
      if (r.success) this.usuarioEditando.set({ ...u, avatar_url: null });
    });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const editando = this.usuarioEditando();
    if (editando) {
      const payload: any = { ...this.form.value };
      if (!payload.password) delete payload.password;
      this.us.update(editando.id, payload).subscribe({
        next: (r) => {
          if (r.success) { this.loadUsuarios(); this.closeForm(); }
          this.saving.set(false);
        },
        error: (err) => { this.formError.set(err.userMessage ?? 'Error al guardar'); this.saving.set(false); },
      });
    } else {
      const { password, ...payload } = this.form.value as any;
      this.us.create(payload).subscribe({
        next: (r) => {
          if (r.success) { this.loadUsuarios(); this.closeForm(); }
          this.saving.set(false);
        },
        error: (err) => { this.formError.set(err.userMessage ?? 'Error al crear'); this.saving.set(false); },
      });
    }
  }

  toggleEstado(user: User) {
    const nuevo = user.estado === 'activo' ? 'inactivo' : 'activo';
    this.us.updateEstado(user.id, nuevo).subscribe(r => {
      if (r.success) this.loadUsuarios();
    });
  }

  confirmarEliminar(user: User) {
    this.deleteError.set('');
    this.usuarioAEliminar.set(user);
  }

  cancelarEliminar() {
    this.usuarioAEliminar.set(null);
    this.deleteError.set('');
  }

  eliminar() {
    const user = this.usuarioAEliminar();
    if (!user) return;
    this.deleting.set(true);
    this.us.delete(user.id).subscribe({
      next: (r) => {
        if (r.success) {
          this.loadUsuarios();
          this.cancelarEliminar();
        }
        this.deleting.set(false);
      },
      error: (err) => {
        this.deleteError.set(err.userMessage ?? 'Error al eliminar');
        this.deleting.set(false);
      },
    });
  }

  estadoClass(estado: string) {
    return { activo: 'badge-activo', inactivo: 'badge-inactivo', suspendido: 'badge-pausado' }[estado] ?? 'badge-finalizado';
  }

  formatDate(dt: string) {
    return new Date(dt).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  modificadoPor(user: User): string {
    return (user as any).modificado_por_nombre ?? '';
  }
}
