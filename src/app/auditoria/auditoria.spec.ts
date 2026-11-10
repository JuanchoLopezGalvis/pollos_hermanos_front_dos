import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { Auditoria } from './auditoria';
import { AuditoriaDTO, AuditoriaService } from '../services/auditoria.service';

describe('Auditoria', () => {
  const modificacion: AuditoriaDTO = {
    idAuditoria: 9, tabla: 'galpon', operacion: 'UPDATE', idRegistro: '32', columnasCambiadas: ['capacidad_maxima'],
    datosAntes: { nombre: 'G1', capacidad_maxima: 1000 }, datosDespues: { nombre: 'G1', capacidad_maxima: 1200 },
    usuarioApp: 'gerente', usuarioBd: 'pollos_app', idTransaccion: 930, fecha: '2026-11-01T10:30:00'
  };
  const creacion: AuditoriaDTO = {
    ...modificacion, idAuditoria: 8, operacion: 'INSERT', columnasCambiadas: null,
    datosAntes: null, datosDespues: { nombre: 'G1', capacidad_maxima: 1000 }, usuarioApp: null
  };

  let buscar: jasmine.Spy;

  async function crear(): Promise<Auditoria> {
    buscar = jasmine.createSpy('buscar').and.returnValue(of({ registros: [modificacion, creacion], total: 120, pagina: 0, tamano: 50 }));
    await TestBed.configureTestingModule({
      declarations: [Auditoria],
      imports: [FormsModule, RouterTestingModule],
      providers: [{ provide: AuditoriaService, useValue: { buscar, tablas: () => of(['galpon', 'lote']) } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Auditoria);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('carga la primera página y calcula las páginas', async () => {
    const c = await crear();
    expect(c.registros.length).toBe(2);
    expect(c.totalPaginas).toBe(3);
    expect(c.tablas).toEqual(['galpon', 'lote']);
    expect(c.nombreTabla('galpon')).toBe('Galpones');
    expect(c.nombreTabla('tabla_nueva')).toBe('tabla_nueva');
  });

  it('muestra primero las columnas que cambiaron', async () => {
    const c = await crear();
    const campos = c.campos(modificacion);
    expect(campos[0]).toEqual({ columna: 'capacidad_maxima', antes: '1000', despues: '1200', cambio: true });
    expect(campos[1].cambio).toBeFalse();
    expect(c.resumen(modificacion)).toBe('capacidad_maxima');
  });

  it('en una creación no hay valores anteriores', async () => {
    const c = await crear();
    expect(c.campos(creacion).every(f => f.antes === '—')).toBeTrue();
    expect(c.resumen(creacion)).toBe('Registro nuevo');
  });

  it('el cambio de contraseña aparece sin mostrar el valor', async () => {
    const c = await crear();
    const campos = c.campos({ ...modificacion, tabla: 'usuario', columnasCambiadas: ['contrasena'],
      datosAntes: { nombre_usuario: 'ana' }, datosDespues: { nombre_usuario: 'ana' } });
    expect(campos[0]).toEqual({ columna: 'contrasena', antes: '(oculta)', despues: '(oculta)', cambio: true });
  });

  it('el historial filtra por la tabla y el registro', async () => {
    const c = await crear();
    c.historial(modificacion);
    expect(buscar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ tabla: 'galpon', registro: '32' }));
    expect(buscar.calls.mostRecent().args[1]).toBe(0);
  });

  it('pagina sin salirse de los límites', async () => {
    const c = await crear();
    c.irA(1);
    expect(buscar.calls.mostRecent().args[1]).toBe(1);
    const llamadas = buscar.calls.count();
    c.irA(-1);
    c.irA(3);
    expect(buscar.calls.count()).toBe(llamadas);
  });
});
