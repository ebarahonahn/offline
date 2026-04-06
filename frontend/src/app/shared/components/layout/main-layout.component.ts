import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { InactividadOverlayComponent } from '../../components/inactividad-overlay/inactividad-overlay.component';
import { JornadaService } from '../../../core/services/jornada.service';
import { InactividadService } from '../../../core/services/inactividad.service';
import { SocketService } from '../../../core/services/socket.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { CapturaService } from '../../../core/services/captura.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';

function passwordsCoinciden(control: AbstractControl): ValidationErrors | null {
  const nuevo     = control.get('password_nuevo')?.value;
  const confirmar = control.get('confirmar')?.value;
  return nuevo && confirmar && nuevo !== confirmar ? { noCoincide: true } : null;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ReactiveFormsModule, SidebarComponent, TopbarComponent, InactividadOverlayComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <!-- Sidebar -->
      <app-sidebar />

      <!-- Main content -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <app-topbar />

        <!-- Banner capturas de pantalla -->
        @if (captura.habilitada() && jornada.estadoActual() === 'activa' && !captura.permisoConcedido()) {
          <div class="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2.5">
            <svg class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
            </svg>
            <p class="flex-1 text-sm text-amber-800 dark:text-amber-300">
              El monitoreo de pantalla está habilitado para tu jornada activa.
            </p>
            <button (click)="activarCapturas()"
                    class="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors">
              Activar capturas
            </button>
          </div>
        }

        @if (captura.capturandoAhora()) {
          <div class="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800 px-6 py-1.5">
            <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p class="text-xs text-emerald-700 dark:text-emerald-400">Enviando captura...</p>
          </div>
        }

        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Overlay inactividad -->
    <app-inactividad-overlay />

    <!-- Modal aviso de cierre automático de jornada -->
    @if (avisoFinJornada()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-md mx-4 shadow-2xl border border-amber-200 dark:border-amber-700">
          <div class="flex items-center gap-3 mb-4">
            <div class="rounded-full p-2 bg-amber-100 dark:bg-amber-900/30">
              <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Fin de jornada laboral</h3>
          </div>

          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Tu jornada laboral oficial terminó a las
            <span class="font-semibold text-gray-900 dark:text-white">{{ avisoFinJornada()!.horaFinProgramada }}</span>.
            Si no realizas ninguna acción, se finalizará automáticamente.
          </p>

          <!-- Countdown -->
          <div class="flex flex-col items-center mb-5 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <span class="text-3xl font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {{ cuentaRegresivaFmt() }}
            </span>
            <span class="text-xs text-amber-700 dark:text-amber-500 mt-1 font-medium uppercase tracking-wide">
              Tiempo restante para cierre automático
            </span>
          </div>

          <div class="flex gap-3">
            <button class="btn-secondary flex-1" (click)="cerrarAvisoFin()">
              Continuar trabajando
            </button>
            <button class="btn-danger flex-1" (click)="finalizarDesdeAviso()">
              Finalizar ahora
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal cambio de contraseña obligatorio -->
    @if (debecambiarPassword()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3 mb-4">
            <div class="rounded-full p-2 bg-amber-100 dark:bg-amber-900/30">
              <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Cambia tu contraseña</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Acción requerida para continuar</p>
            </div>
          </div>

          <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Estás usando una contraseña provisional. Por seguridad, debes establecer una nueva contraseña antes de continuar.
          </p>

          <form [formGroup]="cambiarPassForm" (ngSubmit)="confirmarCambioPassword()" class="space-y-4">
            <div>
              <label class="form-label">Nueva contraseña</label>
              <input type="password" formControlName="password_nuevo" class="form-input"
                     placeholder="Mínimo 6 caracteres" autocomplete="new-password">
              @if (cambiarPassForm.get('password_nuevo')?.invalid && cambiarPassForm.get('password_nuevo')?.touched) {
                <p class="mt-1 text-xs text-red-500">Debe tener al menos 6 caracteres</p>
              }
            </div>
            <div>
              <label class="form-label">Confirmar contraseña</label>
              <input type="password" formControlName="confirmar" class="form-input"
                     placeholder="Repite la contraseña" autocomplete="new-password">
              @if (cambiarPassForm.get('confirmar')?.touched && cambiarPassForm.errors?.['noCoincide']) {
                <p class="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
              }
            </div>

            @if (errorCambioPass()) {
              <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                {{ errorCambioPass() }}
              </div>
            }

            <button type="submit" class="btn-primary w-full py-2.5"
                    [disabled]="guardandoPass() || cambiarPassForm.invalid">
              @if (guardandoPass()) {
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Guardando...
              } @else {
                Guardar nueva contraseña
              }
            </button>
          </form>
        </div>
      </div>
    }
  `,
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  jornada = inject(JornadaService);
  captura = inject(CapturaService);

  private inact  = inject(InactividadService);
  private socket = inject(SocketService);
  private config = inject(ConfiguracionService);
  private auth   = inject(AuthService);
  private fb     = inject(FormBuilder);
  private notif  = inject(NotificacionService);

  debecambiarPassword  = computed(() => !!this.auth.currentUser()?.debe_cambiar_password);
  guardandoPass        = signal(false);
  errorCambioPass      = signal('');
  avisoFinJornada      = signal<{ jornadaId: number; horaFinProgramada: string; horaAutoFin: string; minutosRestantes: number } | null>(null);
  // ID de la jornada cuyo aviso fue descartado por el usuario ("Continuar trabajando").
  private avisoDismissedJornadaId: number | null = null;
  // Timeout que re-habilita el aviso 5 min antes del cierre automático definitivo.
  private avisoDismissedTimer: any = null;
  cuentaRegresivaSegs  = signal<number>(300);
  cuentaRegresivaFmt   = computed(() => {
    const s = this.cuentaRegresivaSegs();
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  });

  private cuentaRegresivaTimer: any = null;

  cambiarPassForm = this.fb.group(
    {
      password_nuevo: ['', [Validators.required, Validators.minLength(6)]],
      confirmar:      ['', Validators.required],
    },
    { validators: passwordsCoinciden }
  );

  confirmarCambioPassword() {
    if (this.cambiarPassForm.invalid) { this.cambiarPassForm.markAllAsTouched(); return; }
    this.guardandoPass.set(true);
    this.errorCambioPass.set('');
    const { password_nuevo } = this.cambiarPassForm.value;
    this.auth.cambiarPassword(password_nuevo!).subscribe({
      next:  () => { this.guardandoPass.set(false); this.cambiarPassForm.reset(); },
      error: () => { this.guardandoPass.set(false); this.errorCambioPass.set('Error al guardar la contraseña. Intenta de nuevo.'); },
    });
  }

  ngOnInit() {
    this.jornada.loadActiva().subscribe(res => {
      const j = res?.data;
      if (j && ['activa', 'pausada'].includes(j.estado)) {
        this.inact.setJornada(j.id);
      }
    });
    this.socket.connect();
    this.loadConfig();
    this.notif.loadPendientes().subscribe();

    this.socket.notificacion$.subscribe(n => this.notif.agregarDesdeSocket(n));

    this.socket.jornadaUpdate$.subscribe(j => {
      // Comparar fecha de la jornada con la fecha local de hoy
      const hoy = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
      const fechaJornada = j?.fecha ? (j.fecha as string).slice(0, 10) : null;
      const esHoy = fechaJornada === hoy;

      if (!esHoy) {
        // Jornada de otro día (p. ej. reactivación de ayer por admin):
        // no tocar la jornada activa de hoy, solo señalizar el historial
        if (j) this.jornada.jornadaHistorialUpdate$.next(j);
        return;
      }

      this.jornada.jornadaActiva.set(j);
      this.inact.setJornada(j && ['activa', 'pausada'].includes(j.estado) ? j.id : null);
      this.captura.onJornadaEstado(j?.estado ?? null);
      // Si la jornada fue finalizada (ej. por el scheduler), cierra el aviso si estaba abierto
      if (!j || j.estado === 'finalizada') {
        this.avisoFinJornada.set(null);
        this.detenerCuentaRegresiva();
        this.avisoDismissedJornadaId = null;
        this.detenerAvisoDismissedTimer();
      }
    });

    this.socket.jornadaAvisoFin$.subscribe(aviso => {
      const estado = this.jornada.estadoActual();
      if (estado !== 'activa' && estado !== 'pausada') return;
      // No mostrar si el usuario ya descartó el aviso para esta jornada
      if (this.avisoDismissedJornadaId === aviso.jornadaId) return;
      // No mostrar si el modal ya está visible (evita reiniciar el countdown)
      if (this.avisoFinJornada() !== null) return;
      this.avisoFinJornada.set(aviso);
      this.iniciarCuentaRegresiva();
    });
  }

  ngOnDestroy() {
    this.captura.stop();
    this.detenerCuentaRegresiva();
    this.detenerAvisoDismissedTimer();
  }

  async activarCapturas() {
    await this.captura.pedirPermiso();
  }

  cerrarAvisoFin() {
    this.detenerCuentaRegresiva();
    const aviso = this.avisoFinJornada()!;
    this.avisoDismissedJornadaId = aviso.jornadaId;
    this.avisoFinJornada.set(null);

    // Re-habilitar el aviso 5 minutos antes del cierre automático definitivo,
    // para que el usuario siempre reciba un último aviso antes del hard-close.
    // minutosRestantes es el tiempo hasta horaAutoFin en el momento del último evento.
    const msHastaReAviso = (aviso.minutosRestantes - 5) * 60 * 1000;
    if (msHastaReAviso > 0) {
      this.detenerAvisoDismissedTimer();
      this.avisoDismissedTimer = setTimeout(() => {
        this.avisoDismissedJornadaId = null;
        // El próximo tick del backend (dentro de ≤1 min) volverá a mostrar el modal
      }, msHastaReAviso);
    }
    // Si msHastaReAviso <= 0 ya estamos en los últimos 5 min antes del hard-close;
    // el backend cerrará pronto y no vale la pena re-habilitar.
  }

  finalizarDesdeAviso() {
    this.detenerCuentaRegresiva();
    this.avisoFinJornada.set(null);
    this.jornada.finalizar().subscribe({
      next: () => this.inact.setJornada(null),
      error: () => {},
    });
  }

  private iniciarCuentaRegresiva() {
    this.detenerCuentaRegresiva();
    this.cuentaRegresivaSegs.set(300); // 5 minutos
    this.cuentaRegresivaTimer = setInterval(() => {
      const restantes = this.cuentaRegresivaSegs() - 1;
      if (restantes <= 0) {
        this.detenerCuentaRegresiva();
        this.avisoFinJornada.set(null);
        this.jornada.finalizar().subscribe({
          next: () => this.inact.setJornada(null),
          error: () => {},
        });
      } else {
        this.cuentaRegresivaSegs.set(restantes);
      }
    }, 1000);
  }

  private detenerCuentaRegresiva() {
    if (this.cuentaRegresivaTimer) {
      clearInterval(this.cuentaRegresivaTimer);
      this.cuentaRegresivaTimer = null;
    }
  }

  private detenerAvisoDismissedTimer() {
    if (this.avisoDismissedTimer) {
      clearTimeout(this.avisoDismissedTimer);
      this.avisoDismissedTimer = null;
    }
  }

  private loadConfig() {
    this.config.getPublico().subscribe(res => {
      if (res.success) {
        const cfg = res.data;
        this.inact.init(cfg['inactividad_umbral_min'] ?? 90, cfg['inactividad_alerta_min'] ?? 60);
        if (Array.isArray(cfg['jornada_dias_laborales'])) {
          this.jornada.diasLaborales.set(cfg['jornada_dias_laborales']);
        }
      }
    });

    this.captura.getConfig().subscribe(res => {
      if (res.success) {
        this.captura.init(res.data.habilitadas, res.data.intervalo_min);
        // Si la jornada ya está activa al cargar, notificar al servicio
        this.captura.onJornadaEstado(this.jornada.estadoActual());
      }
    });
  }
}
