import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SECCIONES, MODULOS, ModuloApp } from '../navegacion';

/**
 * Página de inicio. Muestra los módulos por sección; los que el usuario no puede
 * abrir aparecen deshabilitados.
 */
@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.html',
  styleUrls: ['./menu.css']
})
export class Menu {

  menuAbierto = false;
  readonly anio = new Date().getFullYear();

  readonly secciones = SECCIONES;

  /** Todos los módulos, en el orden de la barra lateral. */
  readonly modulos = MODULOS;

  constructor(private router: Router, public auth: AuthService) {}

  disponible(m: ModuloApp): boolean {
    return this.auth.tieneAlguno(m.permisos);
  }

  estado(m: ModuloApp): string {
    return this.disponible(m) ? 'Entrar' : 'Sin permiso';
  }

  abrir(m: ModuloApp): void {
    if (this.disponible(m)) {
      this.router.navigate([m.ruta]);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
