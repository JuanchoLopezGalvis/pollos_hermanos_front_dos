import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login } from './login/login';
import { Menu } from './menu/menu';
import { Usuarios } from './usuarios/usuarios';
import { Roles } from './roles/roles';
import { Permisos } from './permisos/permisos';
import { Galpones } from './galpones/galpones';
import { Lotes } from './lotes/lotes';
import { Panel } from './panel/panel';
import { permisosDe } from './navegacion';

import { Protection } from './protection/protection';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  { path: 'login', component: Login },

  { path: 'menu', component: Menu, canActivate: [Protection] },
  {
    path: 'panel',
    component: Panel,
    canActivate: [Protection],
    data: { permisos: permisosDe('/panel') }
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
