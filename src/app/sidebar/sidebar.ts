import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Barra lateral de las pantallas internas, con los enlaces que el usuario puede usar. */
@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar {

  constructor(public auth: AuthService, private router: Router) {}

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
