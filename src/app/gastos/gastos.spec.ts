import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { Gastos } from './gastos';
import { GastosService } from '../services/gastos.service';
import { CatalogoService } from '../services/catalogo.service';
import { PersonalService } from '../services/personal.service';
import { LoteService } from '../services/lote.service';
import { AuthService } from '../services/auth.service';

describe('Gastos', () => {
  it('suma el pago de la jornada de beneficio por pollo y beneficiadora', async () => {
    const gastos = jasmine.createSpyObj<GastosService>('GastosService', ['gastos', 'jornadas', 'otrosIngresos', 'registrarJornada']);
    gastos.gastos.and.returnValue(of([]));
    gastos.jornadas.and.returnValue(of([]));
    gastos.otrosIngresos.and.returnValue(of([]));
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso']);
    auth.tienePermiso.and.returnValue(true);
    await TestBed.configureTestingModule({
      declarations: [Gastos],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: GastosService, useValue: gastos },
        { provide: CatalogoService, useValue: { obtener: () => of([]) } },
        { provide: PersonalService, useValue: { obtener: () => of([]) } },
        { provide: LoteService, useValue: { obtenerTodos: () => of([]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Gastos);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.abrir('jornada');
    c.lineas.at(0).patchValue({ idEmpleado: 1, avesBeneficiadas: 50, tarifaPorAve: 1000 });
    c.agregarLinea();
    c.lineas.at(1).patchValue({ idEmpleado: 2, avesBeneficiadas: 46 });

    expect(c.lineas.at(1).value.tarifaPorAve).toBe(1000);
    expect(c.totalJornada).toBe(96000);
  });
});
