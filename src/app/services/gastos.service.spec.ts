import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GastosService } from './gastos.service';
import { environment } from '../../environments/environment';

describe('GastosService', () => {
  let service: GastosService;
  let http: HttpTestingController;
  const api = environment.api;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GastosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('filtra por lote y registra una jornada de beneficio', () => {
    service.gastos(3).subscribe();
    expect(http.expectOne(`${api}/gastos?lote=3`).request.method).toBe('GET');

    service.registrarJornada({ idLote: 3, detalle: [{ idEmpleado: 4, avesBeneficiadas: 96, tarifaPorAve: 1000 }] }).subscribe();
    expect(http.expectOne(`${api}/beneficio/jornadas`).request.body.detalle.length).toBe(1);
  });

  it('consulta el balance de un lote', () => {
    service.balanceLote(3).subscribe(b => expect(b.ganancia).toBe(3598000));
    http.expectOne(`${api}/costos/lotes/3`).flush({ idLote: 3, ganancia: 3598000 });
  });
});
