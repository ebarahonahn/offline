import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CapturaService } from '../../core/services/captura.service';
import { UsuarioService } from '../../core/services/usuario.service';

@Component({
  selector: 'app-capturas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Capturas de pantalla</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Monitoreo visual de jornadas activas</p>
      </div>

      <!-- Filtros -->
      <div class="card p-4 flex flex-wrap gap-4 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha</label>
          <input type="date" [(ngModel)]="filtroFecha" class="form-input text-sm">
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Usuario</label>
          <select [(ngModel)]="filtroUsuario" class="form-input text-sm min-w-[180px]">
            <option value="">Todos</option>
            @for (u of usuarios(); track u.id) {
              <option [value]="u.id">{{ u.nombre }} {{ u.apellido }}</option>
            }
          </select>
        </div>
        <button (click)="buscar()" class="btn-primary text-sm">Buscar</button>
        <button (click)="limpiar()" class="btn-secondary text-sm">Limpiar</button>
        <span class="ml-auto text-xs text-gray-500 dark:text-gray-400 self-center">
          {{ pagination()?.total ?? 0 }} capturas encontradas
        </span>
      </div>

      <!-- Grid de capturas -->
      @if (cargando()) {
        <div class="flex justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
        </div>
      } @else if (capturas().length === 0) {
        <div class="card p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
          </svg>
          <p class="text-gray-500 dark:text-gray-400">No hay capturas para los filtros seleccionados</p>
        </div>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          @for (cap of capturas(); track cap.id) {
            <div class="card overflow-hidden group cursor-pointer relative" (click)="verImagen(cap)">
              <div class="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img [src]="imgUrl(cap.ruta_archivo)"
                     [alt]="'Captura ' + cap.id"
                     class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                     loading="lazy">
              </div>
              <div class="p-2">
                <p class="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                  {{ cap.nombre }} {{ cap.apellido }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatFecha(cap.capturado_en) }}
                </p>
              </div>
              <div class="hidden group-hover:flex absolute inset-0 bg-black/40 items-center justify-center gap-2 transition-opacity">
                <button (click)="$event.stopPropagation(); capturaParaEliminar.set(cap)"
                        class="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700">
                  Eliminar
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Paginación -->
        @if ((pagination()?.pages ?? 0) > 1) {
          <div class="flex items-center justify-center gap-2">
            <button [disabled]="paginaActual() <= 1"
                    (click)="cambiarPagina(paginaActual() - 1)"
                    class="btn-secondary text-sm disabled:opacity-50">Anterior</button>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Página {{ paginaActual() }} de {{ pagination()?.pages }}
            </span>
            <button [disabled]="paginaActual() >= (pagination()?.pages ?? 1)"
                    (click)="cambiarPagina(paginaActual() + 1)"
                    class="btn-secondary text-sm disabled:opacity-50">Siguiente</button>
          </div>
        }
      }
    </div>

    <!-- Modal confirmar eliminación -->
    @if (capturaParaEliminar()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
           (click)="capturaParaEliminar.set(null)">
        <div class="card max-w-sm w-full mx-4 p-6 shadow-2xl" (click)="$event.stopPropagation()">
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Eliminar captura</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ¿Eliminar la captura de <span class="font-medium text-gray-700 dark:text-gray-300">{{ capturaParaEliminar()!.nombre }} {{ capturaParaEliminar()!.apellido }}</span>
                del {{ formatFecha(capturaParaEliminar()!.capturado_en) }}? Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-3">
            <button (click)="capturaParaEliminar.set(null)" class="btn-secondary text-sm">Cancelar</button>
            <button (click)="confirmarEliminar()" class="text-sm rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors">Eliminar</button>
          </div>
        </div>
      </div>
    }

    <!-- Lightbox -->
    @if (imagenActiva()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
           (click)="imagenActiva.set(null)">
        <div class="relative max-w-5xl w-full" (click)="$event.stopPropagation()">
          <img [src]="imgUrl(imagenActiva()!.ruta_archivo)"
               class="w-full rounded-lg shadow-2xl object-contain max-h-[85vh]">
          <div class="mt-3 flex items-center justify-between text-sm text-white">
            <span>{{ imagenActiva()!.nombre }} {{ imagenActiva()!.apellido }} — {{ formatFecha(imagenActiva()!.capturado_en) }}</span>
            <button (click)="imagenActiva.set(null)" class="text-white/70 hover:text-white">Cerrar ✕</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CapturasComponent implements OnInit {
  private cs = inject(CapturaService);
  private us = inject(UsuarioService);

  capturas            = signal<any[]>([]);
  pagination          = signal<any>(null);
  usuarios            = signal<any[]>([]);
  cargando            = signal(false);
  imagenActiva        = signal<any>(null);
  capturaParaEliminar = signal<any>(null);
  paginaActual        = signal(1);

  filtroFecha   = new Date().toISOString().slice(0, 10);
  filtroUsuario = '';

  ngOnInit() {
    this.us.getAll({ page: 1, limit: 100, estado: 'activo' }).subscribe({
      next: (r: any) => { if (r.success) this.usuarios.set(r.data ?? []); },
      error: (err: any) => console.error('[Capturas] Error cargando usuarios:', err.status),
    });
    this.buscar();
  }

  buscar(pagina = 1) {
    this.cargando.set(true);
    this.paginaActual.set(pagina);
    const params: any = { page: pagina, limit: 20 };
    if (this.filtroFecha)   params.fecha      = this.filtroFecha;
    if (this.filtroUsuario) params.usuario_id = this.filtroUsuario;

    this.cs.listar(params).subscribe({
      next: (r: any) => {
        this.capturas.set(r.rows ?? []);
        this.pagination.set(r.pagination);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  limpiar() {
    this.filtroFecha   = '';
    this.filtroUsuario = '';
    this.buscar();
  }

  cambiarPagina(p: number) { this.buscar(p); }

  verImagen(cap: any) { this.imagenActiva.set(cap); }

  confirmarEliminar() {
    const cap = this.capturaParaEliminar();
    if (!cap) return;
    this.capturaParaEliminar.set(null);
    this.cs.eliminar(cap.id).subscribe(() => {
      this.capturas.update(list => list.filter(c => c.id !== cap.id));
    });
  }

  imgUrl(ruta: string) { return this.cs.urlImagen(ruta); }

  formatFecha(dt: string) {
    return new Date(dt).toLocaleString('es', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
