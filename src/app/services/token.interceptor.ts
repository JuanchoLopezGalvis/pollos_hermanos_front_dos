import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Agrega el token JWT a las peticiones del backend y redirige al login
 * cuando el backend responde 401 (token ausente, inválido o expirado).
 */
@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const apiBase = (environment.api || '/api').replace(/\/+$/, '');
    const absoluteApi = apiBase.startsWith('http') ? apiBase : `${location.origin}${apiBase}`;

    const isApiCall =
      req.url.startsWith(apiBase) ||
      req.url.startsWith(absoluteApi);

    const isPublic =
      req.method === 'OPTIONS' ||
      (isApiCall && req.url.includes('/auth/login'));

    let request = req;

    if (isApiCall && !isPublic) {
      const token = this.auth.token;
      if (token && !request.headers.has('Authorization')) {
        request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }
    }

    return next.handle(request).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401 && !isPublic) {
          const current = this.router.url || '/';
          this.auth.logout();
          if (!current.startsWith('/login')) {
            this.router.navigateByUrl(`/login?returnUrl=${encodeURIComponent(current)}`);
          }
        }
        throw err;
      })
    );
  }
}
