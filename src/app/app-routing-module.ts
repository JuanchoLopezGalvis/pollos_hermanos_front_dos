import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login } from './login/login';
import { Menu } from './menu/menu';
import { Seguimiento } from './seguimiento/seguimiento';
import { Usuarios } from './usuarios/usuarios';
import { Roles } from './roles/roles';
import { Permisos } from './permisos/permisos';

import { Protection } from './protection/protection';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  { path: 'login', component: Login },

  { path: 'menu', component: Menu, canActivate: [Protection] },
  {
    path: 'seguimiento',
    component: Seguimiento,
    canActivate: [Protection],
    data: { permisos: ['seguimiento.ver', 'seguimiento.registrar'] }
  },
  {
    path: 'usuarios',
    component: Usuarios,
    canActivate: [Protection],
    data: { permisos: ['usuario.gestionar'] }
  },
  {
    path: 'roles',
    component: Roles,
    canActivate: [Protection],
    data: { permisos: ['rol.gestionar'] }
  },
  {
    path: 'permisos',
    component: Permisos,
    canActivate: [Protection],
    data: { permisos: ['rol.gestionar', 'usuario.gestionar'] }
  },

  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
