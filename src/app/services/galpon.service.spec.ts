import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GalponService } from './galpon.service';
import { environment } from '../../environments/environment';

describe('GalponService', () => {
  let service: GalponService;
  let http: HttpTestingController;
  const base = `${environment.api}/galpones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GalponService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta, crea, actualiza y elimina galpones', () => {
    service.obtenerTodos().subscribe(g => expect(g.length).toBe(1));
    http.expectOne(base).flush([{ id: 1, nombre: 'Galpón 1', capacidadMaxima: 5000, estado: 'DISPONIBLE' }]);

    service.crear({ nombre: 'Galpón 2', capacidadMaxima: 3000 }).subscribe();
    const crear = http.expectOne(base);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual({ nombre: 'Galpón 2', capacidadMaxima: 3000 });

    service.actualizar(2, { nombre: 'Galpón 2', capacidadMaxima: 3500 }).subscribe();
    expect(http.expectOne(`${base}/2`).request.method).toBe('PUT');

    service.eliminar(2).subscribe();
    expect(http.expectOne(`${base}/2`).request.method).toBe('DELETE');
  });
});
