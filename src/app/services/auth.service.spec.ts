import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService, LoginResponse } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const respuesta: LoginResponse = {
    token: 'jwt.token.valor', tipo: 'Bearer', nombreUsuario: 'gaby', nombreCompleto: 'Gabriela Poveda',
    superusuario: false, permisos: ['seguimiento.ver']
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('inicia sesión y guarda el token y los permisos', () => {
    service.login({ usuario: ' gaby ', contrasena: 'clave1234' }).subscribe();

    const req = http.expectOne(`${environment.api}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ usuario: 'gaby', contrasena: 'clave1234' });
    req.flush(respuesta);

    expect(service.isLogged()).toBeTrue();
    expect(service.token).toBe('jwt.token.valor');
    expect(service.nombreVisible).toBe('Gabriela Poveda');
  });

  it('evalúa los permisos como el backend', () => {
    service.saveSession(respuesta);
    expect(service.tienePermiso('seguimiento.ver')).toBeTrue();
    expect(service.tienePermiso('usuario.gestionar')).toBeFalse();
    expect(service.tieneAlguno(['rol.gestionar', 'seguimiento.ver'])).toBeTrue();

    service.saveSession({ ...respuesta, superusuario: true, permisos: [] });
    expect(service.tienePermiso('usuario.gestionar')).toBeTrue();
  });

  it('cierra la sesión', () => {
    service.saveSession(respuesta);
    service.logout();
    expect(service.isLogged()).toBeFalse();
    expect(service.user).toBeNull();
  });
});
