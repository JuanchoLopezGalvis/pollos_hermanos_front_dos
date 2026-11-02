import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { TokenInterceptor } from './token.interceptor';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('TokenInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['logout'], { token: 'abc' });
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], { url: '/seguimiento' });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('agrega el token a las peticiones del backend', () => {
    http.get(`${environment.api}/seguimientos`).subscribe();
    const req = backend.expectOne(`${environment.api}/seguimientos`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush([]);
  });

  it('no agrega el token al login', () => {
    http.post(`${environment.api}/auth/login`, {}).subscribe();
    const req = backend.expectOne(`${environment.api}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('cierra la sesión y redirige al login ante un 401', () => {
    http.get(`${environment.api}/usuarios`).subscribe({ error: () => {} });
    backend.expectOne(`${environment.api}/usuarios`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login?returnUrl=%2Fseguimiento');
  });
});
