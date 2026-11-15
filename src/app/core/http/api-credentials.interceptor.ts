import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../config/api-base-url.token';

export const apiCredentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBase = inject(API_BASE_URL).replace(/\/$/, '');
  const isApiRequest = request.url === apiBase || request.url.startsWith(`${apiBase}/`);
  return next(isApiRequest ? request.clone({ withCredentials: true }) : request);
};
