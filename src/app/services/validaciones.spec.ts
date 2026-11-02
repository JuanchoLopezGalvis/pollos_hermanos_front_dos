import { FormControl } from '@angular/forms';
import { LIMITES, PATRON_DOCUMENTO, PATRON_TELEFONO, decimal, dinero, entero, hasta, maxDecimales, mensajeValidacion } from './validaciones';

describe('validaciones', () => {
  const errores = (validadores: any, valor: unknown) => new FormControl(valor, validadores).errors;

  it('un entero rechaza decimales, ceros y valores sobre el máximo', () => {
    const v = entero(1, LIMITES.aves);
    expect(errores(v, 50)).toBeNull();
    expect(errores(v, 1.5)?.['entero']).toBeTrue();
    expect(errores(v, 0)?.['min']).toBeTruthy();
    expect(errores(v, 100001)?.['max']).toBeTruthy();
    expect(errores(v, null)?.['requerido'].mensaje).toBe('Escribe un número entero entre 1 y 100.000.');
  });

  it('un decimal admite como máximo los decimales indicados', () => {
    expect(errores(decimal(0.01, 100), 12.25)).toBeNull();
    expect(errores(decimal(0.01, 100), 12.255)?.['decimales']).toEqual({ max: 2 });
    expect(errores(maxDecimales(2), 1e21)?.['numero']).toBeTrue();
  });

  it('el dinero no supera NUMERIC(14,2)', () => {
    expect(errores(dinero(), 999999999999)).toBeNull();
    expect(errores(dinero(), 1000000000000)?.['max']).toBeTruthy();
    expect(errores(dinero(), 2.5)?.['entero']).toBeTrue();
  });

  it('un tope dinámico usa el dato actual y explica el motivo', () => {
    let cupo: number | null = 10;
    const v = hasta(() => cupo, max => `Solo hay ${max}.`);
    expect(errores(v, 11)?.['limite'].mensaje).toBe('Solo hay 10.');
    cupo = null;
    expect(errores(v, 11)).toBeNull();
  });

  it('documento y teléfono solo admiten dígitos', () => {
    expect(PATRON_DOCUMENTO.test('1020304050')).toBeTrue();
    expect(PATRON_DOCUMENTO.test('900123456-7')).toBeTrue();
    expect(PATRON_DOCUMENTO.test('1.020.304')).toBeFalse();
    expect(PATRON_TELEFONO.test('+573001234567')).toBeTrue();
    expect(PATRON_TELEFONO.test('300 123 4567')).toBeFalse();
  });

  it('explica cada error en español', () => {
    expect(mensajeValidacion({ entero: true })).toBe('Debe ser un número entero, sin decimales ni puntos de miles.');
    expect(mensajeValidacion({ numero: true, required: true })).toBe('Solo se admiten números: sin letras, espacios ni puntos de miles.');
    expect(mensajeValidacion({ min: { min: 0.01 } })).toBe('Debe ser mayor que cero.');
    expect(mensajeValidacion({ min: { min: 0 } })).toBe('No puede ser negativo.');
    expect(mensajeValidacion({ max: { max: 100000 } })).toBe('El máximo es 100.000.');
  });
});
