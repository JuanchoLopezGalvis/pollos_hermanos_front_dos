import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RolService } from './rol.service';
import { environment } from '../../environments/environment';

describe('RolService', () => {
  let service: RolService;
  let http: HttpTestingController;
  const base = `${environment.api}/roles`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(RolService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los registros', () => {
    service.obtenerTodos().subscribe(data => expect(data.length).toBe(1));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([{ nombre: 'Gerente', permisos: [] }]);
  });

  it('crea, actualiza y elimina con los verbos correctos', () => {
    service.crear({ nombre: 'Gerente', permisos: [] }).subscribe();
    expect(http.expectOne(base).request.method).toBe('POST');

    service.actualizar(1, { nombre: 'Gerente', permisos: [] }).subscribe();
    expect(http.expectOne(`${base}/1`).request.method).toBe('PUT');

    service.eliminar(1).subscribe();
    expect(http.expectOne(`${base}/1`).request.method).toBe('DELETE');
  });
});
