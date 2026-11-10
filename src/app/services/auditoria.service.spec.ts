import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuditoriaService } from './auditoria.service';
import { environment } from '../../environments/environment';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let http: HttpTestingController;
  const base = `${environment.api}/auditoria`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuditoriaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía solo los filtros con valor, junto con la página', () => {
    service.buscar({ tabla: 'lote', operacion: null, usuario: '  ', soloSistema: false, registro: ' 52 ' }, 2, 50).subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('tabla')).toBe('lote');
    expect(req.request.params.get('registro')).toBe('52');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.has('usuario')).toBeFalse();
    expect(req.request.params.has('operacion')).toBeFalse();
    expect(req.request.params.has('soloSistema')).toBeFalse();
    req.flush({ registros: [], total: 0, pagina: 2, tamano: 50 });
  });

  it('pide solo los cambios del sistema y las tablas', () => {
    service.buscar({ soloSistema: true }).subscribe();
    expect(http.expectOne(r => r.url === base).request.params.get('soloSistema')).toBe('true');

    service.tablas().subscribe(t => expect(t).toEqual(['lote']));
    http.expectOne(`${base}/tablas`).flush(['lote']);
  });
});
