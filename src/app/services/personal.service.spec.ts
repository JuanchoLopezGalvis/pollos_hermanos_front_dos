import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PersonalService } from './personal.service';
import { environment } from '../../environments/environment';

describe('PersonalService', () => {
  let service: PersonalService;
  let http: HttpTestingController;
  const base = `${environment.api}/empleados`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PersonalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('filtra empleados activos por cargo y retira', () => {
    service.obtener(true, 'BENEFICIADORA').subscribe();
    expect(http.expectOne(`${base}?activos=true&cargo=BENEFICIADORA`).request.method).toBe('GET');

    service.retirar(4).subscribe();
    const retiro = http.expectOne(`${base}/4/retiro`);
    expect(retiro.request.method).toBe('PATCH');
    expect(retiro.request.body).toEqual({ fechaRetiro: null });
  });
});
