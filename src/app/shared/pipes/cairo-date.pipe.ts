import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';

@Pipe({ name: 'cairoDate' })
export class CairoDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    const date = DateTime.fromISO(value, { zone: 'utc' }).setZone('Africa/Cairo');
    return date.isValid ? date.setLocale('ar-u-nu-latn').toFormat('d LLL yyyy') : '—';
  }
}
