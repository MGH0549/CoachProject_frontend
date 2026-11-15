import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly message = signal('');
  readonly isError = signal(false);
  private timer?: ReturnType<typeof setTimeout>;
  show(message: string, isError = false): void {
    clearTimeout(this.timer);
    this.message.set(message);
    this.isError.set(isError);
    this.timer = setTimeout(() => this.message.set(''), 7000);
  }
  error(error: unknown): string {
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      EMAIL_EXISTS: 'هذا البريد مسجل بالفعل. يمكنك تسجيل الدخول.',
      VERSION_CONFLICT: 'تم تعديل الخطة. حدّث الصفحة وحاول مرة أخرى.',
      CHOICE_LOCKED: 'هذه الخيارات مقفلة بواسطة المدرب.',
      ACCOUNT_LOCKED: 'الحساب مقفل مؤقتاً. حاول لاحقاً.',
      ACCESS_INACTIVE: 'الاشتراك غير نشط. تواصل مع المدرب.',
      INVALID_END_DATE: 'اختر تاريخ انتهاء صالحاً في المستقبل.',
      CONSENT_REQUIRED: 'الموافقة على استخدام البيانات مطلوبة.',
      INVALID_PHOTO: 'الصورة غير صالحة. اختر JPG أو PNG أو WebP حتى 8 ميجابايت.',
      INVALID_RESET_TOKEN: 'رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته.',
    };
    const response = error instanceof HttpErrorResponse ? error : null;
    const message =
      messages[response?.error?.code] ??
      (response?.status === 0
        ? 'تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.'
        : response?.status === 409
          ? 'تم تعديل البيانات. حدّث الصفحة قبل المحاولة مرة أخرى.'
          : response?.status === 403
            ? 'ليس لديك صلاحية لهذا الإجراء. راجع حالة حسابك مع المدرب.'
            : response?.status === 400
              ? 'راجع البيانات المدخلة وحاول مرة أخرى.'
              : 'تعذر إتمام الطلب. حاول مرة أخرى.');
    this.show(message, true);
    return message;
  }
}
