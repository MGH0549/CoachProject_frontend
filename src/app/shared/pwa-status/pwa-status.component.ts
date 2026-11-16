import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { fromEvent } from 'rxjs';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-pwa-status',
  templateUrl: './pwa-status.component.html',
  styleUrl: './pwa-status.component.css',
})
export class PwaStatusComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly updates = inject(SwUpdate, { optional: true });
  private installPrompt: InstallPromptEvent | null = null;
  readonly offline = signal(false);
  readonly canInstall = signal(false);
  readonly iosInstall = signal(false);
  readonly showIosHelp = signal(false);
  readonly installDismissed = signal(false);
  readonly installing = signal(false);
  readonly updateReady = signal(false);

  constructor() {
    if (this.updates?.isEnabled) {
      this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe((event) => {
        if (event.type === 'VERSION_READY') this.updateReady.set(true);
      });
      this.updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => {
        this.updateReady.set(true);
      });
    }

    afterNextRender(() => {
      const standalone = window.matchMedia?.('(display-mode: standalone)');
      const iosNavigator = navigator as Navigator & { standalone?: boolean };
      const isIos =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      this.iosInstall.set(isIos && !standalone?.matches && !iosNavigator.standalone);
      this.offline.set(!navigator.onLine);

      fromEvent(window, 'online')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.offline.set(false);
          this.checkForUpdate();
        });
      fromEvent(window, 'offline')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.offline.set(true));
      fromEvent<InstallPromptEvent>(window, 'beforeinstallprompt')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          event.preventDefault();
          this.installPrompt = event;
          this.canInstall.set(!standalone?.matches);
        });
      fromEvent(window, 'appinstalled')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.installPrompt = null;
          this.canInstall.set(false);
          this.iosInstall.set(false);
        });
      fromEvent(document, 'visibilitychange')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (document.visibilityState === 'visible') this.checkForUpdate();
        });
    });
  }

  async install(): Promise<void> {
    if (this.iosInstall()) {
      this.showIosHelp.set(true);
      return;
    }
    const prompt = this.installPrompt;
    if (!prompt || this.installing()) return;
    this.installing.set(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      this.installDismissed.set(choice.outcome === 'dismissed');
    } catch {
      // The browser may withdraw the prompt if installation is no longer available.
    } finally {
      this.installPrompt = null;
      this.canInstall.set(false);
      this.installing.set(false);
    }
  }

  reload(): void {
    window.location.reload();
  }

  private checkForUpdate(): void {
    if (this.updates?.isEnabled && navigator.onLine) {
      void this.updates.checkForUpdate().catch(() => undefined);
    }
  }
}
