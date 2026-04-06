import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { RolPipe } from '../../shared/pipes/rol.pipe';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RolPipe],
  template: `
    <div class="mx-auto max-w-2xl px-4 py-8">

      <h1 class="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>

      <!-- Avatar -->
      <div class="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Foto de perfil</h2>

        <div class="flex items-center gap-6">
          <!-- Vista previa -->
          <div class="relative h-20 w-20 shrink-0">
            @if (avatarPreview() || perfil()?.avatar_url) {
              <img [src]="avatarPreview() || uploadsBase + perfil()!.avatar_url"
                   class="h-20 w-20 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-800"
                   alt="Avatar">
            } @else {
              <div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 text-2xl font-bold">
                {{ initials() }}
              </div>
            }
            @if (uploadingAvatar()) {
              <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <svg class="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
            }
          </div>

          <!-- Acciones -->
          <div>
            <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">PNG, JPG o WebP. Máx. 2 MB.</p>
            <div class="flex flex-wrap gap-2">
              <label class="btn-secondary cursor-pointer text-xs inline-flex items-center gap-1.5">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                {{ uploadingAvatar() ? 'Subiendo...' : 'Cambiar foto' }}
                <input type="file" accept="image/png,image/jpeg,image/webp"
                       class="hidden" (change)="onAvatarSelected($event)"
                       [disabled]="uploadingAvatar()">
              </label>
              @if (perfil()?.avatar_url && !avatarPreview()) {
                <button type="button" (click)="removeAvatar()"
                        class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">
                  Quitar foto
                </button>
              }
            </div>
            @if (avatarError()) {
              <p class="mt-1 text-xs text-red-500 dark:text-red-400">{{ avatarError() }}</p>
            }
          </div>
        </div>
      </div>

      <!-- Datos personales -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Datos personales</h2>

        <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-4">

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
              <input formControlName="nombre" type="text"
                     class="input w-full"
                     placeholder="Tu nombre">
              @if (form.get('nombre')?.invalid && form.get('nombre')?.touched) {
                <p class="mt-1 text-xs text-red-500">El nombre es requerido.</p>
              }
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Apellido</label>
              <input formControlName="apellido" type="text"
                     class="input w-full"
                     placeholder="Tu apellido">
              @if (form.get('apellido')?.invalid && form.get('apellido')?.touched) {
                <p class="mt-1 text-xs text-red-500">El apellido es requerido.</p>
              }
            </div>
          </div>

          <!-- Solo lectura -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Correo electrónico</label>
              <input [value]="auth.currentUser()?.email" type="email"
                     class="input w-full cursor-not-allowed opacity-60" readonly>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
              <input [value]="auth.currentUser()?.rol | rol" type="text"
                     class="input w-full cursor-not-allowed opacity-60" readonly>
            </div>
          </div>

          <!-- Feedback -->
          @if (successMsg()) {
            <div class="rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
              {{ successMsg() }}
            </div>
          }
          @if (errorMsg()) {
            <div class="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {{ errorMsg() }}
            </div>
          }

          <div class="flex justify-end pt-2">
            <button type="submit" class="btn-primary" [disabled]="saving() || form.invalid">
              {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>

        </form>
      </div>

    </div>
  `,
})
export class PerfilComponent implements OnInit {
  auth       = inject(AuthService);
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  private api      = `${environment.apiUrl}/auth`;
  readonly uploadsBase = environment.apiUrl.replace('/api', '') + '/uploads/';

  perfil        = signal<any>(null);
  avatarPreview = signal('');
  uploadingAvatar = signal(false);
  avatarError   = signal('');
  saving        = signal(false);
  successMsg    = signal('');
  errorMsg      = signal('');

  form = this.fb.group({
    nombre:   [this.auth.currentUser()?.nombre   ?? '', Validators.required],
    apellido: [this.auth.currentUser()?.apellido ?? '', Validators.required],
  });

  initials = () => {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return `${u.nombre?.[0] ?? ''}${u.apellido?.[0] ?? ''}`.toUpperCase();
  };

  ngOnInit() {
    this.http.get<any>(`${this.api}/me`).subscribe(res => {
      if (res.success) this.perfil.set(res.data);
    });
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

      this.auth.uploadMeAvatar(base64).subscribe({
        next: (r) => {
          if (r.success) {
            this.perfil.update(p => ({ ...p, avatar_url: r.data.url }));
            this.avatarPreview.set('');
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
    this.auth.deleteMeAvatar().subscribe(r => {
      if (r.success) this.perfil.update(p => ({ ...p, avatar_url: null }));
    });
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    const { nombre, apellido } = this.form.value;
    this.auth.actualizarPerfil(nombre!, apellido!).subscribe({
      next: (r) => {
        if (r.success) {
          this.successMsg.set('Perfil actualizado correctamente.');
          setTimeout(() => this.successMsg.set(''), 3000);
        }
        this.saving.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Error al guardar los cambios.');
        this.saving.set(false);
      },
    });
  }
}
