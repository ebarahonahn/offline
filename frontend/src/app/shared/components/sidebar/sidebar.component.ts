import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { environment } from '../../../../environments/environment';
import { filter } from 'rxjs';
import { RolPipe } from '../../pipes/rol.pipe';

interface NavChild {
  label: string;
  route: string;
  roles?: string[];
}

interface NavItem {
  label: string;
  route?: string;
  icon: SafeHtml;
  roles?: string[];
  children?: NavChild[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RolPipe],
  template: `
    <aside class="flex h-full shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 transition-all duration-300 overflow-hidden"
           [class]="collapsed() ? 'w-16' : 'w-64'">

      <!-- Header -->
      <div class="flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-800"
           [class]="collapsed() ? 'justify-center px-2' : 'gap-3 px-4'">

        @if (!collapsed()) {
          @if (logoUrl()) {
            <img [src]="logoUrl()" class="h-8 w-8 rounded-lg object-contain bg-white p-0.5 shrink-0" alt="Logo">
          } @else {
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          }
          <span class="flex-1 truncate text-base font-semibold text-gray-900 dark:text-white">
            {{ empresaNombre() || 'Teletrabajo' }}
          </span>
        }

        <!-- Botón colapsar / expandir -->
        <button (click)="toggle()"
                [title]="collapsed() ? 'Expandir menú' : 'Colapsar menú'"
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors">
          @if (collapsed()) {
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
            </svg>
          } @else {
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7"/>
            </svg>
          }
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden py-3"
           [class]="collapsed() ? 'px-2' : 'px-3'">
        <ul class="space-y-0.5">
          @for (item of visibleItems(); track item.label) {

            @if (item.children) {
              <!-- Item con submenú -->
              <li>
                <button (click)="toggleGroup(item.label)"
                        [title]="collapsed() ? item.label : ''"
                        class="w-full flex items-center rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        [class]="(collapsed() ? 'justify-center p-2' : 'gap-3 px-3 py-2') + (isGroupActive(item) ? ' text-primary-700 dark:text-primary-400' : ' text-gray-700 dark:text-gray-300')">
                  <span [innerHTML]="item.icon" class="inline-flex shrink-0"></span>
                  @if (!collapsed()) {
                    <span class="flex-1 truncate text-left">{{ item.label }}</span>
                    <svg class="h-4 w-4 shrink-0 transition-transform duration-200"
                         [class]="expandedGroups().has(item.label) ? 'rotate-90' : ''"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  }
                </button>

                <!-- Hijos -->
                @if (!collapsed() && expandedGroups().has(item.label)) {
                  <ul class="mt-0.5 ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5">
                    @for (child of visibleChildren(item); track child.route) {
                      <li>
                        <a [routerLink]="child.route"
                           routerLinkActive="text-primary-700 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20"
                           [routerLinkActiveOptions]="{ exact: true }"
                           class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <span class="h-1.5 w-1.5 rounded-full bg-current opacity-60 shrink-0"></span>
                          <span class="truncate">{{ child.label }}</span>
                        </a>
                      </li>
                    }
                  </ul>
                }
              </li>
            } @else {
              <!-- Item normal -->
              <li>
                <a [routerLink]="item.route"
                   [title]="collapsed() ? item.label : ''"
                   routerLinkActive="bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                   [routerLinkActiveOptions]="{ exact: false }"
                   class="flex items-center rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                   [class]="collapsed() ? 'justify-center p-2' : 'gap-3 px-3 py-2'">
                  <span [innerHTML]="item.icon" class="inline-flex shrink-0"></span>
                  @if (!collapsed()) {
                    <span class="truncate">{{ item.label }}</span>
                  }
                </a>
              </li>
            }

          }
        </ul>
      </nav>

      <!-- User info -->
      <a routerLink="/perfil"
         class="block border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
         [class]="collapsed() ? 'p-2' : 'p-4'"
         [title]="collapsed() ? (auth.currentUser()?.nombre + ' ' + auth.currentUser()?.apellido) : 'Mi perfil'">
        <div class="flex items-center" [class]="collapsed() ? 'justify-center' : 'gap-3'">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-sm font-semibold">
            {{ userInitials() }}
          </div>
          @if (!collapsed()) {
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                {{ auth.currentUser()?.nombre }} {{ auth.currentUser()?.apellido }}
              </p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{ auth.currentUser()?.rol | rol }}
              </p>
            </div>
            <svg class="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7"/>
            </svg>
          }
        </div>
      </a>
    </aside>
  `,
})
export class SidebarComponent implements OnInit {
  auth        = inject(AuthService);
  private cs  = inject(ConfiguracionService);
  private san = inject(DomSanitizer);
  private router = inject(Router);

  collapsed      = signal(false);
  empresaNombre  = signal('');
  logoUrl        = signal('');
  expandedGroups = signal<Set<string>>(new Set());

  private readonly uploadsBase = environment.apiUrl.replace('/api', '') + '/uploads/';

  ngOnInit() {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved !== null) this.collapsed.set(saved === 'true');

    this.cs.getPublico().subscribe(res => {
      if (!res.success) return;
      const cfg = res.data;
      if (cfg['empresa_nombre'])   this.empresaNombre.set(cfg['empresa_nombre']);
      if (cfg['empresa_logo_url']) this.logoUrl.set(this.uploadsBase + cfg['empresa_logo_url']);
    });

    // Auto-expandir el grupo cuyo hijo esté activo en la ruta actual
    this.expandActiveGroup(this.router.url);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.expandActiveGroup(e.urlAfterRedirects ?? e.url);
    });
  }

  toggle() {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  }

  toggleGroup(label: string) {
    this.expandedGroups.update(set => {
      const next = new Set(set);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  isGroupActive(item: NavItem): boolean {
    return (item.children ?? []).some(c => this.router.isActive(c.route, { paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }));
  }

  private expandActiveGroup(url: string) {
    this.navItems.forEach(item => {
      if (item.children?.some(c => url.startsWith(c.route))) {
        this.expandedGroups.update(set => { const n = new Set(set); n.add(item.label); return n; });
      }
    });
  }

  private svg(path: string): SafeHtml {
    return this.san.bypassSecurityTrustHtml(
      `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
    );
  }

  private navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: this.svg('<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>'),
    },
    {
      label: 'Mi Jornada',
      route: '/jornada',
      icon: this.svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
    },
    {
      label: 'Actividades',
      route: '/actividades',
      icon: this.svg('<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01"/>'),
    },
    {
      label: 'Reportes',
      icon: this.svg('<path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>'),
      roles: ['admin', 'supervisor', 'jefe_departamento'],
      children: [
        { label: 'Jornadas',      route: '/jornadas',               roles: ['admin', 'supervisor', 'jefe_departamento'] },
        { label: 'Productividad', route: '/reportes/productividad',  roles: ['admin', 'supervisor', 'jefe_departamento'] },
        { label: 'Asistencias',   route: '/reportes/asistencias',    roles: ['admin', 'supervisor', 'jefe_departamento'] },
      ],
    },
    {
      label: 'Mantenimiento',
      icon: this.svg('<path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>'),
      roles: ['admin', 'jefe_departamento'],
      children: [
        { label: 'Usuarios',           route: '/usuarios',        roles: ['admin'] },
        { label: 'Gestión Jornadas',   route: '/admin-jornadas',  roles: ['admin', 'jefe_departamento'] },
        { label: 'Departamentos',      route: '/departamentos',   roles: ['admin'] },
        { label: 'Tipos de Actividad', route: '/tipos-actividad', roles: ['admin'] },
        { label: 'Configuración',      route: '/configuracion',   roles: ['admin'] },
      ],
    },
    {
      label: 'Capturas',
      route: '/capturas',
      icon: this.svg('<path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>'),
      roles: ['admin', 'supervisor'],
    },
    {
      label: 'Bitácora',
      route: '/auditoria',
      icon: this.svg('<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>'),
      roles: ['admin'],
    },
    {
      label: 'Soporte',
      route: '/soporte',
      icon: this.svg('<path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>'),
    },
  ];

  visibleItems(): NavItem[] {
    const rol = this.auth.userRole();
    return this.navItems.filter(item => !item.roles || (rol && item.roles.includes(rol)));
  }

  visibleChildren(item: NavItem): NavChild[] {
    const rol = this.auth.userRole();
    return (item.children ?? []).filter(c => !c.roles || (rol && c.roles.includes(rol)));
  }

  userInitials() {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return `${u.nombre[0]}${u.apellido[0]}`.toUpperCase();
  }
}
