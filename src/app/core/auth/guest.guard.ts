import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const guestGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.waitUntilReady();
  return session.state() === 'authenticated' ? router.parseUrl(session.home()) : true;
};
