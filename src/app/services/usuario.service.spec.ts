import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UsuarioService } from './usuario.service';
import { environment } from '../../environments/environment';

describe('UsuarioService', () => {
  let service: UsuarioService;
  let http: HttpTestingController;
  const base = `${environment.api}/usuarios`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UsuarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los registros', () => {
    service.obtenerTodos().subscribe(data => expect(data.length).toBe(1));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([{ nombreUsuario: 'dylan', correo: 'dylan@finca.co' }]);
  });

  it('crea, actualiza y elimina con los verbos correctos', () => {
    service.crear({ nombreUsuario: 'dylan', correo: 'dylan@finca.co' }).subscribe();
    expect(http.expectOne(base).request.method).toBe('POST');

    service.actualizar(1, { nombreUsuario: 'dylan', correo: 'dylan@finca.co' }).subscribe();
    expect(http.expectOne(`${base}/1`).request.method).toBe('PUT');

    service.desactivar(1).subscribe();
    expect(http.expectOne(`${base}/1`).request.method).toBe('DELETE');
  });
});
