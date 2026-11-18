import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { SessionService } from '../../../core/auth/session.service';
import { RouterLink } from '@angular/router';
import { BrandComponent } from '../../../shared/brand/brand.component';
@Component({
  selector: 'app-landing',
  imports: [RouterLink, BrandComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css', './results-carousel.css'],
})
export class LandingComponent {
  readonly session = inject(SessionService);
  readonly browserReady = signal(false);
  readonly activeResult = signal(0);
  readonly autoplayPaused = signal(false);
  readonly carouselHovered = signal(false);
  private touchStartX: number | null = null;

  constructor() {
    const host = inject(ElementRef<HTMLElement>);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.browserReady.set(true);
      const carousel = host.nativeElement.querySelector('#results');
      if (!carousel) return;
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onMotionChange = () => this.autoplayPaused.set(motion.matches);
      onMotionChange();
      motion.addEventListener('change', onMotionChange);
      let visible = false;
      const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
        threshold: 0.25,
      });
      observer.observe(carousel);
      const timer = window.setInterval(() => {
        if (visible && !document.hidden && !this.autoplayPaused() && !this.carouselHovered()) {
          this.changeResult(1);
        }
      }, 1000);
      destroyRef.onDestroy(() => {
        window.clearInterval(timer);
        observer.disconnect();
        motion.removeEventListener('change', onMotionChange);
      });
    });
  }

  changeResult(direction: number): void {
    this.activeResult.update(
      (index) => (index + direction + this.results.length) % this.results.length,
    );
  }

  onCarouselFocus(event: FocusEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('.carousel-play')) {
      this.autoplayPaused.set(true);
    }
  }

  onResultTouchCancel(): void {
    this.touchStartX = null;
  }

  onResultTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? null;
  }

  onResultTouchEnd(event: TouchEvent): void {
    const endX = event.changedTouches[0]?.clientX;
    if (this.touchStartX !== null && endX !== undefined) {
      const distance = endX - this.touchStartX;
      if (Math.abs(distance) > 50) {
        this.autoplayPaused.set(true);
        this.changeResult(distance > 0 ? 1 : -1);
      }
    }
    this.touchStartX = null;
  }

  readonly coachPhoto = 'images/landing/coach.jpg';
  readonly galleryPhotos = [
    { src: 'images/landing/motivation-1.jpg', alt: 'المدرب أثناء التمرين' },
    { src: 'images/landing/motivation-2.jpg', alt: 'التركيز على الأداء أثناء التدريب' },
    { src: 'images/landing/motivation-3.jpg', alt: 'الحماس والاستمرارية في التمرين' },
  ];
  readonly unavailablePhotos = signal<ReadonlySet<string>>(new Set());

  onPhotoError(src: string): void {
    this.unavailablePhotos.update((photos) => new Set([...photos, src]));
  }

  readonly steps = [
    { title: 'أنشئ حسابك', text: 'سجّل باسمك وبريدك الإلكتروني. يبدأ حسابك بانتظار التفعيل.' },
    { title: 'تواصل معي على واتساب', text: 'نتفق معاً على الباقة وطريقة الدفع المناسبة لك.' },
    { title: 'أفعّل حسابك', text: 'بعد الاتفاق، أفتح لك لوحة التحكم وأبني خطتك.' },
    { title: 'تدرّب مع شرح بالفيديو', text: 'افتح خطتك، شاهد فيديو كل تمرين، واتبع نظامك الغذائي.' },
  ];
  readonly packages = [
    {
      name: 'تدريب أونلاين',
      text: 'متابعة كاملة عن بُعد مع تسجيل أسبوعي للتقدم.',
      popular: false,
      items: ['خطة تدريب شخصية', 'نظام غذائي بالماكروز', 'فيديو لكل تمرين', 'متابعة أسبوعية'],
    },
    {
      name: 'تدريب هجين',
      text: 'خطة أونلاين مع جلسات منتظمة معي في الجيم.',
      popular: true,
      items: ['كل مزايا الأونلاين', 'جلسة شخصية شهرية', 'تصحيح الأداء مباشرة', 'أولوية دعم واتساب'],
    },
    {
      name: 'تدريب شخصي 1:1',
      text: 'نتدرب معاً خطوة بخطوة لتحقيق أفضل تقدم.',
      popular: false,
      items: [
        'جلسات شخصية',
        'خطة تدريب ونظام غذائي',
        'توجيه الأداء والتكنيك',
        'مراجعات مستمرة للتقدم',
      ],
    },
  ];
  readonly results = [
    {
      src: 'images/results/result-1.jpg',
      name: 'التحول الأول',
      duration: '3 أسابيع',
      alt: 'صور التحول الأول قبل وبعد التدريب',
    },
    {
      src: 'images/results/result-2.jpg',
      name: 'التحول الثاني',
      duration: '10 أسابيع',
      alt: 'صور التحول الثاني قبل وبعد التدريب',
    },
    {
      src: 'images/results/result-3.jpg',
      name: 'التحول الثالث',
      duration: '80 أسبوعاً',
      alt: 'صور التحول الثالث قبل وبعد التدريب',
    },
    {
      src: 'images/results/result-4.jpg',
      name: 'التحول الرابع',
      duration: '4 أسابيع',
      alt: 'صور التحول الثالث قبل وبعد التدريب',
    },
  ];
}
