import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { Balance } from './balance';
import { GastosService } from '../services/gastos.service';

describe('Balance', () => {
  it('suma ganancias y reparte el costo por componente', async () => {
    const lote = { idLote: 1, codigo: 'ESC-01', estado: 'VENDIDO', costoPollitos: 280000, costoAlimento: 1200000, costoSanidad: 0,
      costoBeneficio: 96000, otrosGastos: 60000, costoTotal: 1636000, avesVendidas: 96, librasVendidas: 576, ingresoVentas: 5184000,
      otrosIngresos: 50000, ingresoTotal: 5234000, ganancia: 3598000 };
    await TestBed.configureTestingModule({
      declarations: [Balance],
      imports: [FormsModule, RouterTestingModule],
      providers: [{ provide: GastosService, useValue: { balance: () => of([lote, { ...lote, idLote: 2, codigo: 'ESC-02', estado: 'EN_ENGORDE', avesVendidas: 0, ganancia: -400000 }]) } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Balance);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    expect(c.gananciaTotal).toBe(3598000);
    expect(c.tieneResultado(c.lotes[1])).toBeFalse();
    expect(c.mejorLote?.codigo).toBe('ESC-01');
    c.seleccionar(c.lotes[0]);
    expect(c.componentes.find(x => x.nombre === 'Alimento')?.porcentaje).toBeCloseTo(73.35, 1);
  });
});
