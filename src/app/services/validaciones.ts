import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/**
 * Límites de los campos numéricos. Salen de las columnas de PostgreSQL
 * (NUMERIC(p,s) admite p - s enteros) y, en conteos de aves y pesos, de lo que
 * es posible en la finca. El backend valida los mismos límites.
 */
export const LIMITES = {
  /** Aves de un lote, pedido, mortalidad, beneficio o muestreo. */
  aves: 100_000,
  /** Valores en pesos: NUMERIC(14,2). */
  dinero: 999_999_999_999.99,
  /** Cantidades NUMERIC(10,2): libras vendidas, insumos sanitarios y dosis. */
  cantidad10: 99_999_999.99,
  /** Bultos consumidos: NUMERIC(8,2). */
  cantidad8: 999_999.99,
  /** Peso de un bulto de alimento en kg. */
  pesoBultoKg: 100,
  /** Peso promedio de un pollo en gramos. */
  pesoAveGramos: 10_000,
  /** Peso promedio de un pollo en libras. */
  pesoAveLibras: 20
};

/**
 * Documento o NIT: de 5 a 15 dígitos, con dígito de verificación opcional
 * (900123456-7). Se toleran espacios al inicio y al final porque los
 * formularios recortan el valor antes de enviarlo.
 */
export const PATRON_DOCUMENTO = /^\s*\d{5,15}(-\d)?\s*$/;

/** Teléfono: de 7 a 15 dígitos, con + inicial opcional para el indicativo. */
export const PATRON_TELEFONO = /^\s*\+?\d{7,15}\s*$/;

/** Rechaza valores con más decimales de los permitidos (0 = solo enteros). */
export function maxDecimales(decimales: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v === null || v === undefined || v === '') return null;
    const texto = String(v);
    if (!/^-?\d+(\.\d+)?$/.test(texto)) return { numero: true };
    const parteDecimal = texto.split('.')[1] ?? '';
    if (!parteDecimal.length) return null;
    return decimales === 0 ? { entero: true } : parteDecimal.length > decimales ? { decimales: { max: decimales } } : null;
  };
}

/**
 * Obligatorio para un campo numérico: en vez de "obligatorio" a secas, dice
 * qué número se espera.
 */
export function numeroObligatorio(mensaje: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    Validators.required(control) ? { requerido: { mensaje } } : null;
}

/** Validadores de un número entero entre min y max. */
export function entero(min: number, max: number, obligatorio = true): ValidatorFn[] {
  const pedido = `Escribe un número entero entre ${numeroLegible(min)} y ${numeroLegible(max)}.`;
  return [...(obligatorio ? [numeroObligatorio(pedido)] : []), Validators.min(min), Validators.max(max), maxDecimales(0)];
}

/** Validadores de un número decimal entre min y max con hasta `decimales` cifras decimales. */
export function decimal(min: number, max: number, decimales = 2, obligatorio = true): ValidatorFn[] {
  const pedido = `Escribe un número entre ${numeroLegible(min)} y ${numeroLegible(max)}; usa punto para los decimales (máximo ${decimales}).`;
  return [...(obligatorio ? [numeroObligatorio(pedido)] : []), Validators.min(min), Validators.max(max), maxDecimales(decimales)];
}

/**
 * Valor en pesos: entero (sin centavos), desde `min` y dentro de NUMERIC(14,2).
 * Al ser entero, "2.500" no se puede confundir con 2,5.
 */
export function dinero(min = 1, obligatorio = true): ValidatorFn[] {
  const pedido = 'Escribe el valor en pesos, solo números y sin puntos de miles (por ejemplo 2500).';
  return [...(obligatorio ? [numeroObligatorio(pedido)] : []), Validators.min(min), Validators.max(Math.floor(LIMITES.dinero)),
    maxDecimales(0)];
}

/**
 * Tope que depende de otros datos, por ejemplo el cupo libre del galpón
 * elegido o las aves disponibles de un lote. Si `limite` devuelve null, no se
 * valida. El control se debe revalidar cuando cambia el dato del que depende.
 */
export function hasta(limite: (control: AbstractControl) => number | null | undefined,
                      mensaje: (max: number) => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const max = limite(control);
    const v = control.value;
    if (max === null || max === undefined || v === null || v === undefined || v === '') return null;
    return Number(v) > max ? { limite: { max, mensaje: mensaje(max) } } : null;
  };
}

function numeroLegible(n: number): string {
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

/** Explica en español el primer error de un campo. */
export function mensajeValidacion(errores: ValidationErrors | null | undefined): string {
  if (!errores) return '';
  if (errores['numero']) return 'Solo se admiten números: sin letras, espacios ni puntos de miles.';
  if (errores['requerido']) return errores['requerido'].mensaje;
  if (errores['required']) return 'Este campo es obligatorio.';
  if (errores['entero']) return 'Debe ser un número entero, sin decimales ni puntos de miles.';
  if (errores['decimales']) return `Admite máximo ${errores['decimales'].max} decimales.`;
  if (errores['min']) {
    const min = errores['min'].min;
    return min === 0 ? 'No puede ser negativo.' : min > 0 && min < 1 ? 'Debe ser mayor que cero.' : `El mínimo es ${numeroLegible(min)}.`;
  }
  if (errores['limite']) return errores['limite'].mensaje;
  if (errores['max']) return `El máximo es ${numeroLegible(errores['max'].max)}.`;
  if (errores['pattern']) return 'El formato no es válido.';
  if (errores['maxlength']) return `Admite máximo ${errores['maxlength'].requiredLength} caracteres.`;
  if (errores['minlength']) return `Debe tener al menos ${errores['minlength'].requiredLength} caracteres.`;
  if (errores['email']) return 'No es un correo válido.';
  return 'El valor no es válido.';
}
