import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { Alimentacion } from './alimentacion';
import { AlimentacionService } from '../services/alimentacion.service';
import { ProveedorService } from '../services/proveedor.service';
import { LoteService } from '../services/lote.service';
import { AuthService } from '../services/auth.service';

describe('Alimentacion', () => {
  it('sugiere el alimento de la etapa que corresponde a la edad del lote', async () => {
    const svc = jasmine.createSpyObj<AlimentacionService>('AlimentacionService', ['etapas', 'inventario', 'compras', 'consumos']);
    svc.etapas.and.returnValue(of([
      { idEtapa: 1, nombre: 'Preiniciación', orden: 1, diaInicio: 1, diaFin: 7 },
      { idEtapa: 2, nombre: 'Iniciación', orden: 2, diaInicio: 8, diaFin: 21 }
    ]));
    svc.inventario.and.returnValue(of([
      { idTipoAlimento: 1, nombre: 'Preiniciador', etapa: 'Preiniciación', diaInicio: 1, diaFin: 7, pesoBultoKg: 40, activo: true,
        bultosComprados: 10, bultosConsumidos: 0, bultosDisponibles: 10 },
      { idTipoAlimento: 2, nombre: 'Iniciador', etapa: 'Iniciación', diaInicio: 8, diaFin: 21, pesoBultoKg: 40, activo: true,
        bultosComprados: 10, bultosConsumidos: 0, bultosDisponibles: 10 }
    ]));
    svc.compras.and.returnValue(of([]));
    svc.consumos.and.returnValue(of([]));
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso']);
    auth.tienePermiso.and.returnValue(true);
    await TestBed.configureTestingModule({
      declarations: [Alimentacion],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: AlimentacionService, useValue: svc },
        { provide: ProveedorService, useValue: { obtenerTodos: () => of([]) } },
        { provide: LoteService, useValue: { obtenerTodos: () => of([{ id: 3, codigo: 'ESC-06', fechaIngreso: '2026-10-01', estado: 'EN_ENGORDE' }]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Alimentacion);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.abrir('consumo');
    c.formConsumo.patchValue({ idLote: 3, fecha: '2026-10-10' });
    c.sugerirAlimento();

    expect(c.edadConsumo).toBe(10);
    expect(c.etapaSugerida?.nombre).toBe('Iniciación');
    expect(c.formConsumo.value.idTipoAlimento).toBe(2);
  });
});
