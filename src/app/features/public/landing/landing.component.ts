import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandComponent } from '../../../shared/brand/brand.component';
@Component({
  selector: 'app-landing',
  imports: [RouterLink, BrandComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
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
      name: 'دان، 29',
      result: '12 أسبوعاً · خسارة 9 كجم دهون',
      quote: 'الفيديوهات جعلت كل تمرين واضحاً. أخيراً أصبحت أتدرب بثقة.',
    },
    {
      name: 'صوفي، 34',
      result: '16 أسبوعاً · زيادة 3 كجم عضلات',
      quote: 'كانت خطتي تتغير كل بضعة أسابيع. لم أشعر يوماً أنني عالقة.',
    },
    {
      name: 'مارك، 41',
      result: 'تجهيز للمنافسات · جاهز للمنصة',
      quote: 'نظام واضح، خطة واضحة، وإجابات سريعة على واتساب.',
    },
  ];
}
