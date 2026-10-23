import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Tarjeta de un módulo en la página de inicio. */
export interface ModuloMenu {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta?: string;
  permisos?: string[];
}

/**
 * Página de inicio. Muestra los módulos disponibles según los permisos del usuario;
 * los que aún no tienen backend aparecen como "Próximamente".
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

  readonly modulos: ModuloMenu[] = [
    {
      titulo: 'Seguimiento del crecimiento',
      descripcion: 'Peso promedio, temperatura, humedad y novedades diarias de cada lote activo.',
      icono: 'pi pi-chart-line',
      ruta: '/seguimiento',
      permisos: ['seguimiento.ver', 'seguimiento.registrar']
    },
    {
      titulo: 'Usuarios',
      descripcion: 'Crear, modificar y desactivar las cuentas del sistema.',
      icono: 'pi pi-users',
      ruta: '/usuarios',
      permisos: ['usuario.gestionar']
    },
    {
      titulo: 'Roles',
      descripcion: 'Agrupar permisos por cargo o responsabilidad.',
      icono: 'pi pi-id-card',
      ruta: '/roles',
      permisos: ['rol.gestionar']
    },
    {
      titulo: 'Permisos',
      descripcion: 'Catálogo de permisos con la forma modulo.accion.',
      icono: 'pi pi-key',
      ruta: '/permisos',
      permisos: ['rol.gestionar', 'usuario.gestionar']
    },
    { titulo: 'Lotes y galpones', descripcion: 'Ingreso de lotes, estados y ocupación de galpones.', icono: 'pi pi-home' },
    { titulo: 'Mortalidad y alimentación', descripcion: 'Registro diario de mortalidad y consumo de alimento por etapa.', icono: 'pi pi-box' },
    { titulo: 'Sanidad', descripcion: 'Aplicaciones de vitaminas y medicamentos por lote.', icono: 'pi pi-heart' },
    { titulo: 'Costos', descripcion: 'Costo del lote: pollitos, alimento, sanidad, beneficio y otros gastos.', icono: 'pi pi-calculator' },
    { titulo: 'Pedidos y ventas', descripcion: 'Pedidos por lote, ventas con precio por kilo y entregas.', icono: 'pi pi-shopping-cart' },
    { titulo: 'Pagos y cartera', descripcion: 'Pagos parciales, pasarela sandbox y cartera vencida.', icono: 'pi pi-wallet' }
  ];

  constructor(private router: Router, public auth: AuthService) {}

  /** Módulos que ya tienen pantalla, sin importar si el usuario tiene permiso. */
  get conPantalla(): ModuloMenu[] {
    return this.modulos.filter(m => !!m.ruta);
  }

  /** Módulos que aún no tienen backend. */
  get proximos(): ModuloMenu[] {
    return this.modulos.filter(m => !m.ruta);
  }

  disponible(m: ModuloMenu): boolean {
    return !!m.ruta && (!m.permisos || this.auth.tieneAlguno(m.permisos));
  }

  estado(m: ModuloMenu): string {
    if (!m.ruta) return 'Próximamente';
    return this.disponible(m) ? 'Entrar' : 'Sin permiso';
  }

  abrir(m: ModuloMenu): void {
    if (this.disponible(m)) {
      this.router.navigate([m.ruta]);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
