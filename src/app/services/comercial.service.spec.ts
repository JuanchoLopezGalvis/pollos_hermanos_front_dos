import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ComercialService } from './comercial.service';
import { environment } from '../../environments/environment';

describe('ComercialService', () => {
  let service: ComercialService;
  let http: HttpTestingController;
  const api = environment.api;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ComercialService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea, confirma y vende un pedido', () => {
    service.crearPedido({ idCliente: 1, fechaEstimadaEntrega: '2026-11-01', detalle: [{ idLote: 3, cantidadAves: 96 }] }).subscribe();
    expect(http.expectOne(`${api}/pedidos`).request.body.detalle[0].cantidadAves).toBe(96);

    service.confirmarPedido(5).subscribe();
    expect(http.expectOne(`${api}/pedidos/5/confirmar`).request.method).toBe('PATCH');

    service.registrarVenta({ idPedido: 5, pesoTotalLibras: 576, precioLibra: 9000 }).subscribe();
    const venta = http.expectOne(`${api}/ventas`);
    expect(venta.request.method).toBe('POST');
    expect(venta.request.body.pesoTotalLibras).toBe(576);
  });

  it('inicia y confirma el pago en línea', () => {
    service.iniciarPagoEnLinea(7, 1000, 'http://localhost/pago-resultado').subscribe();
    const iniciar = http.expectOne(`${api}/pagos-en-linea/ventas/7`);
    expect(iniciar.request.body).toEqual({ monto: 1000, urlRetorno: 'http://localhost/pago-resultado' });

    service.confirmarPagoEnLinea('tx-1').subscribe();
    expect(http.expectOne(`${api}/pagos-en-linea/confirmar`).request.body).toEqual({ idTransaccion: 'tx-1' });
  });
});
