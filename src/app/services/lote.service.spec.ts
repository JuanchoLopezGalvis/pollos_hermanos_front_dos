import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LoteService } from './lote.service';
import { environment } from '../../environments/environment';

describe('LoteService', () => {
  let service: LoteService;
  let http: HttpTestingController;
  const base = `${environment.api}/lotes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(LoteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registra un lote y cambia su estado', () => {
    service.crear({ codigo: 'L-1', idGalpon: 1, fechaIngreso: '2026-10-01', cantidadInicial: 100, costoPollito: 2500 })
      .subscribe();
    const crear = http.expectOne(base);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body.codigo).toBe('L-1');

    service.cambiarEstado(7, 'LISTO_PARA_VENTA').subscribe();
    const estado = http.expectOne(`${base}/7/estado`);
    expect(estado.request.method).toBe('PATCH');
    expect(estado.request.body).toEqual({ estado: 'LISTO_PARA_VENTA' });
  });

  it('consulta y registra la mortalidad de un lote', () => {
    service.obtenerMortalidad(7).subscribe();
    expect(http.expectOne(`${base}/7/mortalidad`).request.method).toBe('GET');

    service.registrarMortalidad(7, { cantidad: 12, causa: 'calor' }).subscribe(r => expect(r.alerta).toBeTrue());
    const registrar = http.expectOne(`${base}/7/mortalidad`);
    expect(registrar.request.method).toBe('POST');
    registrar.flush({ idMortalidad: 1, porcentajeMortalidad: 5.5, alerta: true });

    service.actualizarMortalidad(7, 1, { cantidad: 10 }).subscribe();
    expect(http.expectOne(`${base}/7/mortalidad/1`).request.method).toBe('PUT');
  });
});
