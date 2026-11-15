import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-video-panel',
  templateUrl: './video-panel.component.html',
  styleUrl: './video-panel.component.css',
})
export class VideoPanelComponent {
  readonly videoId = input.required<string>();
  readonly title = input('فيديو التمرين');
  readonly playing = signal(false);
  private readonly sanitizer = inject(DomSanitizer);
  readonly valid = computed(() => /^[a-zA-Z0-9_-]{11}$/.test(this.videoId()));
  readonly source = computed(() =>
    this.valid()
      ? this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube-nocookie.com/embed/${this.videoId()}?autoplay=1&rel=0`,
        )
      : null,
  );
  constructor() {
    effect(() => {
      this.videoId();
      this.playing.set(false);
    });
  }
}
