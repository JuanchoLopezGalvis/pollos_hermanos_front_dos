import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Proveedores } from './proveedores';
import { ProveedorService } from '../services/proveedor.service';
import { AuthService } from '../services/auth.service';

describe('Proveedores', () => {
  it('valida el formulario antes de enviarlo', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    await TestBed.configureTestingModule({
      declarations: [Proveedores],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: ProveedorService, useValue: { obtenerTodos: () => of([]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Proveedores);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.nuevo();
    c.form.patchValue({ nit: '900123456-7', nombre: 'Concentrados', suministraAlimento: false, suministraSanidad: false });
    expect(c.form.errors?.['sinSuministro']).toBeTrue();
    c.form.patchValue({ suministraSanidad: true });
    expect(c.form.valid).toBeTrue();
  });
});
