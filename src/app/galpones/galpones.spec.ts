import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { Galpones } from './galpones';
import { GalponService } from '../services/galpon.service';
import { AuthService } from '../services/auth.service';

describe('Galpones', () => {
  let component: Galpones;
  let fixture: ComponentFixture<Galpones>;
  let svc: jasmine.SpyObj<GalponService>;
  let messages: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj<GalponService>('GalponService', ['obtenerTodos', 'ocupacion', 'crear', 'actualizar', 'eliminar']);
    svc.ocupacion.and.returnValue(of([
      { idGalpon: 1, nombre: 'Galpón 1', capacidadMaxima: 5000, estado: 'OCUPADO', lotesActivos: 2, avesAlojadas: 1800, capacidadLibre: 3200 }
    ]));
    svc.obtenerTodos.and.returnValue(of([
      { id: 2, nombre: 'Galpón 2', capacidadMaxima: 3000, estado: 'DISPONIBLE' },
      { id: 1, nombre: 'Galpón 1', capacidadMaxima: 5000, estado: 'OCUPADO' }
    ]));
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    await TestBed.configureTestingModule({
      declarations: [Galpones],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: GalponService, useValue: svc },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: messages },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Galpones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga los galpones ordenados y calcula el resumen', () => {
    expect(component.galpones[0].nombre).toBe('Galpón 1');
    expect(component.capacidadTotal).toBe(8000);
    expect(component.contar('OCUPADO')).toBe(1);
    expect(component.avesAlojadas).toBe(1800);
  });

  it('no deja cambiar el estado de un galpón ocupado', () => {
    component.editar(component.galpones[0]);
    expect(component.f['estado'].disabled).toBeTrue();

    svc.actualizar.and.returnValue(of({ id: 1, nombre: 'Galpón 1', capacidadMaxima: 6000, estado: 'OCUPADO' }));
    component.form.patchValue({ capacidadMaxima: 6000 });
    component.guardar();

    expect(svc.actualizar).toHaveBeenCalledWith(1, { nombre: 'Galpón 1', capacidadMaxima: 6000 });
  });

  it('muestra el mensaje de PostgreSQL cuando rechaza el cambio', () => {
    const mensaje = 'La capacidad del galpón "Galpón 1" (700) no puede ser menor que las aves de su lote activo (800).';
    svc.actualizar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { estado: 409, mensaje, detalles: [], fecha: '' }
    })));
    component.editar(component.galpones[0]);
    component.form.patchValue({ capacidadMaxima: 700 });
    component.guardar();

    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: mensaje }));
  });
});
