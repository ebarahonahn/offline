import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div class="w-full max-w-md">
        <!-- Logo y título -->
        <div class="text-center mb-8">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Sistema Teletrabajo</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Control de tiempo laboral institucional</p>
        </div>

        <!-- Card del formulario -->
        <div class="card p-8 shadow-xl">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Iniciar sesión</h2>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
            <!-- Email -->
            <div>
              <label class="form-label" for="email">Correo electrónico</label>
              <input id="email" type="email" formControlName="email" class="form-input"
                     placeholder="usuario@ejemplo.com" autocomplete="email">
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <p class="mt-1 text-xs text-red-500">Ingresa un correo válido</p>
              }
            </div>

            <!-- Password -->
            <div>
              <label class="form-label" for="password">Contraseña</label>
              <div class="relative">
                <input id="password" [type]="showPass() ? 'text' : 'password'"
                       formControlName="password" class="form-input pr-10"
                       placeholder="••••••••" autocomplete="current-password">
                <button type="button" (click)="showPass.set(!showPass())"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    @if (showPass()) {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    }
                  </svg>
                </button>
              </div>
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <p class="mt-1 text-xs text-red-500">La contraseña es requerida</p>
              }
            </div>

            <!-- Error -->
            @if (errorMsg()) {
              <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {{ errorMsg() }}
              </div>
            }

            <!-- Submit -->
            <button type="submit" class="btn-primary w-full py-2.5 text-base"
                    [disabled]="loading() || form.invalid">
              @if (loading()) {
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Iniciando sesión...
              } @else {
                Ingresar
              }
            </button>
          </form>

          <!-- Recuperar contraseña -->
          <div class="mt-5 text-center">
            <button type="button" (click)="abrirRecuperar()"
                    class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <!-- Credenciales de prueba -->
        <!-- <div class="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-xs text-blue-700 dark:text-blue-300">
          <p class="font-semibold mb-1">Credenciales de prueba:</p>
          <p>Admin: admin&#64;teletrabajo.com / Admin&#64;123</p>
          <p>Empleado: empleado&#64;teletrabajo.com / Empleado&#64;123</p>
        </div> -->
      </div>
    </div>

    <!-- Modal recuperar contraseña -->
    @if (showRecuperar()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">

          @if (!enviado()) {
            <!-- Formulario -->
            <div class="flex items-center gap-3 mb-4">
              <div class="rounded-full p-2 bg-primary-100 dark:bg-primary-900/30">
                <svg class="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recuperar contraseña</h3>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Ingresa tu correo institucional y te enviaremos una contraseña provisional.
            </p>

            <form [formGroup]="recuperarForm" (ngSubmit)="enviarRecuperar()" class="space-y-4">
              <div>
                <label class="form-label">Correo electrónico</label>
                <input type="email" formControlName="email" class="form-input"
                       placeholder="usuario@ejemplo.com" autocomplete="email">
                @if (recuperarForm.get('email')?.invalid && recuperarForm.get('email')?.touched) {
                  <p class="mt-1 text-xs text-red-500">Ingresa un correo válido</p>
                }
              </div>

              @if (errorRecuperar()) {
                <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  {{ errorRecuperar() }}
                </div>
              }

              <div class="flex gap-3 pt-1">
                <button type="button" class="btn-secondary flex-1" (click)="cerrarRecuperar()">Cancelar</button>
                <button type="submit" class="btn-primary flex-1" [disabled]="enviando() || recuperarForm.invalid">
                  @if (enviando()) {
                    <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Enviando...
                  } @else {
                    Enviar contraseña
                  }
                </button>
              </div>
            </form>

          } @else {
            <!-- Confirmación de envío -->
            <div class="text-center py-4">
              <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <svg class="h-7 w-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Correo enviado</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Si el correo está registrado en el sistema, recibirás una contraseña provisional en tu bandeja de entrada.
              </p>
              <button class="btn-primary w-full" (click)="cerrarRecuperar()">Entendido</button>
            </div>
          }

        </div>
      </div>
    }
  `,
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  loading  = signal(false);
  errorMsg = signal('');
  showPass = signal(false);

  showRecuperar  = signal(false);
  enviando       = signal(false);
  enviado        = signal(false);
  errorRecuperar = signal('');

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  recuperarForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMsg.set(err.userMessage || 'Error al iniciar sesión');
        this.loading.set(false);
      },
    });
  }

  abrirRecuperar() {
    this.recuperarForm.reset();
    this.enviado.set(false);
    this.errorRecuperar.set('');
    this.showRecuperar.set(true);
  }

  cerrarRecuperar() {
    this.showRecuperar.set(false);
  }

  enviarRecuperar() {
    if (this.recuperarForm.invalid) { this.recuperarForm.markAllAsTouched(); return; }
    this.enviando.set(true);
    this.errorRecuperar.set('');

    const { email } = this.recuperarForm.value;
    this.auth.recuperarPassword(email!).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: () => {
        this.enviando.set(false);
        this.errorRecuperar.set('Ocurrió un error al enviar el correo. Intenta de nuevo.');
      },
    });
  }
}
