import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { roleGuard } from './role.guard';
import { SessionService } from './session.service';
describe('Role guard session ordering', () => {
  it('waits for restoration before reading the role', async () => {
    const role = signal<string | null>(null);
    let resolve!: () => void;
    const restoring = new Promise<void>((done) => (resolve = done));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: {
            waitUntilReady: () => restoring,
            tokens: { role },
            home: () => '/auth/pending',
          },
        },
      ],
    });
    const pending = TestBed.runInInjectionContext(() =>
      roleGuard(
        { data: { role: 'Client' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
    role.set('Client');
    resolve();
    expect(await pending).toBe(true);
  });
});
