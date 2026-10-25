import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { PasswordModule } from 'primeng/password';
import { of, throwError } from 'rxjs';

import { Registro } from './registro';
import { AuthService } from '../services/auth.service';

describe('Registro', () => {
  let component: Registro;
  let fixture: ComponentFixture<Registro>;
  let auth: jasmine.SpyObj<AuthService>;

  const datos = {
    idTipoCliente: 1, documento: ' 900123 ', nombre: 'Asadero', telefono: '', correo: 'a@b.co', direccion: 'Calle 1',
    nombreUsuario: 'asadero', contrasena: 'Clave1234', confirmacion: 'Clave1234'
  };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['registrar', 'tiposCliente', 'isLogged']);
    auth.isLogged.and.returnValue(false);
    auth.tiposCliente.and.returnValue(of([{ id: 1, codigo: 'TIENDA', nombre: 'Tienda' }]));

    await TestBed.configureTestingModule({
      declarations: [Registro],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule, PasswordModule],
      providers: [{ provide: AuthService, useValue: auth }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Registro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga los tipos de cliente sin sesión', () => {
    expect(component.tipos.length).toBe(1);
  });

  it('exige que las dos contraseñas coincidan', () => {
    component.form.patchValue({ ...datos, confirmacion: 'otra-clave' });
    component.onSubmit();
    expect(component.form.errors?.['clavesDistintas']).toBeTrue();
    expect(auth.registrar).not.toHaveBeenCalled();
  });

  it('crea la cuenta y entra al portal', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    auth.registrar.and.returnValue(of({
      token: 't', tipo: 'Bearer', nombreUsuario: 'asadero', nombreCompleto: 'Asadero', superusuario: false, permisos: ['portal.cliente']
    }));

    component.form.patchValue(datos);
    component.onSubmit();

    expect(auth.registrar).toHaveBeenCalledWith({
      idTipoCliente: 1, documento: '900123', nombre: 'Asadero', telefono: null, correo: 'a@b.co', direccion: 'Calle 1',
      nombreUsuario: 'asadero', contrasena: 'Clave1234'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/portal']);
  });

  it('muestra el mensaje del backend cuando el documento ya es de un cliente', () => {
    const mensaje = 'Ya estás registrado como cliente con el documento 900123. Pide a la finca que te cree la cuenta.';
    auth.registrar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { estado: 409, mensaje, detalles: [], fecha: '' }
    })));

    component.form.patchValue(datos);
    component.onSubmit();

    expect(component.errorMsg).toBe(mensaje);
  });
});
