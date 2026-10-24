import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Sanidad } from './sanidad';
import { SanidadService } from '../services/sanidad.service';
import { ProveedorService } from '../services/proveedor.service';
import { PersonalService } from '../services/personal.service';
import { LoteService } from '../services/lote.service';
import { AuthService } from '../services/auth.service';

describe('Sanidad', () => {
  it('valida el formulario antes de enviarlo', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    await TestBed.configureTestingModule({
      declarations: [Sanidad],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: SanidadService, useValue: { productos: () => of([]), compras: () => of([]), aplicaciones: () => of([]) } }, { provide: ProveedorService, useValue: { obtenerTodos: () => of([]) } }, { provide: PersonalService, useValue: { obtener: () => of([]) } }, { provide: LoteService, useValue: { obtenerTodos: () => of([{ id: 3, codigo: 'ESC-06', fechaIngreso: '2026-10-01', estado: 'EN_ENGORDE' }]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Sanidad);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.abrir('aplicacion');
    c.formAplicacion.patchValue({ idLote: 3, fecha: '2026-10-05' });
    expect(c.edadAplicacion).toBe(5);
  });
});
