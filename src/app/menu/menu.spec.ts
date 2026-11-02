import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';

import { Menu } from './menu';
import { AuthService } from '../services/auth.service';
import { Sidebar } from '../sidebar/sidebar';

describe('Menu', () => {
  let component: Menu;
  let fixture: ComponentFixture<Menu>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno', 'logout'],
      { nombreVisible: 'Tester' });
    auth.tieneAlguno.and.callFake((codigos: string[]) => codigos.includes('seguimiento.ver'));
    auth.tienePermiso.and.returnValue(false);

    await TestBed.configureTestingModule({
      declarations: [Menu, Sidebar],
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    }).compileComponents();

    fixture = TestBed.createComponent(Menu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('habilita solo los módulos permitidos', () => {
    const seguimiento = component.modulos.find(m => m.ruta === '/seguimiento')!;
    const usuarios = component.modulos.find(m => m.ruta === '/usuarios')!;

    expect(component.disponible(seguimiento)).toBeTrue();
    expect(component.estado(usuarios)).toBe('Sin permiso');
    expect(component.modulos.every(m => !!m.ruta)).toBeTrue();
  });

  it('cierra la sesión y vuelve al login', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    component.logout();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
