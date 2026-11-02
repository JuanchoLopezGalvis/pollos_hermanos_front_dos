import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from './error-api';

describe('mensajeError', () => {
  it('usa el mensaje y los detalles del ErrorApiDTO', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { estado: 400, mensaje: 'Los datos enviados no son válidos.', detalles: ['correo: no tiene un formato válido'] }
    });
    expect(mensajeError(err)).toBe('Los datos enviados no son válidos. (correo: no tiene un formato válido)');
  });

  it('avisa cuando no hay conexión con el backend', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 0 }))).toContain('No hay conexión');
  });

  it('avisa cuando el proxy no alcanza el backend', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 500, error: null }))).toContain('backend esté encendido');
  });

  it('usa el mensaje por defecto en errores desconocidos', () => {
    expect(mensajeError(new Error('x'), 'Por defecto')).toBe('Por defecto');
  });
});
