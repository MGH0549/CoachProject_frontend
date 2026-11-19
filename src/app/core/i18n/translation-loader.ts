import { Injectable } from '@angular/core';
import { TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { accountTranslations } from './ar';

@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      ...accountTranslations,
      brand: 'FORMA',
      training: 'الخطة التدريبية',
      diet: 'النظام الغذائي',
      progress: 'التقدم',
      clients: 'العملاء',
      templates: 'قوالب الخطط',
      library: 'مكتبة التمارين',
      profile: 'الملف الشخصي',
      settings: 'الإعدادات',
      signOut: 'تسجيل الخروج',
    });
  }
}
