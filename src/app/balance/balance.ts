import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { GastosService, RentabilidadLoteDTO } from '../services/gastos.service';
import { mensajeError } from '../services/error-api';
import { ESTADOS_LOTE } from '../services/lote.service';

/**
 * Balance económico de cada lote: costos (pollitos, alimento, sanidad, beneficio
 * y otros gastos), ingresos (ventas en libras y otros ingresos) y ganancia neta.
 */
@Component({
  selector: 'app-balance',
  standalone: false,
  templateUrl: './balance.html'
})
export class Balance implements OnInit {

  lotes: RentabilidadLoteDTO[] = [];
  seleccionado: RentabilidadLoteDTO | null = null;
  loading = false;
  errorMsg = '';
  soloVendidos = false;

  readonly estados: Record<string, string> = ESTADOS_LOTE;

  constructor(private gastosSvc: GastosService) {}

  get visibles(): RentabilidadLoteDTO[] {
    return this.soloVendidos ? this.lotes.filter(l => l.avesVendidas > 0) : this.lotes;
  }

  /** Ganancia de los lotes que ya vendieron; los que siguen en engorde aún no tienen resultado. */
  get gananciaTotal(): number { return this.conVentas.reduce((t, l) => t + Number(l.ganancia), 0); }
  get ingresoTotal(): number { return this.visibles.reduce((t, l) => t + Number(l.ingresoTotal), 0); }
  get costoTotal(): number { return this.visibles.reduce((t, l) => t + Number(l.costoTotal), 0); }

  private get conVentas(): RentabilidadLoteDTO[] {
    return this.visibles.filter(l => this.tieneResultado(l));
  }

  /** Un lote tiene resultado cuando ya vendió aves o terminó su ciclo. */
  tieneResultado(l: RentabilidadLoteDTO): boolean {
    return l.avesVendidas > 0 || l.estado === 'VENDIDO' || l.estado === 'CERRADO';
  }

  /** Lote con mayor ganancia entre los que ya vendieron. */
  get mejorLote(): RentabilidadLoteDTO | null {
    const vendidos = this.lotes.filter(l => l.avesVendidas > 0);
    return vendidos.length ? vendidos.reduce((a, b) => Number(b.ganancia) > Number(a.ganancia) ? b : a) : null;
  }

  /** Componentes del costo del lote seleccionado, con su peso en el total. */
  get componentes(): { nombre: string; valor: number; porcentaje: number }[] {
    const l = this.seleccionado;
    if (!l) return [];
    const total = Number(l.costoTotal) || 1;
    return [
      { nombre: 'Pollitos', valor: Number(l.costoPollitos) },
      { nombre: 'Alimento', valor: Number(l.costoAlimento) },
      { nombre: 'Vitaminas y medicamentos', valor: Number(l.costoSanidad) },
      { nombre: 'Beneficio', valor: Number(l.costoBeneficio) },
      { nombre: 'Otros gastos', valor: Number(l.otrosGastos) }
    ].map(c => ({ ...c, porcentaje: c.valor * 100 / total }));
  }

  ngOnInit(): void {
    this.loading = true;
    this.gastosSvc.balance().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.lotes = data ?? [],
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudo cargar el balance.')
    });
  }

  seleccionar(l: RentabilidadLoteDTO): void {
    this.seleccionado = this.seleccionado?.idLote === l.idLote ? null : l;
  }
}
