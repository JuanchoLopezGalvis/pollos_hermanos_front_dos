import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PermisoService } from './permiso.service';
import { environment } from '../../environments/environment';

describe('PermisoService', () => {
  let service: PermisoService;
  let http: HttpTestingController;
  const base = `${environment.api}/permisos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PermisoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los registros', () => {
    service.obtenerTodos().subscribe(data => expect(data.length).toBe(1));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([{ codigo: 'lote.crear' }]);
  });

  it('crea, actualiza y elimina con los verbos correctos', () => {
    service.crear({ codigo: 'lote.crear' }).subscribe();
    expect(http.expectOne(base).request.method).toBe('POST');

    service.actualizar(1, { codigo: 'lote.crear' }).subscribe();
    expect(http.expectOne(`${base}/1`).request.method).toBe('PUT');

    service.eliminar(1).subscribe();
    expect(http.expectOne(`${base}/1`).request.method).toBe('DELETE');
  });
});
