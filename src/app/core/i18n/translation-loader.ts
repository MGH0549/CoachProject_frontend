import { Injectable } from '@angular/core';
import { TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { accountTranslations } from './ar';
import { strengthTranslations } from './strength-ar';
import { progressMeasurementTranslations } from './progress-measurements-ar';
import { planActionTranslations } from './plan-actions-ar';
import { trainingWeightTranslations } from './training-weights-ar';

@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      ...accountTranslations,
      ...strengthTranslations,
      ...progressMeasurementTranslations,
      ...planActionTranslations,
      ...trainingWeightTranslations,
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
