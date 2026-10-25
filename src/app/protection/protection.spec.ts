import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { Protection } from './protection';
import { AuthService } from '../services/auth.service';

describe('Protection', () => {
  let guard: Protection;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  const ruta = (permisos?: string[], portal = false) =>
    ({ data: { ...(permisos ? { permisos } : {}), ...(portal ? { portal } : {}) } }) as unknown as ActivatedRouteSnapshot;
  const propiedades = { esCliente: false, inicio: '/menu' };
  const estado = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLogged', 'tieneAlguno'], propiedades);
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

  it('manda al portal a un cliente que intenta entrar a una pantalla del personal', () => {
    auth.isLogged.and.returnValue(true);
    auth.tieneAlguno.and.returnValue(true);
    (Object.getOwnPropertyDescriptor(auth, 'esCliente')!.get as jasmine.Spy).and.returnValue(true);
    const res = guard.canActivate(ruta(), estado('/menu')) as UrlTree;
    expect(router.serializeUrl(res)).toBe('/portal');
  });

  it('deja entrar a un cliente a las pantallas del portal', () => {
    auth.isLogged.and.returnValue(true);
    auth.tieneAlguno.and.returnValue(true);
    (Object.getOwnPropertyDescriptor(auth, 'esCliente')!.get as jasmine.Spy).and.returnValue(true);
    expect(guard.canActivate(ruta(['portal.cliente'], true), estado('/portal'))).toBeTrue();
  });
});
