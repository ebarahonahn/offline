import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SoporteService, Ticket, TicketRespuesta, TicketEstado, TicketPrioridad, TicketCategoria } from '../../core/services/soporte.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { RolPipe } from '../../shared/pipes/rol.pipe';

@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, RolPipe],
  template: `
  <div class="space-y-5">

    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Soporte Técnico</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Reporta problemas o solicita ayuda sobre el sistema</p>
      </div>
      <button class="btn-primary gap-2 self-start sm:self-auto" (click)="abrirNuevoTicket()">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Nuevo ticket
      </button>
    </div>

    <!-- Filtros -->
    <div class="card p-4">
      <div class="flex flex-wrap gap-3">
        <select class="form-input w-auto min-w-[140px]" [(ngModel)]="filtros.estado" (change)="cargar()">
          <option value="">Todos los estados</option>
          <option value="abierto">Abierto</option>
          <option value="en_proceso">En proceso</option>
          <option value="pendiente_usuario">Pendiente usuario</option>
          <option value="resuelto">Resuelto</option>
          <option value="cerrado">Cerrado</option>
        </select>
        <select class="form-input w-auto min-w-[130px]" [(ngModel)]="filtros.prioridad" (change)="cargar()">
          <option value="">Toda prioridad</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <select class="form-input w-auto min-w-[140px]" [(ngModel)]="filtros.categoria" (change)="cargar()">
          <option value="">Toda categoría</option>
          <option value="error">Error del sistema</option>
          <option value="funcionalidad">Funcionalidad</option>
          <option value="solicitud">Solicitud</option>
          <option value="consulta">Consulta</option>
          <option value="otro">Otro</option>
        </select>
        @if (esAdmin()) {
          <input type="date" class="form-input w-auto" [(ngModel)]="filtros.fecha_inicio" (change)="cargar()" placeholder="Desde">
          <input type="date" class="form-input w-auto" [(ngModel)]="filtros.fecha_fin"    (change)="cargar()" placeholder="Hasta">
        }
        <button class="btn-secondary text-sm" (click)="limpiarFiltros()">Limpiar</button>
      </div>
    </div>

    <!-- Tabla de tickets -->
    <div class="card overflow-hidden">
      @if (cargando()) {
        <div class="flex justify-center py-12">
          <svg class="animate-spin h-7 w-7 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      } @else if (tickets().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="rounded-full p-4 bg-gray-100 dark:bg-gray-800 mb-4">
            <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
          </div>
          <p class="text-gray-500 dark:text-gray-400 font-medium">No hay tickets</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Crea un nuevo ticket para recibir ayuda</p>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Ticket</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Título</th>
                @if (esAdmin()) {
                  <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Solicitante</th>
                }
                <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Prioridad</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Estado</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Resp.</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Fecha</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              @for (ticket of tickets(); track ticket.id) {
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td class="px-4 py-3">
                    <span class="font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">{{ ticket.numero }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-900 dark:text-white truncate max-w-[220px]">{{ ticket.titulo }}</p>
                    <p class="text-xs text-gray-400 capitalize">{{ categoriaLabel(ticket.categoria) }}</p>
                  </td>
                  @if (esAdmin()) {
                    <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {{ ticket.usuario_nombre }} {{ ticket.usuario_apellido }}
                    </td>
                  }
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                          [class]="prioridadClass(ticket.prioridad)">
                      {{ prioridadLabel(ticket.prioridad) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                          [class]="estadoClass(ticket.estado)">
                      {{ estadoLabel(ticket.estado) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                    {{ ticket.total_respuestas ?? 0 }}
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {{ formatFecha(ticket.created_at) }}
                  </td>
                  <td class="px-4 py-3">
                    <button class="rounded-lg p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            title="Ver detalle" (click)="verDetalle(ticket)">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        @if (pagination().pages > 1) {
          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {{ (pagination().page - 1) * pagination().limit + 1 }}–{{ minVal(pagination().page * pagination().limit, pagination().total) }} de {{ pagination().total }}
            </p>
            <div class="flex gap-1">
              <button class="btn-secondary px-3 py-1.5 text-xs" [disabled]="!pagination().hasPrev" (click)="cambiarPagina(filtros.page - 1)">Anterior</button>
              <button class="btn-secondary px-3 py-1.5 text-xs" [disabled]="!pagination().hasNext" (click)="cambiarPagina(filtros.page + 1)">Siguiente</button>
            </div>
          </div>
        }
      }
    </div>
  </div>

  <!-- ── Modal: Nuevo ticket ─────────────────────────────────────────────── -->
  @if (showNuevo()) {
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="card w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Nuevo ticket de soporte</h3>
          <button class="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  (click)="cerrarNuevo()">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="form-label">Título <span class="text-red-500">*</span></label>
            <input type="text" class="form-input" [(ngModel)]="nuevoForm.titulo"
                   placeholder="Describe brevemente el problema o solicitud" maxlength="255">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Categoría <span class="text-red-500">*</span></label>
              <select class="form-input" [(ngModel)]="nuevoForm.categoria">
                <option value="error">Error del sistema</option>
                <option value="funcionalidad">Funcionalidad</option>
                <option value="solicitud">Solicitud</option>
                <option value="consulta">Consulta</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label class="form-label">Prioridad</label>
              <select class="form-input" [(ngModel)]="nuevoForm.prioridad">
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">Descripción <span class="text-red-500">*</span></label>
            <textarea class="form-input resize-none" rows="5" [(ngModel)]="nuevoForm.descripcion"
                      placeholder="Describe con detalle el problema, los pasos para reproducirlo, o tu solicitud..."></textarea>
          </div>
          @if (errorNuevo()) {
            <p class="text-sm text-red-600 dark:text-red-400">{{ errorNuevo() }}</p>
          }
        </div>
        <div class="flex gap-3 px-5 pb-5">
          <button class="btn-secondary flex-1" (click)="cerrarNuevo()">Cancelar</button>
          <button class="btn-primary flex-1" (click)="crearTicket()" [disabled]="loadingNuevo()">
            @if (loadingNuevo()) { Enviando... } @else { Enviar ticket }
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ── Modal: Detalle del ticket ──────────────────────────────────────── -->
  @if (ticketDetalle()) {
    <div class="fixed inset-0 z-40 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div class="card w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 my-6">

        <!-- Header -->
        <div class="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{{ ticketDetalle()!.numero }}</span>
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                    [class]="estadoClass(ticketDetalle()!.estado)">{{ estadoLabel(ticketDetalle()!.estado) }}</span>
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                    [class]="prioridadClass(ticketDetalle()!.prioridad)">{{ prioridadLabel(ticketDetalle()!.prioridad) }}</span>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ ticketDetalle()!.titulo }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ categoriaLabel(ticketDetalle()!.categoria) }} &nbsp;·&nbsp;
              {{ ticketDetalle()!.usuario_nombre }} {{ ticketDetalle()!.usuario_apellido }} &nbsp;·&nbsp;
              {{ formatFecha(ticketDetalle()!.created_at) }}
            </p>
          </div>
          <button class="ml-3 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                  (click)="cerrarDetalle()">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Acciones admin/supervisor -->
        @if (esAdmin()) {
          <div class="flex flex-wrap gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Estado:</label>
              <select class="form-input py-1 text-xs w-auto" [(ngModel)]="nuevoEstado" (change)="aplicarEstado()">
                <option value="abierto">Abierto</option>
                <option value="en_proceso">En proceso</option>
                <option value="pendiente_usuario">Pendiente usuario</option>
                <option value="resuelto">Resuelto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Asignar a:</label>
              <select class="form-input py-1 text-xs w-auto" [(ngModel)]="asignadoA" (change)="aplicarAsignacion()">
                <option [ngValue]="null">Sin asignar</option>
                @for (admin of admins(); track admin.id) {
                  <option [ngValue]="admin.id">{{ admin.nombre }} {{ admin.apellido }}</option>
                }
              </select>
            </div>
          </div>
        }

        <!-- Descripción original -->
        <div class="p-5 border-b border-gray-100 dark:border-gray-800">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Descripción</p>
          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{{ ticketDetalle()!.descripcion }}</p>
        </div>

        <!-- Hilo de respuestas -->
        <div class="px-5 py-4 space-y-4 max-h-80 overflow-y-auto">
          @if (!ticketDetalle()!.respuestas?.length) {
            <p class="text-sm text-gray-400 text-center py-4">No hay respuestas aún</p>
          }
          @for (resp of ticketDetalle()!.respuestas; track resp.id) {
            <div class="flex gap-3" [class.flex-row-reverse]="esMioResp(resp)">
              <!-- Avatar -->
              <div class="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                   [class]="esMioResp(resp) ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'">
                {{ iniciales(resp) }}
              </div>
              <!-- Burbuja -->
              <div class="max-w-[75%]" [class]="esMioResp(resp) ? 'items-end' : 'items-start'" style="display:flex;flex-direction:column">
                <div class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                     [class]="bubbleClass(resp, esMioResp(resp))">
                  @if (resp.es_nota_interna) {
                    <p class="text-xs font-semibold mb-1 opacity-70">&#128274; Nota interna</p>
                  }
                  <p class="whitespace-pre-wrap">{{ resp.mensaje }}</p>
                </div>
                <p class="text-xs text-gray-400 mt-1 px-1">
                  {{ resp.usuario_nombre }} {{ resp.usuario_apellido }}
                  <span>({{ resp.usuario_rol | rol }})</span>
                  &nbsp;·&nbsp; {{ formatFechaHora(resp.created_at) }}
                </p>
              </div>
            </div>
          }
        </div>

        <!-- Formulario de respuesta -->
        @if (!['resuelto','cerrado'].includes(ticketDetalle()!.estado)) {
          <div class="p-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <textarea class="form-input resize-none" rows="3" [(ngModel)]="mensajeRespuesta"
                      [placeholder]="esAdmin() ? 'Escribe tu respuesta...' : 'Escribe tu respuesta o información adicional...'"></textarea>
            @if (esAdmin()) {
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input type="checkbox" class="rounded" [(ngModel)]="esNotaInterna">
                Nota interna (no visible para el usuario)
              </label>
            }
            @if (errorRespuesta()) {
              <p class="text-sm text-red-600 dark:text-red-400">{{ errorRespuesta() }}</p>
            }
            <button class="btn-primary w-full" (click)="enviarRespuesta()" [disabled]="loadingRespuesta()">
              @if (loadingRespuesta()) { Enviando... } @else { Enviar respuesta }
            </button>
          </div>
        } @else {
          <div class="px-5 pb-5">
            <p class="text-center text-sm text-gray-400 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              Este ticket está {{ ticketDetalle()!.estado === 'resuelto' ? 'resuelto' : 'cerrado' }} — no se pueden enviar más mensajes
            </p>
          </div>
        }

      </div>
    </div>
  }
  `,
})
export class SoporteComponent implements OnInit {
  private svc  = inject(SoporteService);
  private auth = inject(AuthService);
  private us   = inject(UsuarioService);

  tickets    = signal<Ticket[]>([]);
  pagination = signal<any>({ page: 1, limit: 20, total: 0, pages: 1, hasNext: false, hasPrev: false });
  cargando   = signal(false);
  admins     = signal<any[]>([]);

  showNuevo    = signal(false);
  loadingNuevo = signal(false);
  errorNuevo   = signal('');
  nuevoForm    = { titulo: '', descripcion: '', categoria: 'consulta' as TicketCategoria, prioridad: 'media' as TicketPrioridad };

  ticketDetalle    = signal<Ticket | null>(null);
  mensajeRespuesta = '';
  esNotaInterna    = false;
  loadingRespuesta = signal(false);
  errorRespuesta   = signal('');
  nuevoEstado      = '';
  asignadoA: number | null = null;

  filtros: any = { estado: '', prioridad: '', categoria: '', fecha_inicio: '', fecha_fin: '', page: 1, limit: 20 };

  esAdmin = computed(() => {
    const rol = this.auth.userRole();
    return rol === 'admin' || rol === 'supervisor';
  });

  ngOnInit() {
    this.cargar();
    if (this.esAdmin()) this.cargarAdmins();
  }

  cargar() {
    this.cargando.set(true);
    const params: any = { page: this.filtros.page, limit: this.filtros.limit };
    if (this.filtros.estado)       params['estado']       = this.filtros.estado;
    if (this.filtros.prioridad)    params['prioridad']    = this.filtros.prioridad;
    if (this.filtros.categoria)    params['categoria']    = this.filtros.categoria;
    if (this.filtros.fecha_inicio) params['fecha_inicio'] = this.filtros.fecha_inicio;
    if (this.filtros.fecha_fin)    params['fecha_fin']    = this.filtros.fecha_fin;

    this.svc.getAll(params).subscribe({
      next: res => {
        this.tickets.set(res.data);
        this.pagination.set(res.pagination);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  cargarAdmins() {
    this.us.getAll({ limit: 200, estado: 'activo' }).subscribe(res => {
      const todos = Array.isArray(res.data) ? res.data : (res as any).data ?? [];
      this.admins.set(todos.filter((u: any) => u.rol === 'admin' || u.rol === 'supervisor'));
    });
  }

  limpiarFiltros() {
    this.filtros = { estado: '', prioridad: '', categoria: '', fecha_inicio: '', fecha_fin: '', page: 1, limit: 20 };
    this.cargar();
  }

  cambiarPagina(p: number) {
    this.filtros.page = p;
    this.cargar();
  }

  // ── Nuevo ticket ───────────────────────────────────────────────────────────

  abrirNuevoTicket() {
    this.nuevoForm = { titulo: '', descripcion: '', categoria: 'consulta', prioridad: 'media' };
    this.errorNuevo.set('');
    this.showNuevo.set(true);
  }

  cerrarNuevo() { this.showNuevo.set(false); }

  crearTicket() {
    if (!this.nuevoForm.titulo.trim())       { this.errorNuevo.set('El título es obligatorio'); return; }
    if (!this.nuevoForm.descripcion.trim())  { this.errorNuevo.set('La descripción es obligatoria'); return; }

    this.loadingNuevo.set(true);
    this.errorNuevo.set('');
    this.svc.crear(this.nuevoForm).subscribe({
      next: () => {
        this.loadingNuevo.set(false);
        this.cerrarNuevo();
        this.cargar();
      },
      error: (err: any) => {
        this.errorNuevo.set(err.userMessage || 'Error al crear el ticket');
        this.loadingNuevo.set(false);
      },
    });
  }

  // ── Detalle ────────────────────────────────────────────────────────────────

  verDetalle(ticket: Ticket) {
    this.mensajeRespuesta = '';
    this.esNotaInterna    = false;
    this.errorRespuesta.set('');
    this.svc.getById(ticket.id).subscribe(res => {
      this.ticketDetalle.set(res.data);
      this.nuevoEstado = res.data.estado;
      this.asignadoA   = res.data.asignado_a;
    });
  }

  cerrarDetalle() { this.ticketDetalle.set(null); }

  enviarRespuesta() {
    if (!this.mensajeRespuesta.trim()) { this.errorRespuesta.set('Escribe un mensaje'); return; }
    this.loadingRespuesta.set(true);
    this.errorRespuesta.set('');
    this.svc.responder(this.ticketDetalle()!.id, this.mensajeRespuesta, this.esNotaInterna).subscribe({
      next: res => {
        this.ticketDetalle.set(res.data);
        this.mensajeRespuesta = '';
        this.esNotaInterna    = false;
        this.loadingRespuesta.set(false);
        this.cargar();
      },
      error: (err: any) => {
        this.errorRespuesta.set(err.userMessage || 'Error al enviar');
        this.loadingRespuesta.set(false);
      },
    });
  }

  aplicarEstado() {
    if (!this.nuevoEstado) return;
    this.svc.cambiarEstado(this.ticketDetalle()!.id, this.nuevoEstado as TicketEstado).subscribe(res => {
      this.ticketDetalle.set(res.data);
      this.cargar();
    });
  }

  aplicarAsignacion() {
    this.svc.asignar(this.ticketDetalle()!.id, this.asignadoA).subscribe(res => {
      this.ticketDetalle.set(res.data);
    });
  }

  // ── Helpers de vista ───────────────────────────────────────────────────────

  esMioResp(resp: TicketRespuesta) {
    return resp.usuario_id === this.auth.currentUser()?.id;
  }

  iniciales(resp: TicketRespuesta) {
    return `${resp.usuario_nombre?.[0] ?? ''}${resp.usuario_apellido?.[0] ?? ''}`.toUpperCase();
  }

  bubbleClass(resp: TicketRespuesta, esMio: boolean) {
    if (resp.es_nota_interna) return 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
    if (esMio) return 'bg-primary-600 text-white';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
  }

  estadoLabel(e: string) {
    const m: Record<string, string> = { abierto:'Abierto', en_proceso:'En proceso', pendiente_usuario:'Pendiente', resuelto:'Resuelto', cerrado:'Cerrado' };
    return m[e] ?? e;
  }

  estadoClass(e: string) {
    const m: Record<string, string> = {
      abierto:           'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800',
      en_proceso:        'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-800',
      pendiente_usuario: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800',
      resuelto:          'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800',
      cerrado:           'text-gray-500 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
    };
    return m[e] ?? 'text-gray-500 bg-gray-100 border-gray-200';
  }

  prioridadLabel(p: string) {
    const m: Record<string, string> = { baja:'Baja', media:'Media', alta:'Alta', urgente:'Urgente' };
    return m[p] ?? p;
  }

  prioridadClass(p: string) {
    const m: Record<string, string> = {
      baja:    'text-gray-500 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
      media:   'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800',
      alta:    'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800',
      urgente: 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800',
    };
    return m[p] ?? 'text-gray-500 bg-gray-100 border-gray-200';
  }

  categoriaLabel(c: string) {
    const m: Record<string, string> = { funcionalidad:'Funcionalidad', error:'Error del sistema', solicitud:'Solicitud', consulta:'Consulta', otro:'Otro' };
    return m[c] ?? c;
  }

  formatFecha(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' });
  }

  formatFechaHora(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleString('es', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  }

  minVal(a: number, b: number) { return Math.min(a, b); }
}
