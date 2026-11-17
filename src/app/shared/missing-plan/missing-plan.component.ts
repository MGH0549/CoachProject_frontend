import { Component, computed, inject, input, output } from '@angular/core';
import { SessionService } from '../../core/auth/session.service';

@Component({
  selector: 'app-missing-plan',
  template: `
    <section class="card missing-plan" aria-labelledby="missing-plan-title">
      <span class="eyebrow">بانتظار إضافة الخطة</span>
      <h2 id="missing-plan-title">
        {{ kind() === 'training' ? 'خطتك التدريبية لم تُضف بعد' : 'نظامك الغذائي لم يُضف بعد' }}
      </h2>
      <p role="status">
        {{
          kind() === 'training'
            ? 'لم يضف المدرب خطة تدريب لحسابك حتى الآن. ستجد أيام التدريب والتمارين هنا بمجرد إضافتها.'
            : 'لم يضف المدرب نظاماً غذائياً لحسابك حتى الآن. ستجد وجباتك وأهدافك الغذائية هنا بمجرد إضافته.'
        }}
      </p>
      <p>تواصل مع مدربك لمعرفة موعد جاهزية خطتك، أو تحقق مرة أخرى إذا أخبرك أنه أضافها.</p>
      <div class="actions">
        @if (whatsapp(); as url) {
          <a class="btn green" [href]="url" target="_blank" rel="noopener noreferrer">
            تواصل مع المدرب على واتساب
          </a>
        }
        <button type="button" class="btn secondary" (click)="check.emit()">
          التحقق من وجود الخطة
        </button>
      </div>
    </section>
  `,
  styles: `
    .missing-plan {
      max-width: 680px;
      margin: 32px auto;
      padding: 40px 24px;
      text-align: center;
    }
    h2 {
      margin-block: 12px;
    }
    p {
      max-width: 520px;
      margin: 12px auto;
      line-height: 1.9;
    }
    .actions {
      justify-content: center;
      margin-block-start: 24px;
    }
  `,
})
export class MissingPlanComponent {
  readonly kind = input.required<'training' | 'diet'>();
  readonly check = output<void>();
  private readonly session = inject(SessionService);
  readonly whatsapp = computed(() => {
    try {
      const url = new URL(this.session.account()?.whatsappUrl ?? '');
      return url.protocol === 'https:' && ['wa.me', 'api.whatsapp.com'].includes(url.hostname)
        ? url.href
        : null;
    } catch {
      return null;
    }
  });
}
