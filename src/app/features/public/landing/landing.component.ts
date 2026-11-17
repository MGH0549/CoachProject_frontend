import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandComponent } from '../../../shared/brand/brand.component';
@Component({
  selector: 'app-landing',
  imports: [RouterLink, BrandComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
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
  ];
}
