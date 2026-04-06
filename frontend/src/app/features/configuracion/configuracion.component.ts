import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 max-w-3xl">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Parámetros del sistema</p>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-800">
        <nav class="flex gap-6">
          @for (tab of tabs; track tab.key) {
            <button (click)="activeTab.set(tab.key)"
                    class="pb-3 text-sm font-medium border-b-2 transition-colors"
                    [class]="activeTab() === tab.key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'">
              {{ tab.label }}
            </button>
          }
        </nav>
      </div>

      <!-- Config items -->
      @if (configByGroup().length > 0) {
        <div class="card divide-y divide-gray-100 dark:divide-gray-800">
          @for (item of configByGroup(); track item.clave) {
            <div class="flex items-center justify-between px-5 py-4">
              <div class="flex-1 mr-6">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ item.descripcion || item.clave }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{{ item.clave }}</p>
              </div>
              <div class="shrink-0">
                @if (item.clave === 'empresa_logo_url') {
                  <div class="flex items-center gap-3">
                    @if (logoPreview() || item.valor) {
                      <img [src]="logoPreview() || uploadsBase + item.valor"
                           class="h-10 w-auto max-w-[120px] rounded border border-gray-200 dark:border-gray-700 object-contain bg-white p-1"
                           alt="Logo empresa">
                    } @else {
                      <span class="text-xs text-gray-400">Sin logo</span>
                    }
                    <label class="btn-secondary text-xs cursor-pointer">
                      {{ uploadingLogo() ? 'Subiendo...' : 'Cambiar' }}
                      <input type="file" accept="image/png,image/jpeg,image/webp"
                             class="hidden" (change)="onLogoSelected($event)" [disabled]="uploadingLogo()">
                    </label>
                  </div>
                  @if (logoError()) {
                    <p class="mt-1 text-xs text-red-500 dark:text-red-400">{{ logoError() }}</p>
                  }
                } @else if (item.tipo === 'boolean') {
                  <button type="button" (click)="toggleBool(item)"
                          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                          [class]="item.valorParsed ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'">
                    <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
                          [class]="item.valorParsed ? 'translate-x-5' : 'translate-x-0'"></span>
                  </button>
                } @else if (item.tipo === 'number') {
                  <input type="number" [(ngModel)]="item.valor" (change)="updateItem(item)"
                         class="form-input w-24 text-center text-sm">
                } @else {
                  <input type="text" [(ngModel)]="item.valor" (change)="updateItem(item)"
                         class="form-input w-40 text-sm">
                }
              </div>
            </div>
          }
        </div>

        <div class="flex justify-end">
          <button class="btn-primary" (click)="saveAll()" [disabled]="saving()">
            {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>

        @if (savedMsg()) {
          <div class="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            {{ savedMsg() }}
          </div>
        }
      }
    </div>
  `,
})
export class ConfiguracionComponent implements OnInit {
  private cs = inject(ConfiguracionService);

  allConfig      = signal<any[]>([]);
  activeTab      = signal('general');
  saving         = signal(false);
  savedMsg       = signal('');
  logoPreview    = signal<string>('');
  uploadingLogo  = signal(false);
  logoError      = signal('');

  readonly uploadsBase = environment.apiUrl.replace('/api', '') + '/uploads/';

  tabs = [
    { key: 'general',    label: 'General' },
    { key: 'jornada',    label: 'Jornada' },
    { key: 'inactividad',label: 'Inactividad' },
    { key: 'seguridad',  label: 'Seguridad' },
    { key: 'monitoreo',  label: 'Monitoreo' },
  ];

  ngOnInit() {
    this.cs.getAll().subscribe(r => { if (r.success) this.allConfig.set(r.data); });
  }

  configByGroup() {
    return this.allConfig().filter(c => c.grupo === this.activeTab());
  }

  onLogoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.logoError.set('');

    if (file.size > 2 * 1024 * 1024) {
      this.logoError.set('La imagen supera el tamaño máximo de 2 MB.');
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.logoPreview.set(base64);
      this.uploadingLogo.set(true);
      this.cs.uploadLogo(base64).subscribe({
        next: (r) => {
          if (r.success) {
            const item = this.allConfig().find(c => c.clave === 'empresa_logo_url');
            if (item) item.valor = r.data.url;
            this.savedMsg.set('Logo actualizado correctamente');
            setTimeout(() => this.savedMsg.set(''), 3000);
          }
          this.uploadingLogo.set(false);
        },
        error: (err) => {
          this.logoPreview.set('');
          this.uploadingLogo.set(false);
          this.logoError.set(err.error?.message || 'Error al subir el logo.');
        },
      });
    };
    reader.readAsDataURL(file);
  }

  toggleBool(item: any) {
    item.valorParsed = !item.valorParsed;
    item.valor = String(item.valorParsed);
  }

  updateItem(item: any) {
    if (item.tipo === 'number') item.valorParsed = Number(item.valor);
  }

  saveAll() {
    this.saving.set(true);
    const updates = this.configByGroup().reduce((acc, c) => ({ ...acc, [c.clave]: c.valor }), {});
    this.cs.updateBulk(updates).subscribe({
      next: () => {
        this.savedMsg.set('Configuración guardada correctamente');
        this.saving.set(false);
        setTimeout(() => this.savedMsg.set(''), 3000);
      },
      error: () => { this.saving.set(false); },
    });
  }
}
