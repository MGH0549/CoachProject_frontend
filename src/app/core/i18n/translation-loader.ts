import { Injectable } from '@angular/core';
import { TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      brand: 'APEX COACHING',
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
