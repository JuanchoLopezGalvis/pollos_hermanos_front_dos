import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Permisos } from './permisos';
import { PermisoService } from '../services/permiso.service';
import { AuthService } from '../services/auth.service';

describe('Permisos', () => {
  let component: Permisos;
  let fixture: ComponentFixture<Permisos>;
  let permisoSvc: jasmine.SpyObj<PermisoService>;

  beforeEach(async () => {
    permisoSvc = jasmine.createSpyObj<PermisoService>('PermisoService', ['obtenerTodos', 'crear', 'actualizar', 'eliminar']);
    permisoSvc.obtenerTodos.and.returnValue(of([{ id: 2, codigo: 'usuario.gestionar' }, { id: 1, codigo: 'rol.gestionar' }]));

    await TestBed.configureTestingModule({
      declarations: [Permisos],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: PermisoService, useValue: permisoSvc },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['tienePermiso', 'tieneAlguno'], { esSuperusuario: true }) },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Permisos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ordena los permisos por código', () => {
    expect(component.permisos.map(p => p.codigo)).toEqual(['rol.gestionar', 'usuario.gestionar']);
  });

  it('valida la forma modulo.accion', () => {
    component.nuevo();
    component.form.patchValue({ codigo: 'Lote-Crear' });
    expect(component.f['codigo'].hasError('pattern')).toBeTrue();
    component.form.patchValue({ codigo: 'lote.crear' });
    expect(component.f['codigo'].valid).toBeTrue();
  });
});
