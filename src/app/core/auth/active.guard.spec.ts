import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
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
    it(`allows ${status} clients to reach the route's empty-state boundary`, async () => {
      account.set({ status });
      const result = await TestBed.runInInjectionContext(() =>
        activeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
      expect(result).toBe(true);
    });
  it('allows active clients', async () => {
    account.set({ status: 'Active' });
    expect(
      await TestBed.runInInjectionContext(() =>
        activeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      ),
    ).toBe(true);
  });
  it('waits for /me before mounting the access boundary', async () => {
    let release!: () => void;
    vi.mocked(TestBed.inject(SessionService).loadAccount).mockImplementation(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    let finished = false;
    const guarded = Promise.resolve(
      TestBed.runInInjectionContext(() =>
        activeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      ),
    ).then((result) => {
      finished = true;
      return result;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    release();
    expect(await guarded).toBe(true);
  });
  it('keeps the requested route when /me fails so the boundary can show a retry', async () => {
    vi.mocked(TestBed.inject(SessionService).loadAccount).mockRejectedValue(
      new Error('Unavailable'),
    );
    expect(
      await TestBed.runInInjectionContext(() =>
        activeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      ),
    ).toBe(true);
  });
});
