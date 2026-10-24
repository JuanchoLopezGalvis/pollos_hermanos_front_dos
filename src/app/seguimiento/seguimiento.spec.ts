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
