import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const roleGuard: CanActivateFn = async (route) => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.restore();
  return session.tokens.role() === route.data['role'] || router.parseUrl(session.home());
};
