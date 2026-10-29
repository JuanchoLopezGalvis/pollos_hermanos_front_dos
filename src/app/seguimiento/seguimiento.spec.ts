import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { Seguimiento } from './seguimiento';
import { SeguimientoService } from '../services/seguimiento.service';
import { AuthService } from '../services/auth.service';
import { LoteService } from '../services/lote.service';

describe('Seguimiento', () => {
  let component: Seguimiento;
  let fixture: ComponentFixture<Seguimiento>;
  let svc: jasmine.SpyObj<SeguimientoService>;
  let messages: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj<SeguimientoService>('SeguimientoService',
      ['obtenerTodos', 'obtenerPorLote', 'curvaSemanal', 'crear', 'actualizar', 'eliminar']);
    svc.obtenerTodos.and.returnValue(of([
      { id: 'a', codigoLote: 'L1', fecha: '2026-10-01' },
      { id: 'b', codigoLote: 'L1', fecha: '2026-10-05' }
    ]));
    svc.obtenerPorLote.and.returnValue(of([]));
    svc.curvaSemanal.and.returnValue(of([{ semana: 1, pesoPromedioGramos: 160, registros: 7 }]));

    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    await TestBed.configureTestingModule({
      declarations: [Seguimiento],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: SeguimientoService, useValue: svc },
        { provide: AuthService, useValue: auth },
        { provide: LoteService, useValue: { obtenerTodos: () => of([]) } },
        { provide: MessageService, useValue: messages },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Seguimiento);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ordena los seguimientos del más reciente al más antiguo', () => {
    expect(component.seguimientos.map(s => s.id)).toEqual(['b', 'a']);
  });

  it('al filtrar por lote carga también la curva semanal', () => {
    component.loteFiltro = 'L1';
    component.cargar();
    expect(svc.obtenerPorLote).toHaveBeenCalledWith('L1');
    expect(svc.curvaSemanal).toHaveBeenCalledWith('L1');
    expect(component.curva.length).toBe(1);
  });

  it('calcula el peso, la ganancia diaria y la uniformidad del lote elegido', () => {
    svc.obtenerPorLote.and.returnValue(of([
      { id: 'a', codigoLote: 'L1', fecha: '2026-10-01', edadDias: 1, pesoPromedioGramos: 40 },
      { id: 'b', codigoLote: 'L1', fecha: '2026-10-08', edadDias: 8, pesoPromedioGramos: 180,
        muestreo: { avesPesadas: 50, uniformidadPorcentaje: 82 }, novedades: [{ tipo: 'Cama húmeda' }] },
      { id: 'c', codigoLote: 'L1', fecha: '2026-10-08', edadDias: 8, pesoPromedioGramos: 200 }
    ]));
    component.elegirLote('L1');

    expect(component.pesoPorDia).toEqual([
      jasmine.objectContaining({ x: 1, y: 40 }), jasmine.objectContaining({ x: 8, y: 190 })
    ]);
    expect(component.indicadoresLote).toEqual({ pesoActual: 190, edadDias: 8, gananciaDiaria: 21.4, uniformidad: 82, novedades: 1 });
    expect(component.semanas[0].etiqueta).toBe('Sem. 1');
  });

  it('sin lote muestra el último peso de cada lote y las novedades por tipo', () => {
    svc.obtenerTodos.and.returnValue(of([
      { id: 'a', codigoLote: 'L1', fecha: '2026-10-01', edadDias: 1, pesoPromedioGramos: 40, novedades: [{ tipo: 'Cama húmeda' }] },
      { id: 'b', codigoLote: 'L1', fecha: '2026-10-08', edadDias: 8, pesoPromedioGramos: 180, novedades: [{ tipo: 'Cama húmeda' }] },
      { id: 'c', codigoLote: 'L2', fecha: '2026-10-08', edadDias: 3, pesoPromedioGramos: 90, novedades: [{ tipo: 'Bebedero' }] }
    ]));
    component.limpiarFiltro();

    expect(component.indicadoresGenerales).toEqual({ registros: 3, lotes: 2, muestreos: 0, novedades: 3 });
    expect(component.pesoPorLote.map(b => [b.etiqueta, b.valor])).toEqual([['L1', 180], ['L2', 90]]);
    expect(component.novedadesTipo.map(b => [b.etiqueta, b.valor])).toEqual([['Cama húmeda', 2], ['Bebedero', 1]]);
    expect(component.codigosLote).toEqual(['L1', 'L2']);
  });

  it('exige los dos campos del muestreo', () => {
    component.nuevo();
    component.form.patchValue({ codigoLote: 'L1', muestreo: { avesPesadas: 20 } });
    expect(component.form.get('muestreo')?.hasError('muestreoIncompleto')).toBeTrue();
  });

  it('envía solo los campos llenos al registrar', () => {
    svc.crear.and.returnValue(of({ id: 'c', codigoLote: 'L1', edadDias: 10 }));
    component.nuevo();
    component.form.patchValue({ codigoLote: ' L1 ', fecha: '2026-10-10', pesoPromedioGramos: 300 });
    component.guardar();

    const dto = svc.crear.calls.mostRecent().args[0];
    expect(dto.codigoLote).toBe('L1');
    expect(dto.pesoPromedioGramos).toBe(300);
    expect(dto.temperaturaCelsius).toBeUndefined();
    expect(dto.muestreo).toBeUndefined();
  });

  it('muestra el error del backend cuando el lote no está activo', () => {
    svc.crear.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { estado: 409, mensaje: 'El lote L9 no está activo.', detalles: [] }
    })));
    component.nuevo();
    component.form.patchValue({ codigoLote: 'L9' });
    component.guardar();

    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ detail: 'El lote L9 no está activo.' }));
  });
});
