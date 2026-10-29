import { AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy } from '@angular/core';

/** Punto de una serie: x es el día de vida del lote. */
export interface PuntoGrafico {
  x: number;
  y: number;
  /** Texto extra del tooltip, por ejemplo la fecha. */
  detalle?: string;
}

/** Paso "redondo" (1, 2 o 5 por potencia de 10) para que los ejes tengan números limpios. */
export function pasoRedondo(bruto: number): number {
  if (bruto <= 0) return 1;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / potencia;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * potencia;
}

/**
 * Gráfica de línea de una sola serie en SVG, con línea vertical que sigue al
 * puntero (o a las flechas del teclado) y tooltip con el valor.
 */
@Component({
  selector: 'app-grafico-linea',
  standalone: false,
  templateUrl: './grafico-linea.html',
  styleUrls: ['./graficos.css']
})
export class GraficoLinea implements OnChanges, AfterViewInit, OnDestroy {

  @Input() puntos: PuntoGrafico[] = [];
  /** Unidad del eje y, por ejemplo "g" o "%". */
  @Input() unidad = '';
  /** Nombre de lo que se grafica, para lectores de pantalla. */
  @Input() descripcion = '';
  /** Tope fijo del eje y (por ejemplo 100 para porcentajes). */
  @Input() yMaximo: number | null = null;

  readonly alto = 240;
  readonly margen = { izq: 52, der: 56, arr: 16, aba: 32 };
  ancho = 600;
  activo: number | null = null;

  ordenados: PuntoGrafico[] = [];
  ticksY: number[] = [];
  ticksX: number[] = [];
  private xMin = 0;
  private xMax = 1;
  private yMax = 1;
  private observador?: ResizeObserver;

  constructor(private host: ElementRef<HTMLElement>, private zona: NgZone) {}

  ngOnChanges(): void {
    this.calcular();
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.observador = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w > 0 && w !== this.ancho) {
        this.zona.run(() => this.ancho = w);
      }
    });
    this.observador.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }

  private calcular(): void {
    this.ordenados = [...(this.puntos ?? [])].sort((a, b) => a.x - b.x);
    this.activo = null;
    if (!this.ordenados.length) return;

    this.xMin = this.ordenados[0].x;
    this.xMax = this.ordenados[this.ordenados.length - 1].x;
    if (this.xMax === this.xMin) {
      this.xMin -= 1;
      this.xMax += 1;
    }
    const pasoX = Math.max(1, Math.round(pasoRedondo((this.xMax - this.xMin) / 6)));
    this.ticksX = [];
    for (let t = Math.ceil(this.xMin / pasoX) * pasoX; t <= this.xMax; t += pasoX) {
      if (t >= 1) this.ticksX.push(t);
    }

    const mayor = Math.max(...this.ordenados.map(p => p.y));
    const pasoY = pasoRedondo((this.yMaximo ?? mayor) / 4);
    this.yMax = this.yMaximo ?? Math.max(pasoY, Math.ceil(mayor / pasoY) * pasoY);
    this.ticksY = [];
    for (let t = 0; t <= this.yMax + 1e-9; t += pasoY) this.ticksY.push(t);
  }

  get anchoPlot(): number {
    return Math.max(10, this.ancho - this.margen.izq - this.margen.der);
  }

  get altoPlot(): number {
    return this.alto - this.margen.arr - this.margen.aba;
  }

  px(x: number): number {
    return this.margen.izq + ((x - this.xMin) / (this.xMax - this.xMin)) * this.anchoPlot;
  }

  py(y: number): number {
    return this.margen.arr + this.altoPlot - (y / this.yMax) * this.altoPlot;
  }

  get linea(): string {
    return this.ordenados.map((p, i) => `${i ? 'L' : 'M'}${this.px(p.x)},${this.py(p.y)}`).join(' ');
  }

  get area(): string {
    if (this.ordenados.length < 2) return '';
    const base = this.py(0);
    const primero = this.ordenados[0];
    const ultimo = this.ordenados[this.ordenados.length - 1];
    return `${this.linea} L${this.px(ultimo.x)},${base} L${this.px(primero.x)},${base} Z`;
  }

  get ultimo(): PuntoGrafico | null {
    return this.ordenados.length ? this.ordenados[this.ordenados.length - 1] : null;
  }

  get puntoActivo(): PuntoGrafico | null {
    return this.activo === null ? null : this.ordenados[this.activo];
  }

  /** El tooltip se voltea hacia la izquierda en la mitad derecha para no salirse. */
  get tooltipALaIzquierda(): boolean {
    return !!this.puntoActivo && this.px(this.puntoActivo.x) > this.ancho / 2;
  }

  formato(v: number): string {
    const decimales = Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0;
    return v.toLocaleString('es-CO', { maximumFractionDigits: decimales });
  }

  /** Lleva el cursor al punto más cercano en x. */
  mover(evento: PointerEvent): void {
    const svg = evento.currentTarget as SVGElement;
    const x = evento.clientX - svg.getBoundingClientRect().left;
    let mejor = 0;
    this.ordenados.forEach((p, i) => {
      if (Math.abs(this.px(p.x) - x) < Math.abs(this.px(this.ordenados[mejor].x) - x)) mejor = i;
    });
    this.activo = mejor;
  }

  teclado(evento: KeyboardEvent): void {
    if (!this.ordenados.length) return;
    const ultimo = this.ordenados.length - 1;
    if (evento.key === 'ArrowRight') {
      this.activo = this.activo === null ? 0 : Math.min(ultimo, this.activo + 1);
    } else if (evento.key === 'ArrowLeft') {
      this.activo = this.activo === null ? ultimo : Math.max(0, this.activo - 1);
    } else {
      return;
    }
    evento.preventDefault();
  }
}
