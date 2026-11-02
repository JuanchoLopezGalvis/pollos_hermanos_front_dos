import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { Roles } from './roles';
import { RolService } from '../services/rol.service';
import { PermisoService } from '../services/permiso.service';
import { AuthService } from '../services/auth.service';

describe('Roles', () => {
  let component: Roles;
  let fixture: ComponentFixture<Roles>;
  let rolSvc: jasmine.SpyObj<RolService>;
  let messages: jasmine.SpyObj<MessageService>;
  let confirm: jasmine.SpyObj<ConfirmationService>;

  beforeEach(async () => {
    rolSvc = jasmine.createSpyObj<RolService>('RolService', ['obtenerTodos', 'crear', 'actualizar', 'eliminar']);
    rolSvc.obtenerTodos.and.returnValue(of([{ id: 1, nombre: 'Galponero', permisos: ['seguimiento.registrar'] }]));
    const permisoSvc = jasmine.createSpyObj<PermisoService>('PermisoService', ['obtenerTodos']);
    permisoSvc.obtenerTodos.and.returnValue(of([{ id: 1, codigo: 'seguimiento.registrar' }, { id: 2, codigo: 'seguimiento.ver' }]));
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    confirm = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);
    confirm.confirm.and.callFake((c: Confirmation) => { c.accept?.(); return confirm; });

    await TestBed.configureTestingModule({
      declarations: [Roles],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: RolService, useValue: rolSvc },
        { provide: PermisoService, useValue: permisoSvc },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['tienePermiso', 'tieneAlguno']) },
        { provide: MessageService, useValue: messages },
        { provide: ConfirmationService, useValue: confirm }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Roles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.roles.length).toBe(1);
    expect(component.permisosDisponibles.length).toBe(2);
  });

  it('al editar marca los permisos actuales del rol', () => {
    component.editar(component.roles[0]);
    expect(component.permisosSeleccionados.has('seguimiento.registrar')).toBeTrue();
    component.alternar('seguimiento.ver');
    rolSvc.actualizar.and.returnValue(of({ id: 1, nombre: 'Galponero' }));
    component.guardar();
    expect(rolSvc.actualizar).toHaveBeenCalledWith(1, jasmine.objectContaining({
      permisos: ['seguimiento.registrar', 'seguimiento.ver']
    }));
  });

  it('muestra el 409 cuando el rol está asignado a usuarios', () => {
    rolSvc.eliminar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { estado: 409, mensaje: 'El rol está asignado a usuarios.', detalles: [] }
    })));
    component.eliminar(component.roles[0]);
    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ detail: 'El rol está asignado a usuarios.' }));
  });
});
