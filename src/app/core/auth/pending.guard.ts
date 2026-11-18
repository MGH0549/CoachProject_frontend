import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
export const pendingGuard: CanActivateFn = async () => {
  const session = inject(SessionService),
    router = inject(Router);
  await session.waitUntilReady();
  return session.tokens.role() === 'Coach' || session.account()?.status === 'Active'
    ? router.parseUrl(session.home())
    : true;
};
