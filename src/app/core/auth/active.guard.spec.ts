import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  provideRouter,
} from '@angular/router';
import { signal } from '@angular/core';
import { activeGuard } from './active.guard';
import { SessionService } from './session.service';
describe('Active account guard', () => {
  const account = signal<{ status: string } | null>(null);
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: { account, loadAccount: vi.fn().mockResolvedValue(undefined) },
        },
      ],
    }),
  );
  for (const status of ['Pending', 'Expired', 'Deactivated'])
    it(`redirects ${status} clients to account status`, async () => {
      account.set({ status });
      const result = await TestBed.runInInjectionContext(() =>
        activeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
      expect(TestBed.inject(Router).serializeUrl(result as never)).toBe('/auth/pending');
    });
  it('allows active clients', async () => {
    account.set({ status: 'Active' });
    expect(
      await TestBed.runInInjectionContext(() =>
        activeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      ),
    ).toBe(true);
  });
});
