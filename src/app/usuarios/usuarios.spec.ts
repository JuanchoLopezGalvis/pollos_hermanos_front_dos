import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { Usuarios } from './usuarios';
import { UsuarioService } from '../services/usuario.service';
import { RolService } from '../services/rol.service';
import { PermisoService } from '../services/permiso.service';
import { AuthService } from '../services/auth.service';

describe('Usuarios', () => {
  let component: Usuarios;
  let fixture: ComponentFixture<Usuarios>;
  let usuarioSvc: jasmine.SpyObj<UsuarioService>;
  let rolSvc: jasmine.SpyObj<RolService>;

  async function crear(esSuperusuario: boolean) {
    usuarioSvc = jasmine.createSpyObj<UsuarioService>('UsuarioService', ['obtenerTodos', 'crear', 'actualizar', 'desactivar']);
    usuarioSvc.obtenerTodos.and.returnValue(of([
      { id: 1, nombreUsuario: 'dylan', correo: 'dylan@finca.co', activo: true, roles: ['Gerente'] },
      { id: 2, nombreUsuario: 'gaby', correo: 'gaby@finca.co', activo: true, roles: [] }
    ]));
    rolSvc = jasmine.createSpyObj<RolService>('RolService', ['obtenerTodos']);
    rolSvc.obtenerTodos.and.returnValue(of([{ id: 1, nombre: 'Gerente' }]));
    const permisoSvc = jasmine.createSpyObj<PermisoService>('PermisoService', ['obtenerTodos']);
    permisoSvc.obtenerTodos.and.returnValue(of([{ id: 1, codigo: 'seguimiento.ver' }]));
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno'], { esSuperusuario });

    await TestBed.configureTestingModule({
      declarations: [Usuarios],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: UsuarioService, useValue: usuarioSvc },
        { provide: RolService, useValue: rolSvc },
        { provide: PermisoService, useValue: permisoSvc },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Usuarios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', async () => {
    await crear(false);
    expect(component).toBeTruthy();
    expect(component.usuarios.length).toBe(2);
    expect(component.rolesDisponibles).toEqual(['Gerente']);
  });

  it('filtra por nombre de usuario o correo', async () => {
    await crear(false);
    component.busqueda = 'gaby';
    expect(component.filtrados.map(u => u.id)).toEqual([2]);
  });

  it('no envía la marca de superusuario si quien edita no lo es', async () => {
    await crear(false);
    usuarioSvc.crear.and.returnValue(of({ id: 3, nombreUsuario: 'nuevo' }));
    component.nuevo();
    component.form.patchValue({ nombreUsuario: 'nuevo', correo: 'Nuevo@Finca.co', contrasena: 'clave1234' });
    component.alternar(component.rolesSeleccionados, 'Gerente');
    component.guardar();

    const dto = usuarioSvc.crear.calls.mostRecent().args[0];
    expect(dto.correo).toBe('nuevo@finca.co');
    expect(dto.roles).toEqual(['Gerente']);
    expect(dto.superusuario).toBeUndefined();
  });

  it('en la edición no envía la contraseña si queda vacía', async () => {
    await crear(true);
    usuarioSvc.actualizar.and.returnValue(of({ id: 1, nombreUsuario: 'dylan' }));
    component.editar(component.usuarios[0]);
    component.guardar();

    const [id, dto] = usuarioSvc.actualizar.calls.mostRecent().args;
    expect(id).toBe(1);
    expect(dto.contrasena).toBeUndefined();
    expect(dto.superusuario).toBeFalse();
  });

  it('marca los roles como no visibles si el backend responde 403', async () => {
    await crear(false);
    rolSvc.obtenerTodos.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.ngOnInit();
    expect(component.rolesNoVisibles).toBeTrue();
  });
});
