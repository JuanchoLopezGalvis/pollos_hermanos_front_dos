import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Clientes } from './clientes';
import { ComercialService } from '../services/comercial.service';
import { CatalogoService } from '../services/catalogo.service';
import { AuthService } from '../services/auth.service';

describe('Clientes', () => {
  it('valida el formulario antes de enviarlo', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    await TestBed.configureTestingModule({
      declarations: [Clientes],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: ComercialService, useValue: { clientes: () => of([]) } }, { provide: CatalogoService, useValue: { obtener: () => of([]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Clientes);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.nuevo();
    c.form.patchValue({ idTipoCliente: 1, documento: '900', nombre: 'Asadero' });
    expect(c.form.errors?.['sinContacto']).toBeTrue();
    c.form.patchValue({ telefono: '3105550000' });
    expect(c.form.valid).toBeTrue();
  });

  it('crea la cuenta del portal de un cliente con su correo', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    const comercial = jasmine.createSpyObj<ComercialService>('ComercialService', ['clientes', 'crearCuentaCliente']);
    comercial.clientes.and.returnValue(of([]));
    const cliente = { idCliente: 4, idTipoCliente: 1, tipoCliente: 'Tienda', documento: '900', nombre: 'Asadero', correo: 'a@b.co', activo: true };
    comercial.crearCuentaCliente.and.returnValue(of({ ...cliente, idUsuario: 9, usuario: 'asadero' }));
    await TestBed.configureTestingModule({
      declarations: [Clientes],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: ComercialService, useValue: comercial }, { provide: CatalogoService, useValue: { obtener: () => of([]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const c = TestBed.createComponent(Clientes).componentInstance;

    c.nuevaCuenta(cliente);
    expect(c.formCuenta.value.correo).toBe('a@b.co');
    c.crearCuenta();
    expect(comercial.crearCuentaCliente).not.toHaveBeenCalled();

    c.formCuenta.patchValue({ nombreUsuario: 'asadero', contrasena: 'Clave1234' });
    c.crearCuenta();
    expect(comercial.crearCuentaCliente).toHaveBeenCalledWith(4, { nombreUsuario: 'asadero', contrasena: 'Clave1234', correo: 'a@b.co' });
    expect(c.conCuentaNueva).toBeNull();
  });
});
