import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ConfiguracionService } from './core/services/configuracion.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit {
  private title = inject(Title);
  private cs    = inject(ConfiguracionService);

  private readonly uploadsBase = environment.apiUrl.replace('/api', '') + '/uploads/';

  ngOnInit() {
    this.cs.getPublico().subscribe(res => {
      if (!res.success) return;
      const cfg = res.data;

      const nombre = cfg['empresa_nombre'];
      if (nombre) {
        this.title.setTitle(`Teletrabajo - ${nombre}`);
      }

      const logoPath = cfg['empresa_logo_url'];
      if (logoPath) {
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
          ?? document.createElement('link');
        link.rel  = 'icon';
        link.href = this.uploadsBase + logoPath;
        if (!link.parentNode) document.head.appendChild(link);
      }
    });
  }
}
