import { Component, Input } from '@angular/core';

/** Barra de la gráfica. */
export interface BarraGrafico {
  etiqueta: string;
  valor: number;
  /** Texto extra del tooltip. */
  detalle?: string;
}

/**
 * Gráfica de barras de una sola serie. Horizontal para comparar categorías
 * (lotes, tipos de novedad) y en columnas para semanas. El valor va en la
 * punta de cada barra y el detalle aparece al pasar el puntero o enfocarla.
 */
@Component({
  selector: 'app-grafico-barras',
  standalone: false,
  templateUrl: './grafico-barras.html',
  styleUrls: ['./graficos.css']
})
export class GraficoBarras {

  @Input() datos: BarraGrafico[] = [];
  @Input() unidad = '';
  @Input() columnas = false;

  activa: number | null = null;

  get maximo(): number {
    return Math.max(1, ...this.datos.map(d => d.valor));
  }

  porcentaje(d: BarraGrafico): number {
    return Math.max(1, (d.valor / this.maximo) * 100);
  }

  formato(v: number): string {
    return v.toLocaleString('es-CO', { maximumFractionDigits: v % 1 === 0 ? 0 : 1 });
  }
}
