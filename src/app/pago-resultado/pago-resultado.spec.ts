import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { PagoResultado } from './pago-resultado';
import { PortalService } from '../services/portal.service';
import { AuthService } from '../services/auth.service';

describe('PagoResultado', () => {
  const resultado = { idTransaccion: 'tx-1', estadoTransaccion: 'APPROVED', registrado: true,
    idVenta: 7, monto: 1000000, saldo: 2184000, mensaje: 'Pago aprobado y registrado en la venta 7.' };
  let portal: jasmine.SpyObj<PortalService>;

  async function crear() {
    portal = jasmine.createSpyObj<PortalService>('PortalService', ['confirmarPago']);
    portal.confirmarPago.and.returnValue(of(resultado));
    await TestBed.configureTestingModule({
      declarations: [PagoResultado],
      imports: [RouterTestingModule],
      providers: [
        { provide: PortalService, useValue: portal },
        { provide: AuthService, useValue: { esCliente: true } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ id: 'tx-1', env: 'test' }) } } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(PagoResultado);
    fixture.detectChanges();
    return fixture;
  }

  it('confirma por el portal la transacción que devolvió Wompi', async () => {
    const fixture = await crear();

    expect(portal.confirmarPago).toHaveBeenCalledWith('tx-1');
    expect(fixture.componentInstance.resultado?.registrado).toBeTrue();
  });
});
