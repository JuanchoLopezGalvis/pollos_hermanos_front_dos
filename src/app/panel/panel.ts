import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { GalponService, GalponOcupacionDTO } from '../services/galpon.service';
import { LoteService, LoteDTO, ESTADOS_LOTE } from '../services/lote.service';
import { GastosService, RentabilidadLoteDTO } from '../services/gastos.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/** Galpón con sus lotes activos y terminados. */
interface VistaGalpon {
  galpon: GalponOcupacionDTO;
  activos: LoteDTO[];
  terminados: LoteDTO[];
}

/**
 * Panel general de la producción escalonada: por cada galpón muestra sus lotes
 * activos (edad, vivos, muertos, alimento, salida estimada), los lotes ya
 * terminados con su resultado y las ganancias acumuladas.
 */
@Component({
  selector: 'app-panel',
  standalone: false,
  templateUrl: './panel.html'
})
export class Panel implements OnInit {

  vistas: VistaGalpon[] = [];
  lotes: LoteDTO[] = [];
  balance: Record<number, RentabilidadLoteDTO> = {};
  cargando = false;
  errorMsg = '';

  readonly estados = ESTADOS_LOTE;

  constructor(
    private galponSvc: GalponService,
    private loteSvc: LoteService,
    private gastosSvc: GastosService,
    public auth: AuthService
  ) {}

  get veBalance(): boolean {
    return this.auth.tienePermiso('costo.ver');
  }

  get activos(): LoteDTO[] {
    return this.lotes.filter(l => this.esActivo(l));
  }

  get avesAlojadas(): number {
    return this.activos.reduce((t, l) => t + l.avesDisponibles, 0);
  }

  get muertesActivos(): number {
    return this.activos.reduce((t, l) => t + l.mortalidadAcumulada, 0);
  }

  get gananciaAcumulada(): number {
    return Object.values(this.balance).filter(b => b.avesVendidas > 0).reduce((t, b) => t + Number(b.ganancia), 0);
  }

  /** Próximos lotes en salir, por fecha estimada de venta. */
  get proximasSalidas(): LoteDTO[] {
    return [...this.activos].sort((a, b) => a.fechaEstimadaVenta.localeCompare(b.fechaEstimadaVenta)).slice(0, 4);
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.errorMsg = '';
    forkJoin({
      ocupacion: this.galponSvc.ocupacion(),
      lotes: this.loteSvc.obtenerTodos(),
      balance: this.veBalance ? this.gastosSvc.balance().pipe(catchError(() => of([]))) : of([] as RentabilidadLoteDTO[])
    }).pipe(finalize(() => this.cargando = false)).subscribe({
      next: ({ ocupacion, lotes, balance }) => {
        this.lotes = lotes ?? [];
        this.balance = Object.fromEntries((balance ?? []).map(b => [b.idLote, b]));
        this.vistas = (ocupacion ?? []).map(g => ({
          galpon: g,
          activos: this.lotes.filter(l => l.idGalpon === g.idGalpon && this.esActivo(l))
            .sort((a, b) => b.edadDias - a.edadDias),
          terminados: this.lotes.filter(l => l.idGalpon === g.idGalpon && !this.esActivo(l)).slice(0, 5)
        }));
      },
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudo cargar el panel.')
    });
  }

  esActivo(l: LoteDTO): boolean {
    return l.estado === 'EN_ENGORDE' || l.estado === 'LISTO_PARA_VENTA';
  }

  ocupacionPct(g: GalponOcupacionDTO): number {
    return g.capacidadMaxima ? Math.min(100, g.avesAlojadas * 100 / g.capacidadMaxima) : 0;
  }

  /** Días que faltan para la venta estimada (negativo si ya pasó). */
  diasParaSalida(l: LoteDTO): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((Date.parse(l.fechaEstimadaVenta + 'T00:00:00') - hoy.getTime()) / 86400000);
  }
}
