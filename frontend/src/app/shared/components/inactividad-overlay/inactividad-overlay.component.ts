import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InactividadService } from '../../../core/services/inactividad.service';

@Component({
  selector: 'app-inactividad-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (inact.mostrarAlerta() || inact.enInactividad()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
        <div class="card max-w-md w-full mx-4 p-8 text-center shadow-2xl">
          <!-- Icono -->
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
               [class]="inact.enInactividad() ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'">
            <svg class="h-8 w-8" [class]="inact.enInactividad() ? 'text-red-500' : 'text-amber-500'"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          @if (inact.enInactividad()) {
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Inactividad detectada
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-6">
              Tu jornada ha sido pausada por inactividad. Haz clic en el botón para reanudar.
            </p>
            <button class="btn-primary w-full text-base py-3" (click)="inact.confirmarPresencia()">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Sigo trabajando
            </button>
          } @else {
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              ¿Sigues ahí?
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-2">
              Se detectó inactividad. Tu sesión se pausará en:
            </p>
            <p class="text-4xl font-bold text-amber-500 mb-6">
              {{ inact.tiempoAlerta() }}s
            </p>
            <button class="btn-warning w-full text-base py-3" (click)="inact.confirmarPresencia()">
              Sigo trabajando
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class InactividadOverlayComponent {
  inact = inject(InactividadService);
}
