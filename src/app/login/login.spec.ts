import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PasswordModule } from 'primeng/password';

import { Login } from './login';
import { AuthService } from '../services/auth.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    localStorage.clear();
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'isLogged']);
    auth.isLogged.and.returnValue(false);

    await TestBed.configureTestingModule({
      declarations: [Login],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule, PasswordModule],
      providers: [{ provide: AuthService, useValue: auth }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no envía el formulario vacío', () => {
    component.onSubmit();
    expect(auth.login).not.toHaveBeenCalled();
    expect(component.errorMsg).toContain('usuario');
  });

  it('navega al menú cuando el login es correcto', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    auth.login.and.returnValue(of({
      token: 't', tipo: 'Bearer', nombreUsuario: 'admin', nombreCompleto: 'Admin',
      superusuario: true, permisos: []
    }));

    component.form.patchValue({ usuario: 'admin', contrasena: 'secreta123' });
    component.onSubmit();

    expect(auth.login).toHaveBeenCalledWith({ usuario: 'admin', contrasena: 'secreta123' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/menu');
  });

  it('muestra el mensaje del backend cuando las credenciales fallan', () => {
    auth.login.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 401,
      error: { estado: 401, mensaje: 'Usuario o contraseña incorrectos.', detalles: [] }
    })));

    component.form.patchValue({ usuario: 'admin', contrasena: 'mala' });
    component.onSubmit();

    expect(component.errorMsg).toBe('Usuario o contraseña incorrectos.');
  });
});
