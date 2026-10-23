import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { Protection } from './protection';
import { AuthService } from '../services/auth.service';

describe('Protection', () => {
  let guard: Protection;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  const ruta = (permisos?: string[]) => ({ data: permisos ? { permisos } : {} }) as unknown as ActivatedRouteSnapshot;
  const estado = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLogged', 'tieneAlguno']);
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    });
    guard = TestBed.inject(Protection);
    router = TestBed.inject(Router);
  });

  it('manda al login a quien no ha iniciado sesión', () => {
    auth.isLogged.and.returnValue(false);
    const res = guard.canActivate(ruta(), estado('/usuarios')) as UrlTree;
    expect(router.serializeUrl(res)).toBe('/login?returnUrl=%2Fusuarios');
  });

  it('manda al menú a quien no tiene el permiso de la ruta', () => {
    auth.isLogged.and.returnValue(true);
    auth.tieneAlguno.and.returnValue(false);
    const res = guard.canActivate(ruta(['usuario.gestionar']), estado('/usuarios')) as UrlTree;
    expect(router.serializeUrl(res)).toBe('/menu');
  });

  it('deja pasar a quien tiene el permiso', () => {
    auth.isLogged.and.returnValue(true);
    auth.tieneAlguno.and.returnValue(true);
    expect(guard.canActivate(ruta(['usuario.gestionar']), estado('/usuarios'))).toBeTrue();
  });
});
