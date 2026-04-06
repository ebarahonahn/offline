import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { NotificacionService } from '../../../core/services/notificacion.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <!-- Estado de jornada -->
      <div class="flex items-center gap-3">
        @if (jornada.jornadaActiva()) {
          <span class="flex items-center gap-2 text-sm font-medium"
                [class]="estadoClass()">
            <span class="h-2 w-2 rounded-full animate-pulse" [class]="dotClass()"></span>
            {{ estadoLabel() }}
          </span>
          @if (jornada.estadoActual() === 'activa') {
            <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {{ formatTime(jornada.tiempoTrabajado()) }}
            </span>
          }
        } @else {
          <span class="text-sm text-gray-400">Sin jornada activa</span>
        }
      </div>

      <!-- Acciones derechas -->
      <div class="flex items-center gap-3">

        <!-- Campana de notificaciones -->
        <div class="relative">
          <button (click)="togglePanel()"
                  class="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            @if (notif.pendientes().length > 0) {
              <span class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {{ notif.pendientes().length > 9 ? '9+' : notif.pendientes().length }}
              </span>
            }
          </button>

          <!-- Panel desplegable -->
          @if (panelAbierto()) {
            <div class="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 z-50">
              <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
                <span class="text-sm font-semibold text-gray-900 dark:text-white">Notificaciones</span>
                @if (notif.pendientes().length > 0) {
                  <button (click)="marcarTodas()"
                          class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
                    Marcar todas como leídas
                  </button>
                }
              </div>
              <div class="max-h-72 overflow-y-auto">
                @if (notif.pendientes().length === 0) {
                  <p class="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">Sin notificaciones pendientes</p>
                }
                @for (n of notif.pendientes(); track n.id) {
                  <div class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div class="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary-500"></div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-gray-800 dark:text-gray-200 leading-snug">{{ n.mensaje }}</p>
                      <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ formatFecha(n.created_at) }}</p>
                    </div>
                    <button (click)="marcarLeida(n.id)"
                            class="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            title="Marcar como leída">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Dark mode toggle -->
        <button (click)="theme.toggle()"
                class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
          @if (theme.darkMode()) {
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          } @else {
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          }
        </button>

        <!-- Logout -->
        <button (click)="auth.logout()"
                class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-red-400">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  auth    = inject(AuthService);
  theme   = inject(ThemeService);
  jornada = inject(JornadaService);
  notif   = inject(NotificacionService);

  panelAbierto = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) this.panelAbierto.set(false);
  }

  togglePanel() { this.panelAbierto.update(v => !v); }

  marcarLeida(id: number) {
    this.notif.marcarLeida(id).subscribe();
  }

  marcarTodas() {
    this.notif.marcarTodasLeidas().subscribe();
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  estadoClass() {
    const e = this.jornada.estadoActual();
    const classes: Record<string, string> = {
      activa:      'text-emerald-600 dark:text-emerald-400',
      pausada:     'text-amber-600 dark:text-amber-400',
      finalizada:  'text-gray-500',
      anulada:     'text-gray-500',
      sin_jornada: 'text-gray-500',
    };
    return classes[e] ?? 'text-gray-500';
  }

  dotClass() {
    const e = this.jornada.estadoActual();
    const classes: Record<string, string> = {
      activa:      'bg-emerald-500',
      pausada:     'bg-amber-500',
      finalizada:  'bg-gray-400',
      anulada:     'bg-gray-400',
      sin_jornada: 'bg-gray-400',
    };
    return classes[e] ?? 'bg-gray-400';
  }

  estadoLabel() {
    const labels: Record<string, string> = {
      activa: 'Jornada activa', pausada: 'En pausa',
      finalizada: 'Finalizada', anulada: 'Anulada', sin_jornada: '',
    };
    return labels[this.jornada.estadoActual()] ?? '';
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
}
