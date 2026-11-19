import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SessionService } from './session.service';

export const activeGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  try {
    await session.loadAccount();
  } catch {
    // The route's access boundary renders a retry state if /me is unavailable.
  }
  // Keep the client shell and requested URL. The boundary mounts plan components
  // only for Active accounts, including subsequent status changes in this session.
  return true;
};
