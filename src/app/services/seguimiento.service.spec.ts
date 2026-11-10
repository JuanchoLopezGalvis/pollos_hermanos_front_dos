import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SeguimientoService } from './seguimiento.service';
import { environment } from '../../environments/environment';

describe('SeguimientoService', () => {
  let service: SeguimientoService;
  let http: HttpTestingController;
  const base = `${environment.api}/seguimientos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SeguimientoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta los seguimientos y la curva de un lote', () => {
    service.obtenerPorLote('L 01').subscribe();
    expect(http.expectOne(`${base}/lote/L%2001`).request.method).toBe('GET');

    service.curvaSemanal('L1').subscribe(c => expect(c[0].semana).toBe(1));
    http.expectOne(`${base}/lote/L1/curva-semanal`).flush([{ semana: 1, pesoPromedioGramos: 150, registros: 7 }]);
  });

  it('registra, actualiza y elimina', () => {
    service.crear({ codigoLote: 'L1' }).subscribe();
    const crear = http.expectOne(base);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual({ codigoLote: 'L1' });

    service.actualizar('abc', { codigoLote: 'L1', pesoPromedioGramos: 400 }).subscribe();
    expect(http.expectOne(`${base}/abc`).request.method).toBe('PUT');

    service.eliminar('abc').subscribe();
    expect(http.expectOne(`${base}/abc`).request.method).toBe('DELETE');
  });
});
