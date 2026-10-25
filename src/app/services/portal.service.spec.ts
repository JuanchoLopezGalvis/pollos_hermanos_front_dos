import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PortalService } from './portal.service';
import { environment } from '../../environments/environment';

describe('PortalService', () => {
  let service: PortalService;
  let http: HttpTestingController;
  const base = `${environment.api}/portal`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PortalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea el pedido solo con la cantidad, la fecha y las observaciones', () => {
    service.crearPedido({ cantidadAves: 20, fechaEstimadaEntrega: '2026-10-28' }).subscribe();
    const req = http.expectOne(`${base}/pedidos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cantidadAves: 20, fechaEstimadaEntrega: '2026-10-28' });
    req.flush({});
  });

  it('inicia y confirma el pago por las rutas del portal', () => {
    service.iniciarPago(5, 1000, 'http://localhost/pago-resultado').subscribe();
    const inicio = http.expectOne(`${base}/ventas/5/pago-en-linea`);
    expect(inicio.request.body).toEqual({ monto: 1000, urlRetorno: 'http://localhost/pago-resultado' });
    inicio.flush({});

    service.confirmarPago('tx-1').subscribe();
    http.expectOne(`${base}/pagos-en-linea/confirmar`).flush({});
  });
});
