import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { Lotes } from './lotes';
import { LoteService, LoteDTO } from '../services/lote.service';
import { GalponService } from '../services/galpon.service';
import { AlimentacionService } from '../services/alimentacion.service';
import { SanidadService } from '../services/sanidad.service';
import { AuthService } from '../services/auth.service';

/** Lote de prueba con valores por defecto. */
function lote(cambios: Partial<LoteDTO> = {}): LoteDTO {
  return {
    id: 7, codigo: 'L-2026-01', idGalpon: 1, galpon: 'Galpón 1', fechaIngreso: '2026-10-01',
    cantidadInicial: 4000, costoPollito: 2600, costoPollitos: 10400000, fechaEstimadaVenta: '2026-11-15',
    estado: 'EN_ENGORDE', edadDias: 23, mortalidadAcumulada: 120, porcentajeMortalidad: 3,
    avesDisponibles: 3880, alertaMortalidad: false, avesVendidas: 0, consumoAlimentoBultos: 80,
    consumoAlimentoKg: 3200, ...cambios
  };
}

describe('Lotes', () => {
  let component: Lotes;
  let fixture: ComponentFixture<Lotes>;
  let svc: jasmine.SpyObj<LoteService>;
  let messages: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj<LoteService>('LoteService',
      ['obtenerTodos', 'crear', 'actualizar', 'cambiarEstado', 'obtenerMortalidad', 'registrarMortalidad', 'actualizarMortalidad']);
    svc.obtenerTodos.and.returnValue(of([lote(), lote({ id: 3, codigo: 'L-2025-09', estado: 'CERRADO' })]));
    svc.obtenerMortalidad.and.returnValue(of([]));
    const galpones = jasmine.createSpyObj<GalponService>('GalponService', ['ocupacion']);
    galpones.ocupacion.and.returnValue(of([
      { idGalpon: 1, nombre: 'Galpón 1', capacidadMaxima: 5000, estado: 'OCUPADO', lotesActivos: 2, avesAlojadas: 4500, capacidadLibre: 500 },
      { idGalpon: 2, nombre: 'Galpón 2', capacidadMaxima: 3000, estado: 'DISPONIBLE', lotesActivos: 0, avesAlojadas: 0, capacidadLibre: 3000 },
      { idGalpon: 3, nombre: 'Galpón 3', capacidadMaxima: 600, estado: 'OCUPADO', lotesActivos: 6, avesAlojadas: 600, capacidadLibre: 0 },
      { idGalpon: 4, nombre: 'Galpón 4', capacidadMaxima: 900, estado: 'MANTENIMIENTO', lotesActivos: 0, avesAlojadas: 0, capacidadLibre: 900 }
    ]));
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    auth.tieneAlguno.and.callFake((codigos: string[]) => !codigos.some(c => c.startsWith('alimentacion') || c.startsWith('sanidad')));
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    await TestBed.configureTestingModule({
      declarations: [Lotes],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: LoteService, useValue: svc },
        { provide: GalponService, useValue: galpones },
        { provide: AlimentacionService, useValue: jasmine.createSpyObj('AlimentacionService', ['consumos']) },
        { provide: SanidadService, useValue: jasmine.createSpyObj('SanidadService', ['aplicaciones']) },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: messages },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Lotes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra solo los lotes activos y ofrece galpones con espacio, aunque tengan otros lotes', () => {
    expect(component.visibles.map(l => l.codigo)).toEqual(['L-2026-01']);
    component.verInactivos = true;
    expect(component.visibles.length).toBe(2);
    expect(component.galponesDisponibles.map(g => g.nombre)).toEqual(['Galpón 1', 'Galpón 2']);
  });

  it('registra el lote con el código en mayúsculas', () => {
    const nuevo = lote({ id: 9, codigo: 'L-2026-02', idGalpon: 2, galpon: 'Galpón 2' });
    svc.crear.and.returnValue(of(nuevo));
    svc.obtenerTodos.and.returnValue(of([nuevo, lote()]));
    component.nuevo();
    component.form.patchValue({ codigo: 'l-2026-02', idGalpon: 2, cantidadInicial: 2500, costoPollito: 2700 });
    component.guardar();

    expect(svc.crear).toHaveBeenCalledWith(jasmine.objectContaining({ codigo: 'L-2026-02', idGalpon: 2, fechaEstimadaVenta: null }));
    expect(component.seleccionado?.id).toBe(9);
  });

  it('avisa cuando la mortalidad supera el 5 %', () => {
    svc.registrarMortalidad.and.returnValue(of({ idMortalidad: 1, porcentajeMortalidad: 5.75, alerta: true }));
    component.seleccionar(component.lotes[0]);
    component.formMortalidad.patchValue({ cantidad: 80 });
    component.registrarMortalidad();

    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'warn', summary: 'Alerta de mortalidad' }));
  });

  it('muestra el rechazo de PostgreSQL al registrar mortalidad', () => {
    const mensaje = 'La mortalidad (5000) supera las aves disponibles del lote L-2026-01 (3880).';
    svc.registrarMortalidad.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { estado: 409, mensaje, detalles: [], fecha: '' }
    })));
    component.seleccionar(component.lotes[0]);
    component.formMortalidad.patchValue({ cantidad: 5000 });
    component.registrarMortalidad();

    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: mensaje }));
  });
});
