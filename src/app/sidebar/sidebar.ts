import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SECCIONES, SeccionApp, ModuloApp } from '../navegacion';

/** Barra lateral de las pantallas internas, con los enlaces que el usuario puede usar. */
@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar {

  readonly secciones = SECCIONES;

  constructor(public auth: AuthService, private router: Router) {}

  /** Módulos de la sección que el usuario puede abrir. */
  visibles(seccion: SeccionApp): ModuloApp[] {
    return seccion.modulos.filter(m => this.auth.tieneAlguno(m.permisos));
  }

  get iniciales(): string {
    return this.auth.nombreVisible
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }

  get cargo(): string {
    return this.auth.esSuperusuario ? 'Superusuario' : (this.auth.user?.nombreUsuario ?? '');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
