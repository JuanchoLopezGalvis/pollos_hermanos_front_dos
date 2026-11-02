import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { mensajeValidacion } from './validaciones';

/**
 * Mensaje de error de un campo, con el motivo exacto (obligatorio, mínimo,
 * máximo, entero, decimales, formato). Aparece cuando el usuario ya tocó el
 * campo o lo está escribiendo. `formato` reemplaza el mensaje genérico de un
 * patrón, por ejemplo "De 7 a 15 dígitos".
 */
@Component({
  selector: 'app-error-campo',
  standalone: false,
  template: `<small class="err" *ngIf="control && control.invalid && (control.touched || control.dirty)">{{ mensaje }}</small>`
})
export class ErrorCampo {
  @Input() control: AbstractControl | null | undefined = null;
  @Input() formato = '';

  get mensaje(): string {
    const errores = this.control?.errors;
    if (this.formato && errores?.['pattern'] && !errores['required']) return this.formato;
    return mensajeValidacion(errores);
  }
}
