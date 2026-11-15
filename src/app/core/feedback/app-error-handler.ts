import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);
  handleError(): void {
    this.notifications.show('حدث خطأ غير متوقع. أعد المحاولة.', true);
  }
}
