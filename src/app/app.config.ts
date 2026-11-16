import { isPlatformBrowser } from '@angular/common';
import {
  provideClientHydration,
  withEventReplay,
  withNoHttpTransferCache,
} from '@angular/platform-browser';
import { provideTransloco } from '@jsverse/transloco';
import { TranslationLoader } from './core/i18n/translation-loader';
import { SessionService } from './core/auth/session.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AppErrorHandler } from './core/feedback/app-error-handler';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  PLATFORM_ID,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { API_BASE_URL } from './core/config/api-base-url.token';
import { provideApiConfiguration } from './core/api/api-configuration';
import { apiCredentialsInterceptor } from './core/http/api-credentials.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay(), withNoHttpTransferCache()),
    provideHttpClient(withInterceptors([apiCredentialsInterceptor, authInterceptor])),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideAppInitializer(() => {
      if (isPlatformBrowser(inject(PLATFORM_ID))) void inject(SessionService).restore();
    }),
    provideTransloco({
      config: {
        availableLangs: ['ar'],
        defaultLang: 'ar',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslationLoader,
    }),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideApiConfiguration(new URL(environment.apiBaseUrl).origin),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
      updateViaCache: 'none',
    }),
  ],
};
