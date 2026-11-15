import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const activeGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  try {
    await session.loadAccount();
  } catch {
    return router.parseUrl('/auth/pending');
  }
  return session.account()?.status === 'Active' || router.parseUrl('/auth/pending');
};
