import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Login } from './login/login';
import { Menu } from './menu/menu';
import { Sidebar } from './sidebar/sidebar';
import { Seguimiento } from './seguimiento/seguimiento';
import { Usuarios } from './usuarios/usuarios';
import { Roles } from './roles/roles';
import { Permisos } from './permisos/permisos';

import { providePrimeNG } from 'primeng/config';
import { TemaPollos } from './tema';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { TokenInterceptor } from './services/token.interceptor';

@NgModule({
  declarations: [
    App,
    Login,
    Menu,
    Sidebar,
    Seguimiento,
    Usuarios,
    Roles,
    Permisos
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    CheckboxModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
    providePrimeNG({ theme: { preset: TemaPollos, options: { darkModeSelector: '.app-dark' } } }),
    MessageService,
    ConfirmationService
  ],
  bootstrap: [App]
})
export class AppModule {}
