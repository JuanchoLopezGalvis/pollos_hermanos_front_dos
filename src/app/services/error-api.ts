import { HttpErrorResponse } from '@angular/common/http';

/** Forma de los errores del backend (ErrorApiDTO). */
export interface ErrorApi {
  estado: number;
  mensaje: string;
  detalles: string[];
  fecha: string;
}

/**
 * Convierte un error HTTP en un mensaje en español para el usuario.
 * Usa el mensaje del backend (que ya traduce los RAISE EXCEPTION de PostgreSQL)
 * y agrega los detalles de validación cuando los hay.
 */
export function mensajeError(err: unknown, porDefecto = 'No se pudo completar la operación.'): string {
  if (!(err instanceof HttpErrorResponse)) return porDefecto;
  if (err.status === 0) return 'No hay conexión con el servidor. Verifica que el backend esté encendido.';

  const cuerpo = err.error as Partial<ErrorApi> | string | null;
  if (typeof cuerpo === 'string' && cuerpo.trim()) return cuerpo;
  if (cuerpo && typeof cuerpo === 'object' && cuerpo.mensaje) {
    const detalles = Array.isArray(cuerpo.detalles) && cuerpo.detalles.length
      ? ` (${cuerpo.detalles.join('; ')})`
      : '';
    return cuerpo.mensaje + detalles;
  }
  if (err.status >= 502 || (err.status === 500 && !cuerpo)) {
    return 'El servidor no respondió. Verifica que el backend esté encendido.';
  }
  if (err.status === 403) return 'No tiene permisos para realizar esta operación.';
  if (err.status === 404) return 'El recurso no existe.';
  return porDefecto;
}
