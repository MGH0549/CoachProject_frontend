import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { RefreshService } from './refresh.service';
import { TokenStore } from './token-store.service';
describe('Rotating refresh session', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '${environment.apiBaseUrl}' },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('serializes concurrent refreshes into a single cookie request', async () => {
    const refresh = TestBed.inject(RefreshService);
    const first = refresh.refresh(),
      second = refresh.refresh();
    expect(first).toBe(second);
    const request = TestBed.inject(HttpTestingController).expectOne(
      '${environment.apiBaseUrl}/v1/auth/refresh',
    );
    expect(request.request.withCredentials).toBe(true);
    request.flush({ accessToken: 'new-token', expiresIn: 900 });
    expect(await first).toBe('new-token');
    expect(await second).toBe('new-token');
    expect(TestBed.inject(TokenStore).token()).toBe('new-token');
  });
  it('clears the in-memory token when the refresh fails and permits a later attempt', async () => {
    const refresh = TestBed.inject(RefreshService);
    const tokens = TestBed.inject(TokenStore);
    tokens.token.set('old-token');
    const first = refresh.refresh();
    const failure = expect(first).rejects.toBeTruthy();
    TestBed.inject(HttpTestingController)
      .expectOne('${environment.apiBaseUrl}/v1/auth/refresh')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await failure;
    expect(tokens.token()).toBeNull();
    const next = refresh.refresh();
    TestBed.inject(HttpTestingController)
      .expectOne('${environment.apiBaseUrl}/v1/auth/refresh')
      .flush({ accessToken: 'recovered', expiresIn: 900 });
    expect(await next).toBe('recovered');
  });
  it.each([0, 403, 429, 500, 503])(
    'preserves the token for a non-session refresh failure (%s)',
    async (status) => {
      const refresh = TestBed.inject(RefreshService);
      const tokens = TestBed.inject(TokenStore);
      tokens.token.set('existing-access');
      const failed = expect(refresh.refresh()).rejects.toBeTruthy();
      const request = TestBed.inject(HttpTestingController).expectOne(
        '${environment.apiBaseUrl}/v1/auth/refresh',
      );
      request.flush({}, { status, statusText: 'Refresh unavailable' });
      await failed;
      expect(tokens.token()).toBe('existing-access');
    },
  );
});
