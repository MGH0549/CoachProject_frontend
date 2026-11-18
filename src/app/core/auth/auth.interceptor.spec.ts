import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../config/api-base-url.token';
import { TokenStore } from './token-store.service';
import { authInterceptor } from './auth.interceptor';
describe('Access token interceptor', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '${environment.apiBaseUrl}' },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('retries two expired API calls after exactly one refresh', async () => {
    const http = TestBed.inject(HttpClient),
      testing = TestBed.inject(HttpTestingController);
    TestBed.inject(TokenStore).token.set('expired');
    const values: unknown[] = [];
    http.get('${environment.apiBaseUrl}/v1/me/training').subscribe((v) => values.push(v));
    http.get('${environment.apiBaseUrl}/v1/me/diet').subscribe((v) => values.push(v));
    const initial = testing.match((r) => r.headers.get('Authorization') === 'Bearer expired');
    expect(initial).toHaveLength(2);
    initial.forEach((r) => r.flush({}, { status: 401, statusText: 'Unauthorized' }));
    testing
      .expectOne('${environment.apiBaseUrl}/v1/auth/refresh')
      .flush({ accessToken: 'fresh', expiresIn: 900 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const retried = testing.match((r) => r.headers.get('Authorization') === 'Bearer fresh');
    expect(retried).toHaveLength(2);
    retried.forEach((r) => r.flush({ ok: true }));
    expect(values).toHaveLength(2);
  });
  it('never adds tokens to an unrelated origin', () => {
    TestBed.inject(TokenStore).token.set('private-token');
    TestBed.inject(HttpClient).get('https://example.com').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne('https://example.com');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
  it('does not redirect or clear the session when refresh temporarily fails', async () => {
    const http = TestBed.inject(HttpClient);
    const testing = TestBed.inject(HttpTestingController);
    const tokens = TestBed.inject(TokenStore);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    tokens.token.set('expired');
    const failure = vi.fn();
    http.get('${environment.apiBaseUrl}/v1/me/training').subscribe({ error: failure });
    testing
      .expectOne('${environment.apiBaseUrl}/v1/me/training')
      .flush({}, { status: 401, statusText: 'Expired' });
    testing
      .expectOne('${environment.apiBaseUrl}/v1/auth/refresh')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(failure).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(tokens.token()).toBe('expired');
  });
  it('redirects only after the refresh endpoint rejects the session', async () => {
    const testing = TestBed.inject(HttpTestingController);
    const tokens = TestBed.inject(TokenStore);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    tokens.token.set('expired');
    TestBed.inject(HttpClient)
      .get('${environment.apiBaseUrl}/v1/me/training')
      .subscribe({ error: () => undefined });
    testing
      .expectOne('${environment.apiBaseUrl}/v1/me/training')
      .flush({}, { status: 401, statusText: 'Expired' });
    testing
      .expectOne('${environment.apiBaseUrl}/v1/auth/refresh')
      .flush({}, { status: 401, statusText: 'Invalid session' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(navigate).toHaveBeenCalledOnce();
    expect(tokens.token()).toBeNull();
  });
});
