import { Directive, ElementRef, HostListener, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

/** Teclas de edición y movimiento que siempre se permiten. */
const TECLAS_EDICION = ['Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

/**
 * Se aplica sola a todos los campos numéricos. Solo deja escribir dígitos y,
 * si el campo admite decimales (su `step` tiene punto, por ejemplo 0.1), un
 * punto decimal. Así no se cuelan letras, signos ni puntos de miles: en un
 * campo de pesos "2.500" se convertiría en 2,5. Si el navegador aun así recibe
 * algo que no es un número, el campo muestra el error en vez de "obligatorio".
 * También evita que la rueda del mouse cambie el valor sin querer.
 */
@Directive({
  selector: 'input[type=number]',
  standalone: false
})
export class CampoNumero {

  constructor(private campo: ElementRef<HTMLInputElement>, @Optional() private control: NgControl | null) {}

  private get admiteDecimales(): boolean {
    return (this.campo.nativeElement.getAttribute('step') ?? '').includes('.');
  }

  @HostListener('keydown', ['$event'])
  filtrarTeclas(evento: KeyboardEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.altKey || TECLAS_EDICION.includes(evento.key)) return;
    if (/^\d$/.test(evento.key)) return;
    if (evento.key === '.' && this.admiteDecimales) return;
    evento.preventDefault();
  }

  @HostListener('paste', ['$event'])
  pegarSoloNumeros(evento: ClipboardEvent): void {
    const texto = (evento.clipboardData?.getData('text') ?? '').trim();
    const valido = this.admiteDecimales ? /^\d+(\.\d+)?$/ : /^\d+$/;
    if (!valido.test(texto)) {
      evento.preventDefault();
    }
  }

  /** Lo que el navegador no pudo leer como número se marca como tal, no como campo vacío. */
  @HostListener('input')
  revisarEntrada(): void {
    const control = this.control?.control;
    if (control && this.campo.nativeElement.validity.badInput) {
      control.markAsDirty();
      control.setErrors({ numero: true });
    }
  }

  @HostListener('wheel')
  ignorarRueda(): void {
    const campo = this.campo.nativeElement;
    if (document.activeElement === campo) {
      campo.blur();
    }
  }
}
