import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<'dark' | 'light'>('dark');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;
      this.apply(this.document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark');
      const onStorage = (event: StorageEvent) => {
        if (event.key === 'forma-theme' || event.key === null) {
          this.apply(event.newValue === 'light' ? 'light' : 'dark');
        }
      };
      view.addEventListener('storage', onStorage);
      destroyRef.onDestroy(() => view.removeEventListener('storage', onStorage));
    });
  }

  toggle(): void {
    const theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.apply(theme);
    try {
      this.document.defaultView?.localStorage.setItem('forma-theme', theme);
    } catch {
      // The switch still works when browser storage is unavailable.
    }
  }

  private apply(theme: 'dark' | 'light'): void {
    this.theme.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f7f7f8' : '#0a0a0a');
  }
}
