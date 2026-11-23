import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TemplatesService } from './templates.service';
import { TemplatePage } from '../../../core/api/models/template-page';
import { TemplateSummary } from '../../../core/api/models/template-summary';
import { ClientPage } from '../../../core/api/models/client-page';
import { NotificationService } from '../../../core/feedback/notification.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
@Component({
  selector: 'app-templates',
  imports: [FormsModule, RouterLink, TranslocoPipe],
  templateUrl: './templates.component.html',
  styleUrl: './templates.component.css',
})
export class TemplatesComponent {
  private readonly api = inject(TemplatesService);
  private readonly notices = inject(NotificationService);
  private readonly translations = inject(TranslocoService);
  async remove(template: TemplateSummary) {
    if (this.busy() || this.loading()) return;
    if (!confirm(this.translations.translate('planActions.confirmTemplate'))) return;
    this.busy.set(true);
    try {
      await this.api.remove(this.diet(), template.id, template.version);
      if (this.selected()?.id === template.id) this.selected.set(null);
      const current = this.data();
      this.data.update((data) =>
        data
          ? {
              ...data,
              total: data.total - 1,
              items: data.items.filter((item) => item.id !== template.id),
            }
          : data,
      );
      const page = Math.min(
        current?.page ?? 1,
        Math.max(1, Math.ceil(((current?.total ?? 1) - 1) / (current?.pageSize ?? 20))),
      );
      await this.load(page);
      this.notices.show(this.translations.translate('planActions.templateDeleted'));
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  readonly diet = signal(false);
  readonly data = signal<TemplatePage | null>(null);
  readonly clients = signal<ClientPage | null>(null);
  readonly selected = signal<TemplateSummary | null>(null);
  readonly clientId = signal('');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  search = '';
  clientSearch = '';
  private sequence = 0;
  constructor() {
    void this.load();
    void this.loadClients();
  }
  async load(page = 1) {
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.list(this.diet(), page, this.search);
      if (sequence === this.sequence) this.data.set(result);
    } catch (error) {
      if (sequence === this.sequence) this.error.set(this.notices.error(error));
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  switchTab(diet: boolean) {
    this.diet.set(diet);
    this.selected.set(null);
    void this.load();
  }
  async loadClients(page = 1) {
    try {
      this.clients.set(await this.api.clients(page, this.clientSearch));
    } catch (error) {
      this.notices.error(error);
    }
  }
  async copy() {
    if (
      !this.selected() ||
      !this.clientId() ||
      !confirm('نسخ القالب إلى العميل؟ سيستبدل خطته الحالية إن وجدت.')
    )
      return;
    this.busy.set(true);
    try {
      await this.api.copy(this.diet(), this.selected()!.id, this.clientId());
      this.notices.show('تم نسخ الخطة إلى العميل بشكل مستقل.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async duplicate(id: string) {
    this.busy.set(true);
    try {
      await this.api.duplicate(this.diet(), id);
      await this.load();
      this.notices.show('تم إنشاء نسخة من القالب.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
