import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStore {
  readonly token = signal<string | null>(null);
  readonly role = computed<'Coach' | 'Client' | null>(() => {
    try {
      const token = this.token();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role === 'Coach' || payload.role === 'Client' ? payload.role : null;
    } catch {
      return null;
    }
  });
}
