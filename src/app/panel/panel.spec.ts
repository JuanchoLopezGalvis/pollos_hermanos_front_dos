import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { Panel } from './panel';
import { GalponService } from '../services/galpon.service';
import { LoteService, LoteDTO } from '../services/lote.service';
import { GastosService } from '../services/gastos.service';
import { AuthService } from '../services/auth.service';

function lote(id: number, estado: LoteDTO['estado'], vivos: number, edad: number): LoteDTO {
  return { id, codigo: `ESC-0${id}`, idGalpon: 1, galpon: 'Galpón 1', fechaIngreso: '2026-10-01', cantidadInicial: 100, costoPollito: 2800,
    costoPollitos: 280000, fechaEstimadaVenta: `2026-11-0${id}`, estado, edadDias: edad, mortalidadAcumulada: 100 - vivos,
    porcentajeMortalidad: 100 - vivos, avesDisponibles: estado === 'VENDIDO' ? 0 : vivos, alertaMortalidad: false,
    avesVendidas: estado === 'VENDIDO' ? vivos : 0, consumoAlimentoBultos: 10, consumoAlimentoKg: 400 };
}

describe('Panel', () => {
  it('separa por galpón los lotes activos y terminados y suma la ganancia de los vendidos', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    await TestBed.configureTestingModule({
      declarations: [Panel],
      imports: [RouterTestingModule],
      providers: [
        { provide: GalponService, useValue: { ocupacion: () => of([{ idGalpon: 1, nombre: 'Galpón 1', capacidadMaxima: 600, estado: 'OCUPADO',
                                                                       lotesActivos: 2, avesAlojadas: 198, capacidadLibre: 402 }]) } },
        { provide: LoteService, useValue: { obtenerTodos: () => of([lote(1, 'VENDIDO', 96, 40), lote(2, 'EN_ENGORDE', 99, 29), lote(3, 'EN_ENGORDE', 99, 22)]) } },
        { provide: GastosService, useValue: { balance: () => of([{ idLote: 1, avesVendidas: 96, ganancia: 3598000 }]) } },
        { provide: AuthService, useValue: auth }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Panel);
    fixture.detectChanges();
    const panel = fixture.componentInstance;

    expect(panel.vistas[0].activos.map(l => l.codigo)).toEqual(['ESC-02', 'ESC-03']);
    expect(panel.vistas[0].terminados.map(l => l.codigo)).toEqual(['ESC-01']);
    expect(panel.avesAlojadas).toBe(198);
    expect(panel.gananciaAcumulada).toBe(3598000);
  });
});
