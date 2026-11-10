import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login } from './login/login';
import { Menu } from './menu/menu';
import { Seguimiento } from './seguimiento/seguimiento';
import { Usuarios } from './usuarios/usuarios';
import { Roles } from './roles/roles';
import { Permisos } from './permisos/permisos';
import { Galpones } from './galpones/galpones';
import { Lotes } from './lotes/lotes';
import { Panel } from './panel/panel';
import { Personal } from './personal/personal';
import { Proveedores } from './proveedores/proveedores';
import { Alimentacion } from './alimentacion/alimentacion';
import { Sanidad } from './sanidad/sanidad';
import { Gastos } from './gastos/gastos';
import { Balance } from './balance/balance';
import { Clientes } from './clientes/clientes';
import { Pedidos } from './pedidos/pedidos';
import { Ventas } from './ventas/ventas';
import { PagoResultado } from './pago-resultado/pago-resultado';
import { Registro } from './registro/registro';
import { Portal } from './portal/portal';
import { permisosDe } from './navegacion';
import { PERMISO_PORTAL } from './services/auth.service';

import { Protection } from './protection/protection';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'registro', component: Registro },

  // Portal de clientes: lo único a lo que entra una cuenta de cliente.
  {
    path: 'portal',
    component: Portal,
    canActivate: [Protection],
    data: { permisos: [PERMISO_PORTAL], portal: true }
  },

  { path: 'menu', component: Menu, canActivate: [Protection] },
  {
    path: 'panel',
    component: Panel,
    canActivate: [Protection],
    data: { permisos: permisosDe('/panel') }
  },
  {
    path: 'personal',
    component: Personal,
    canActivate: [Protection],
    data: { permisos: permisosDe('/personal') }
  },
  {
    path: 'proveedores',
    component: Proveedores,
    canActivate: [Protection],
    data: { permisos: permisosDe('/proveedores') }
  },
  {
    path: 'alimentacion',
    component: Alimentacion,
    canActivate: [Protection],
    data: { permisos: permisosDe('/alimentacion') }
  },
  {
    path: 'sanidad',
    component: Sanidad,
    canActivate: [Protection],
    data: { permisos: permisosDe('/sanidad') }
  },
  {
    path: 'gastos',
    component: Gastos,
    canActivate: [Protection],
    data: { permisos: permisosDe('/gastos') }
  },
  {
    path: 'balance',
    component: Balance,
    canActivate: [Protection],
    data: { permisos: permisosDe('/balance') }
  },
  {
    path: 'clientes',
    component: Clientes,
    canActivate: [Protection],
    data: { permisos: permisosDe('/clientes') }
  },
  {
    path: 'pedidos',
    component: Pedidos,
    canActivate: [Protection],
    data: { permisos: permisosDe('/pedidos') }
  },
  {
    path: 'ventas',
    component: Ventas,
    canActivate: [Protection],
    data: { permisos: permisosDe('/ventas') }
  },
  {
    path: 'pago-resultado',
    component: PagoResultado,
    canActivate: [Protection],
    data: { permisos: [PERMISO_PORTAL], portal: true }
  },
  {
    path: 'galpones',
    component: Galpones,
    canActivate: [Protection],
    data: { permisos: permisosDe('/galpones') }
  },
  {
    path: 'lotes',
    component: Lotes,
    canActivate: [Protection],
    data: { permisos: permisosDe('/lotes') }
  },
  {
    path: 'seguimiento',
    component: Seguimiento,
    canActivate: [Protection],
    data: { permisos: permisosDe('/seguimiento') }
  },
  {
    path: 'usuarios',
    component: Usuarios,
    canActivate: [Protection],
    data: { permisos: permisosDe('/usuarios') }
  },
  {
    path: 'roles',
    component: Roles,
    canActivate: [Protection],
    data: { permisos: permisosDe('/roles') }
  },
  {
    path: 'permisos',
    component: Permisos,
    canActivate: [Protection],
    data: { permisos: permisosDe('/permisos') }
  },

  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
