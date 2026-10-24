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
});
