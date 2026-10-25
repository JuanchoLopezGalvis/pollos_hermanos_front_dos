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

  it('programa la entrega sin dirección: la base usa la del cliente', () => {
    service.programarEntrega(7, { idEmpleado: 3 }).subscribe();
    const req = http.expectOne(`${api}/ventas/7/entrega`);
    expect(req.request.body).toEqual({ idEmpleado: 3 });
  });
});
