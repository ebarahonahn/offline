import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { JornadaService } from './jornada.service';

function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http       = inject(HttpClient);
  private router     = inject(Router);
  private jornadaSvc = inject(JornadaService);
  private api        = `${environment.apiUrl}/auth`;

  currentUser     = signal<User | null>(this.loadUser());
  isAuthenticated = computed(() => !!this.currentUser());
  userRole        = computed(() => this.currentUser()?.rol ?? null);

  private loadUser(): User | null {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;
      const p = parseJwt(token);
      if (!p || !p['id']) return null;
      return {
        id:                    p['id'],
        email:                 p['email'],
        rol:                   p['rol'],
        nombre:                p['nombre'] ?? '',
        apellido:              p['apellido'] ?? '',
        departamento_id:       p['departamento_id'] ?? null,
        debe_cambiar_password: p['debe_cambiar_password'] ?? 0,
      } as User;
    } catch { return null; }
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  login(email: string, password: string) {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.api}/login`, { email, password }).pipe(
      tap(res => {
        if (res.success) {
          const { accessToken, refreshToken, jornada } = res.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          this.currentUser.set(this.loadUser());
          if (jornada) {
            this.jornadaSvc.jornadaActiva.set(jornada);
            if (['activa', 'pausada'].includes(jornada.estado)) {
              this.jornadaSvc['startTimer'](jornada);
            }
          }
        }
      })
    );
  }

  logout() {
    this.http.post(`${this.api}/logout`, {}).subscribe();
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.currentUser.set(null);
  }

  refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));
    return this.http.post<ApiResponse<{ accessToken: string }>>(
      `${this.api}/refresh`, { refreshToken }
    ).pipe(
      tap(res => {
        if (res.success) {
          localStorage.setItem('accessToken', res.data.accessToken);
          this.currentUser.set(this.loadUser());
        }
      })
    );
  }

  actualizarPerfil(nombre: string, apellido: string) {
    return this.http.put<ApiResponse<{ accessToken: string }>>(`${this.api}/me`, { nombre, apellido }).pipe(
      tap(res => {
        if (res.success) {
          localStorage.setItem('accessToken', res.data.accessToken);
          this.currentUser.set(this.loadUser());
        }
      })
    );
  }

  uploadMeAvatar(imagen: string) {
    return this.http.post<ApiResponse<{ url: string }>>(`${this.api}/me/avatar`, { imagen });
  }

  deleteMeAvatar() {
    return this.http.delete<ApiResponse<null>>(`${this.api}/me/avatar`);
  }

  recuperarPassword(email: string) {
    return this.http.post<ApiResponse<null>>(`${this.api}/recuperar-password`, { email });
  }

  cambiarPassword(passwordNuevo: string) {
    return this.http.post<ApiResponse<null>>(`${this.api}/cambiar-password`, { password_nuevo: passwordNuevo }).pipe(
      tap(res => {
        if (res.success) {
          this.clearSession();
          this.router.navigate(['/login']);
        }
      })
    );
  }

  hasRole(...roles: string[]): boolean {
    const rol = this.userRole();
    return !!rol && roles.includes(rol);
  }
}
