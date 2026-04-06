import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActividadService } from '../../../core/services/actividad.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { Actividad, TipoActividad } from '../../../core/models/actividad.model';

interface Evidencia {
  id: number;
  nombre: string;
  descripcion: string | null;
  archivo_url: string;
  created_at: string;
}

@Component({
  selector: 'app-actividades-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Actividades</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Registro de actividades de la jornada</p>
        </div>
        @if (jornada.jornadaActiva()) {
          <button class="btn-primary" (click)="showForm.set(true)">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Nueva Actividad
          </button>
        }
      </div>

      <!-- Tabla -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Actividad</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Tipo</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Inicio</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Fin</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Duración</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              @for (act of actividades(); track act.id) {
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-900 dark:text-white">{{ act.nombre }}</p>
                    @if (act.descripcion) {
                      <p class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{{ act.descripcion }}</p>
                    }
                  </td>
                  <td class="px-4 py-3">
                    @if (act.tipo_nombre) {
                      <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                            [style.background-color]="act.color_hex">
                        {{ act.tipo_nombre }}
                      </span>
                    } @else {
                      <span class="text-gray-400">-</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{{ formatTime(act.hora_inicio) }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{{ act.hora_fin ? formatTime(act.hora_fin) : '-' }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatDuration(act.tiempo_min) }}</td>
                  <td class="px-4 py-3">
                    <span [class]="estadoClass(act.estado)">{{ act.estado }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex gap-1">
                      <button (click)="openDetalle(act)" title="Detalle y evidencias"
                              class="rounded p-1 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                        </svg>
                      </button>
                      <button (click)="openEdit(act)" title="Editar"
                              class="rounded p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                      </button>
                      <button (click)="actParaEliminar.set(act)"
                              [disabled]="act.estado === 'completada'"
                              [title]="act.estado === 'completada' ? 'No se puede eliminar una actividad completada' : 'Eliminar'"
                              class="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                    <p class="text-lg mb-1">Sin actividades registradas</p>
                    <p class="text-sm">Registra tus actividades de trabajo diarias</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal confirmar eliminación -->
    @if (actParaEliminar()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
           (click)="actParaEliminar.set(null)">
        <div class="card max-w-sm w-full mx-4 p-6 shadow-2xl" (click)="$event.stopPropagation()">
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Eliminar actividad</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ¿Eliminar <span class="font-medium text-gray-700 dark:text-gray-300">{{ actParaEliminar()!.nombre }}</span>?
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-3">
            <button (click)="actParaEliminar.set(null)" class="btn-secondary text-sm">Cancelar</button>
            <button (click)="confirmarEliminar()" class="text-sm rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors">Eliminar</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal nueva / editar actividad -->
    @if (showForm()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            {{ actEditando() ? 'Editar Actividad' : 'Nueva Actividad' }}
          </h3>
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="form-label">Nombre *</label>
              <input type="text" formControlName="nombre" class="form-input" placeholder="Ej: Reunión de planificación">
            </div>
            <div>
              <label class="form-label">Tipo de actividad</label>
              <select formControlName="tipo_actividad_id" class="form-input">
                <option [value]="null">Sin tipo</option>
                @for (tipo of tipos(); track tipo.id) {
                  <option [value]="tipo.id">{{ tipo.nombre }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Hora inicio</label>
                <input type="datetime-local" formControlName="hora_inicio" class="form-input">
              </div>
              <div>
                <label class="form-label">Hora fin</label>
                <input type="datetime-local" formControlName="hora_fin" class="form-input">
              </div>
            </div>
            @if (actEditando()) {
              <div>
                <label class="form-label">Estado</label>
                <select formControlName="estado" class="form-input">
                  <option value="en_progreso">En progreso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            }
            <div>
              <label class="form-label">Descripción</label>
              <textarea formControlName="descripcion" rows="3" class="form-input resize-none"
                        placeholder="Descripción opcional..."></textarea>
            </div>
            @if (formError()) {
              <p class="text-sm text-red-500">{{ formError() }}</p>
            }
            <div class="flex gap-3 pt-2">
              <button type="button" class="btn-secondary flex-1" (click)="closeForm()">Cancelar</button>
              <button type="submit" class="btn-primary flex-1" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : (actEditando() ? 'Guardar cambios' : 'Guardar') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
    <!-- Visor de evidencia -->
    @if (evVisor()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
           (click)="cerrarVisor()">
        <div class="relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl mx-4
                    w-full max-w-3xl max-h-[92vh] overflow-hidden"
             (click)="$event.stopPropagation()">

          <!-- Cabecera -->
          <div class="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div class="min-w-0 pr-4">
              <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ evVisor()!.nombre }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ fileExt(evVisor()!.archivo_url) }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button (click)="descargarEvidencia(evVisor()!)"
                      class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                             bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300
                             hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Descargar
              </button>
              <button (click)="cerrarVisor()"
                      class="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Contenido -->
          <div class="flex flex-col flex-1 overflow-hidden">

            <!-- Preview -->
            <div class="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950 flex items-center justify-center min-h-0">
              @if (isImage(evVisor()!.archivo_url)) {
                <img [src]="actService.urlEvidencia(evVisor()!.archivo_url)"
                     [alt]="evVisor()!.nombre"
                     class="max-w-full max-h-full object-contain">
              } @else {
                <div class="flex flex-col items-center gap-4 py-16">
                  @if (fileExt(evVisor()!.archivo_url) === 'PDF') {
                    <svg class="h-20 w-20 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                    </svg>
                  } @else if (fileExt(evVisor()!.archivo_url) === 'DOCX') {
                    <svg class="h-20 w-20 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                    </svg>
                  } @else {
                    <svg class="h-20 w-20 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                    </svg>
                  }
                  <p class="text-sm text-gray-500 dark:text-gray-400">Vista previa no disponible para este formato</p>
                  <button (click)="descargarEvidencia(evVisor()!)"
                          class="btn-primary text-sm">
                    Descargar archivo
                  </button>
                </div>
              }
            </div>

            <!-- Descripción -->
            @if (evVisor()!.descripcion) {
              <div class="shrink-0 border-t border-gray-200 dark:border-gray-700 px-5 py-4 max-h-40 overflow-y-auto">
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Descripción</p>
                <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{{ evVisor()!.descripcion }}</p>
              </div>
            }

          </div>
        </div>
      </div>
    }

    <!-- Modal detalle + evidencias -->
    @if (actDetalle()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
           (click)="closeDetalle()">
        <div class="card w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
          <!-- Cabecera -->
          <div class="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ actDetalle()!.nombre }}</h3>
              @if (actDetalle()!.tipo_nombre) {
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white mt-1"
                      [style.background-color]="actDetalle()!.color_hex">
                  {{ actDetalle()!.tipo_nombre }}
                </span>
              }
            </div>
            <button (click)="closeDetalle()" class="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="overflow-y-auto flex-1 p-6 space-y-5">
            <!-- Info básica -->
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Inicio</p>
                <p class="font-mono text-gray-900 dark:text-white">{{ formatTime(actDetalle()!.hora_inicio) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Fin</p>
                <p class="font-mono text-gray-900 dark:text-white">{{ actDetalle()!.hora_fin ? formatTime(actDetalle()!.hora_fin!) : '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Duración</p>
                <p class="text-gray-900 dark:text-white">{{ formatDuration(actDetalle()!.tiempo_min) }}</p>
              </div>
            </div>

            <!-- Descripción -->
            @if (actDetalle()!.descripcion) {
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Descripción</p>
                <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ actDetalle()!.descripcion }}</p>
              </div>
            }

            <!-- Sección evidencias -->
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Evidencias</p>

              @if (actDetalle()!.estado === 'completada') {
                <div class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 mb-4">
                  <p class="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    No se pueden agregar evidencias a actividades completadas
                  </p>
                </div>
              } @else {
                <!-- Formulario de subida -->
                <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-4 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                  <textarea rows="2"
                            class="form-input resize-none text-sm w-full"
                            placeholder="Describe lo que realizaste en esta evidencia..."
                            [value]="evDescripcion()"
                            (input)="evDescripcion.set($any($event.target).value)"></textarea>
                  <div class="flex items-center justify-between">
                    @if (evError()) {
                      <p class="text-xs text-red-500">{{ evError() }}</p>
                    } @else {
                      <p class="text-xs text-gray-400">PNG, JPG, WebP (2 MB) · PDF, DOCX, XLSX (10 MB)</p>
                    }
                    <label class="cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                                  bg-primary-50 text-primary-700 hover:bg-primary-100
                                  dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40 transition-colors shrink-0">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                      {{ uploadingEv() ? 'Subiendo...' : 'Adjuntar archivo' }}
                      <input type="file"
                             accept="image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                             class="hidden" [disabled]="uploadingEv()" (change)="onEvidenciaFile($event)">
                    </label>
                  </div>
                </div>
              }

              @if (cargandoEv()) {
                <p class="text-sm text-gray-400 text-center py-4">Cargando evidencias...</p>
              } @else if (evidencias().length === 0) {
                <div class="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 py-8 text-center">
                  <svg class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008M3 9.75A6.75 6.75 0 019.75 3h4.5A6.75 6.75 0 0121 9.75v4.5A6.75 6.75 0 0114.25 21H9.75A6.75 6.75 0 013 14.25V9.75z"/>
                  </svg>
                  <p class="text-sm text-gray-400">Sin evidencias adjuntas</p>
                </div>
              } @else {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  @for (ev of evidencias(); track ev.id) {
                    <div class="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                         (click)="abrirEvidencia(ev)" title="Ver {{ ev.nombre }}">
                      @if (isImage(ev.archivo_url)) {
                        <img [src]="actService.urlEvidencia(ev.archivo_url)"
                             [alt]="ev.nombre"
                             class="w-full h-28 object-cover">
                      } @else {
                        <div class="w-full h-28 flex flex-col items-center justify-center gap-2">
                          @if (fileExt(ev.archivo_url) === 'PDF') {
                            <svg class="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                            </svg>
                          } @else if (fileExt(ev.archivo_url) === 'DOCX') {
                            <svg class="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                            </svg>
                          } @else {
                            <svg class="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                            </svg>
                          }
                          <span class="text-xs font-semibold uppercase tracking-wide" [class]="fileExtClass(ev.archivo_url)">
                            {{ fileExt(ev.archivo_url) }}
                          </span>
                        </div>
                      }
                      <div class="p-2">
                        <p class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{{ ev.nombre }}</p>
                        @if (ev.descripcion) {
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-h-20 overflow-y-auto whitespace-pre-wrap leading-relaxed"
                             (click)="$event.stopPropagation()">{{ ev.descripcion }}</p>
                        }
                      </div>
                      <button (click)="$event.stopPropagation(); eliminarEvidencia(ev)"
                              class="absolute top-1 right-1 hidden group-hover:flex items-center justify-center
                                     h-6 w-6 rounded-full bg-red-600 text-white shadow"
                              title="Eliminar evidencia">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ActividadesListComponent implements OnInit {
  actService        = inject(ActividadService);
  jornada           = inject(JornadaService);
  private fb        = inject(FormBuilder);

  actividades     = signal<Actividad[]>([]);
  tipos           = signal<TipoActividad[]>([]);
  showForm        = signal(false);
  saving          = signal(false);
  formError       = signal('');
  actParaEliminar = signal<Actividad | null>(null);
  actEditando     = signal<Actividad | null>(null);

  // Detalle + evidencias
  actDetalle    = signal<Actividad | null>(null);
  evidencias    = signal<Evidencia[]>([]);
  cargandoEv    = signal(false);
  uploadingEv   = signal(false);
  evError       = signal('');
  evDescripcion = signal('');
  evVisor       = signal<Evidencia | null>(null);

  form = this.fb.group({
    nombre:           ['', Validators.required],
    tipo_actividad_id:[null as number | null],
    hora_inicio:      [this.nowLocal(), Validators.required],
    hora_fin:         [null as string | null],
    estado:           ['en_progreso' as string],
    descripcion:      ['' as string | null],
  });

  ngOnInit() {
    this.loadActividades();
    this.actService.getTipos().subscribe(r => { if (r.success) this.tipos.set(r.data); });
  }

  loadActividades() {
    const jornadaId = this.jornada.jornadaActiva()?.id;
    const params = jornadaId ? { jornada_id: jornadaId } : {};
    this.actService.getAll(params).subscribe(r => {
      if (r.success) this.actividades.set(r.data);
    });
  }

  openEdit(act: Actividad) {
    this.actEditando.set(act);
    this.form.reset({
      nombre:           act.nombre,
      tipo_actividad_id: act.tipo_actividad_id,
      hora_inicio:      this.toLocal(act.hora_inicio),
      hora_fin:         act.hora_fin ? this.toLocal(act.hora_fin) : null,
      estado:           act.estado,
      descripcion:      act.descripcion ?? '',
    });
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.actEditando.set(null);
    this.formError.set('');
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const editando = this.actEditando();

    if (editando) {
      this.actService.update(editando.id, this.form.value as any).subscribe({
        next: (r) => {
          if (r.success) {
            this.actividades.update(list => list.map(a => a.id === editando.id ? r.data : a));
            this.closeForm();
          }
          this.saving.set(false);
        },
        error: (err) => { this.formError.set(err.userMessage ?? 'Error al guardar'); this.saving.set(false); },
      });
    } else {
      const data = { ...this.form.value, jornada_id: this.jornada.jornadaActiva()?.id };
      this.actService.create(data as any).subscribe({
        next: (r) => {
          if (r.success) {
            this.actividades.update(list => [r.data, ...list]);
            this.closeForm();
            this.form.reset({ hora_inicio: this.nowLocal() });
          }
          this.saving.set(false);
        },
        error: (err) => { this.formError.set(err.userMessage ?? 'Error al crear'); this.saving.set(false); },
      });
    }
  }

  confirmarEliminar() {
    const act = this.actParaEliminar();
    if (!act) return;
    this.actParaEliminar.set(null);
    this.actService.delete(act.id).subscribe(r => {
      if (r.success) this.actividades.update(list => list.filter(a => a.id !== act.id));
    });
  }

  openDetalle(act: Actividad) {
    this.actDetalle.set(act);
    this.evidencias.set([]);
    this.evError.set('');
    this.cargandoEv.set(true);
    this.actService.getEvidencias(act.id).subscribe({
      next: (r) => { if (r.success) this.evidencias.set(r.data); this.cargandoEv.set(false); },
      error: () => { this.cargandoEv.set(false); },
    });
  }

  closeDetalle() {
    this.actDetalle.set(null);
    this.evidencias.set([]);
    this.evError.set('');
    this.evDescripcion.set('');
    this.evVisor.set(null);
  }

  onEvidenciaFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    const maxMB = isImg ? 2 : 10;
    if (file.size > maxMB * 1024 * 1024) {
      this.evError.set(`El archivo no puede superar ${maxMB} MB`);
      (event.target as HTMLInputElement).value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const nombre = file.name.replace(/\.[^.]+$/, '');
      this.uploadingEv.set(true);
      this.evError.set('');
      this.actService.addEvidencia(this.actDetalle()!.id, base64, nombre, this.evDescripcion()).subscribe({
        next: (r) => {
          if (r.success) {
            this.evidencias.update(list => [...list, r.data]);
            this.evDescripcion.set('');
          }
          this.uploadingEv.set(false);
        },
        error: (err) => { this.evError.set(err.userMessage ?? 'Error al subir'); this.uploadingEv.set(false); },
      });
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  eliminarEvidencia(ev: Evidencia) {
    const act = this.actDetalle();
    if (!act) return;
    this.actService.deleteEvidencia(act.id, ev.id).subscribe(r => {
      if (r.success) this.evidencias.update(list => list.filter(e => e.id !== ev.id));
    });
  }

  abrirEvidencia(ev: Evidencia) {
    this.evVisor.set(ev);
  }

  cerrarVisor() {
    this.evVisor.set(null);
  }

  descargarEvidencia(ev: Evidencia) {
    window.open(this.actService.urlEvidencia(ev.archivo_url), '_blank');
  }

  isImage(url: string) {
    return /\.(png|jpe?g|webp)$/i.test(url);
  }

  fileExt(url: string) {
    return url.split('.').pop()?.toUpperCase() ?? 'FILE';
  }

  fileExtClass(url: string) {
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'pdf')  return 'text-red-500 dark:text-red-400';
    if (ext === 'docx') return 'text-blue-600 dark:text-blue-400';
    if (ext === 'xlsx') return 'text-green-600 dark:text-green-400';
    return 'text-gray-500';
  }

  estadoClass(estado: string) {
    return { completada: 'badge-activo', en_progreso: 'badge-pausado', cancelada: 'badge-inactivo' }[estado] ?? 'badge-finalizado';
  }

  formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  formatDuration(min?: number | null) {
    if (!min) return '-';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private nowLocal() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  private toLocal(dt: string) {
    const d = new Date(dt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
}
