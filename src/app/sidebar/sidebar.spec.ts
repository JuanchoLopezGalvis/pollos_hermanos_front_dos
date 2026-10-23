import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { Sidebar } from './sidebar';
import { AuthService } from '../services/auth.service';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno', 'logout'], {
      nombreVisible: 'Juan Diego López',
      esSuperusuario: true,
      user: { nombreUsuario: 'juandi', nombreCompleto: 'Juan Diego López', superusuario: true, permisos: [] }
    });
    auth.tienePermiso.and.returnValue(true);
    auth.tieneAlguno.and.returnValue(true);

    await TestBed.configureTestingModule({
      declarations: [Sidebar],
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calcula las iniciales del usuario', () => {
    expect(component.iniciales).toBe('JD');
    expect(component.cargo).toBe('Superusuario');
  });
});
