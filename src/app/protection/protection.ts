import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege las rutas privadas: exige sesión iniciada y, si la ruta declara
 * data.permisos, que el usuario tenga al menos uno de ellos.
 * Es solo para la navegación: quien realmente autoriza es el backend.
 */
@Injectable({ providedIn: 'root' })
export class Protection implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const targetUrl = state.url || '/menu';

    if (!this.auth.isLogged()) {
      return this.router.parseUrl(`/login?returnUrl=${encodeURIComponent(targetUrl)}`);
    }

    // Un cliente solo entra a las pantallas marcadas como del portal.
    if (this.auth.esCliente && !route.data?.['portal']) {
      return this.router.parseUrl('/portal');
    }

    const permisos = route.data?.['permisos'] as string[] | undefined;
    if (permisos?.length && !this.auth.tieneAlguno(permisos)) {
      return this.router.parseUrl(this.auth.inicio);
    }

    return true;
  }
}
