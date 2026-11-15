import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { provideApiConfiguration } from '../api/api-configuration';
import { AuthenticationService } from '../api/services/authentication.service';
import { apiCredentialsInterceptor } from './api-credentials.interceptor';
import { HttpClient } from '@angular/common/http';

describe('API credentials', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiCredentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api' },
        provideApiConfiguration('http://localhost:3000'),
      ],
    }),
  );

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('uses the generated versioned refresh endpoint with cookies', () => {
    TestBed.inject(AuthenticationService).authControllerRefresh().subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/api/v1/auth/refresh',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ accessToken: 'test-token', expiresIn: 900 });
  });

  it('does not enable credentials for another origin', () => {
    TestBed.inject(HttpClient).get('https://example.com/api').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne('https://example.com/api');
    expect(request.request.withCredentials).toBe(false);
    request.flush({});
  });
});
