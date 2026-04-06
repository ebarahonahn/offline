import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  darkMode = signal(false);

  constructor() {
    const stored = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored !== null ? stored === 'true' : prefersDark;
    this.setDark(isDark);
  }

  toggle() {
    this.setDark(!this.darkMode());
  }

  private setDark(dark: boolean) {
    this.darkMode.set(dark);
    localStorage.setItem('darkMode', String(dark));
    document.documentElement.classList.toggle('dark', dark);
  }
}
