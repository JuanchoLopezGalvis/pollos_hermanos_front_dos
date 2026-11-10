import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AlimentacionService } from './alimentacion.service';
import { environment } from '../../environments/environment';

describe('AlimentacionService', () => {
  let service: AlimentacionService;
  let http: HttpTestingController;
  const base = `${environment.api}/alimentacion`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AlimentacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el inventario y registra un consumo', () => {
    service.inventario().subscribe();
    expect(http.expectOne(`${base}/inventario`).request.method).toBe('GET');

    service.registrarConsumo({ idLote: 3, idTipoAlimento: 1, cantidadBultos: 2 }).subscribe();
    expect(http.expectOne(`${base}/consumos`).request.method).toBe('POST');
  });
});
