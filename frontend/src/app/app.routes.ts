import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'jornada',
        loadComponent: () => import('./features/jornada/jornada-control/jornada-control.component').then(m => m.JornadaControlComponent),
      },
      {
        path: 'jornadas',
        canActivate: [roleGuard('admin', 'supervisor', 'jefe_departamento')],
        loadComponent: () => import('./features/jornada/jornadas-list/jornadas-list.component').then(m => m.JornadasListComponent),
      },
      {
        path: 'jornada/:id/reporte',
        loadComponent: () => import('./features/jornada/jornada-reporte/jornada-reporte.component').then(m => m.JornadaReporteComponent),
      },
      {
        path: 'actividades',
        loadComponent: () => import('./features/actividades/actividades-list/actividades-list.component').then(m => m.ActividadesListComponent),
      },
      {
        path: 'reportes/productividad',
        canActivate: [roleGuard('admin', 'supervisor', 'jefe_departamento')],
        loadComponent: () => import('./features/reportes/productividad/productividad.component').then(m => m.ProductividadComponent),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./features/usuarios/usuarios-list/usuarios-list.component').then(m => m.UsuariosListComponent),
      },
      {
        path: 'configuracion',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./features/configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
      },
      {
        path: 'tipos-actividad',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./features/tipos-actividad/tipos-actividad.component').then(m => m.TiposActividadComponent),
      },
      {
        path: 'departamentos',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./features/departamentos/departamentos.component').then(m => m.DepartamentosComponent),
      },
      {
        path: 'admin-jornadas',
        canActivate: [roleGuard('admin', 'jefe_departamento')],
        loadComponent: () => import('./features/admin-jornadas/admin-jornadas.component').then(m => m.AdminJornadasComponent),
      },
      {
        path: 'capturas',
        canActivate: [roleGuard('admin', 'supervisor')],
        loadComponent: () => import('./features/capturas/capturas.component').then(m => m.CapturasComponent),
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./features/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
      },
      {
        path: 'soporte',
        loadComponent: () => import('./features/soporte/soporte.component').then(m => m.SoporteComponent),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil.component').then(m => m.PerfilComponent),
      },
    ],
  },
  { path: '**', redirectTo: '/login' },
];
