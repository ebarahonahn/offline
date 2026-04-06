import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { JornadaService } from './jornada.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CapturaService {
  private http    = inject(HttpClient);
  private jornada = inject(JornadaService);
  private auth    = inject(AuthService);
  private api     = `${environment.apiUrl}/capturas`;

  // Estado visible para la UI
  habilitada       = signal(false);
  permisoConcedido = signal(false);
  capturandoAhora  = signal(false);

  private intervaloMin  = 30;
  private captureTimer: any = null;
  private mediaStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;

  // ── Inicializar desde configuración ──────────────────────────
  init(habilitada: boolean, intervaloMin: number) {
    this.habilitada.set(habilitada);
    this.intervaloMin = intervaloMin;

    if (!habilitada) {
      this.stop();
    }
  }

  // ── Llamar cuando cambia el estado de la jornada ─────────────
  async onJornadaEstado(estado: string | null) {
    if (!this.habilitada()) return;

    if (estado === 'activa') {
      // Si ya tenemos stream, solo arrancamos el timer
      if (this.mediaStream && this.mediaStream.active) {
        this.startTimer();
      }
      // Si no, esperamos a que el usuario pulse "Activar capturas"
    } else {
      // Pausada o finalizada: detener capturas sin soltar el stream
      this.stopTimer();
      if (estado === 'finalizada' || estado === 'anulada' || !estado) {
        this.stop();
      }
    }
  }

  // ── El usuario pulsa "Activar capturas" ──────────────────────
  async pedirPermiso() {
    if (!this.habilitada()) return;
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { max: 1 } },
        audio: false,
      });

      this.mediaStream = stream;

      // Crear el elemento de video (oculto) que mantiene el frame actual
      this.videoEl = document.createElement('video');
      this.videoEl.srcObject = stream;
      this.videoEl.muted     = true;
      this.videoEl.playsInline = true;
      this.videoEl.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(this.videoEl);

      // Esperar a que el video tenga dimensiones reales antes de capturar
      await new Promise<void>((resolve) => {
        this.videoEl!.onloadedmetadata = () => resolve();
        this.videoEl!.play().catch((e: any) => {
          console.error('[Capturas] Error al iniciar video:', e);
          resolve();
        });
      });

      this.permisoConcedido.set(true);
      console.log('[Capturas] Permiso concedido. Resolución:', this.videoEl.videoWidth, 'x', this.videoEl.videoHeight);

      // Si el usuario detiene la compartición desde el navegador
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('[Capturas] El usuario detuvo la compartición.');
        this.cleanupStream();
      });

      // Arrancar timer + captura inmediata
      if (this.jornada.estadoActual() === 'activa') {
        this.startTimer();
        await this.capturar();
      }
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        console.error('[Capturas] Error al obtener permiso de pantalla:', err);
      }
      this.permisoConcedido.set(false);
    }
  }

  // ── Detener todo ──────────────────────────────────────────────
  stop() {
    this.stopTimer();
    this.cleanupStream();
  }

  // ── Privados ──────────────────────────────────────────────────
  private startTimer() {
    this.stopTimer();
    const ms = this.intervaloMin * 60 * 1000;
    this.captureTimer = setInterval(() => this.capturar(), ms);
  }

  private stopTimer() {
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
  }

  private cleanupStream() {
    this.stopTimer();
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
      this.videoEl.remove();
      this.videoEl = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.permisoConcedido.set(false);
  }

  private async capturar() {
    if (!this.videoEl || !this.mediaStream?.active) return;

    const jornadaId = this.jornada.jornadaActiva()?.id;
    if (!jornadaId) return;
    if (this.jornada.estadoActual() !== 'activa') return;

    try {
      this.capturandoAhora.set(true);

      const vw = this.videoEl.videoWidth  || 1280;
      const vh = this.videoEl.videoHeight || 720;

      // Escalar si es muy grande
      const scale  = Math.min(1, 1280 / vw, 720 / vh);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(this.videoEl, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL('image/jpeg', 0.6);

      console.log('[Capturas] Enviando captura, jornada_id:', jornadaId, 'tamaño base64:', Math.round(base64.length / 1024), 'KB');
      this.http.post(this.api, { imagen: base64, jornada_id: jornadaId }).subscribe({
        next: () => console.log('[Capturas] Captura guardada correctamente.'),
        error: (err: any) => console.error('[Capturas] Error al enviar captura:', err.status, err.error?.message),
      });
    } catch (err: any) {
      console.error('[Capturas] Error al generar captura:', err.message);
    } finally {
      this.capturandoAhora.set(false);
    }
  }

  // ── API para admin/supervisor ─────────────────────────────────
  getConfig() {
    return this.http.get<any>(`${this.api}/config`);
  }

  listar(params: Record<string, any> = {}) {
    return this.http.get<any>(this.api, { params });
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.api}/${id}`);
  }

  urlImagen(ruta: string) {
    const token = this.auth.getToken();
    return `${environment.apiUrl.replace('/api', '')}/uploads/${ruta}?token=${token}`;
  }
}
