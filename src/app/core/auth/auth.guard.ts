import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.restore();
  return (
    !!session.tokens.token() ||
    router.createUrlTree(['/auth/sign-in'], { queryParams: { returnUrl: state.url } })
  );
};
