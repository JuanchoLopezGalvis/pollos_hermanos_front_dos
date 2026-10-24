import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { PagoResultado } from './pago-resultado';
import { ComercialService } from '../services/comercial.service';

describe('PagoResultado', () => {
  it('confirma la transacción que devolvió la pasarela', async () => {
    const comercial = jasmine.createSpyObj<ComercialService>('ComercialService', ['confirmarPagoEnLinea']);
    comercial.confirmarPagoEnLinea.and.returnValue(of({ idTransaccion: 'tx-1', estadoTransaccion: 'APPROVED', registrado: true,
      idVenta: 7, monto: 1000000, saldo: 2184000, mensaje: 'Pago aprobado y registrado en la venta 7.' }));
    await TestBed.configureTestingModule({
      declarations: [PagoResultado],
      imports: [RouterTestingModule],
      providers: [
        { provide: ComercialService, useValue: comercial },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ id: 'tx-1', env: 'test' }) } } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(PagoResultado);
    fixture.detectChanges();

    expect(comercial.confirmarPagoEnLinea).toHaveBeenCalledWith('tx-1');
    expect(fixture.componentInstance.resultado?.registrado).toBeTrue();
  });
});
