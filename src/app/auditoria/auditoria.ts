import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import {
  AuditoriaDTO, AuditoriaService, FiltroAuditoria, NOMBRES_TABLA, OPERACIONES
} from '../services/auditoria.service';
import { mensajeError } from '../services/error-api';
import { hoyISO } from '../navegacion';

/** Una columna del registro con su valor antes y después del cambio. */
export interface CampoCambio {
  columna: string;
  antes: string;
  despues: string;
  cambio: boolean;
}

/**
 * Auditoría: quién creó, modificó o borró cada registro, con los datos antes y
 * después. Es de solo lectura; los cambios los registran los triggers de
 * PostgreSQL.
 */
@Component({
  selector: 'app-auditoria',
  standalone: false,
  templateUrl: './auditoria.html'
})
export class Auditoria implements OnInit {

  /** Cambios por página. */
  static readonly TAMANO = 50;

  registros: AuditoriaDTO[] = [];
  tablas: string[] = [];
  total = 0;
  pagina = 0;
  seleccionado: AuditoriaDTO | null = null;
  loading = false;
  errorMsg = '';

  filtro: FiltroAuditoria = Auditoria.filtroVacio();

  readonly operaciones = OPERACIONES;
  readonly hoy = hoyISO();

  constructor(private auditoriaSvc: AuditoriaService) {}

  private static filtroVacio(): FiltroAuditoria {
    return { tabla: null, operacion: null, usuario: '', soloSistema: false, registro: '', desde: null, hasta: null };
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / Auditoria.TAMANO));
  }

  ngOnInit(): void {
    this.auditoriaSvc.tablas().subscribe({ next: (t) => this.tablas = t ?? [], error: () => this.tablas = [] });
    this.cargar(0);
  }

  buscar(): void {
    this.cargar(0);
  }

  limpiar(): void {
    this.filtro = Auditoria.filtroVacio();
    this.cargar(0);
  }

  irA(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas) this.cargar(pagina);
  }

  /** Muestra (o esconde) el detalle de un cambio. */
  seleccionar(r: AuditoriaDTO): void {
    this.seleccionado = this.seleccionado?.idAuditoria === r.idAuditoria ? null : r;
  }

  /** Ve todo el historial del mismo registro. */
  historial(r: AuditoriaDTO): void {
    this.filtro = { ...Auditoria.filtroVacio(), tabla: r.tabla, registro: r.idRegistro ?? '' };
    this.cargar(0);
  }

  nombreTabla(tabla: string): string {
    return NOMBRES_TABLA[tabla] ?? tabla;
  }

  /** Color del chip según la operación. */
  claseOperacion(operacion: string): string {
    return operacion === 'INSERT' ? 'verde' : operacion === 'UPDATE' ? '' : 'rojo';
  }

  /** Resumen corto del cambio para la tabla. */
  resumen(r: AuditoriaDTO): string {
    if (r.operacion === 'UPDATE') return (r.columnasCambiadas ?? []).join(', ');
    if (r.operacion === 'TRUNCATE') return 'Se vaciaron todos los registros de la tabla';
    return r.operacion === 'INSERT' ? 'Registro nuevo' : 'Registro borrado';
  }

  /**
   * Columnas del registro con su valor antes y después. En una modificación
   * aparecen primero las que cambiaron.
   */
  campos(r: AuditoriaDTO): CampoCambio[] {
    const antes = r.datosAntes ?? {};
    const despues = r.datosDespues ?? {};
    const columnas = Array.from(new Set([...Object.keys(antes), ...Object.keys(despues)]));
    const cambiadas = new Set(r.columnasCambiadas ?? []);
    const filas = columnas.map(columna => ({
      columna,
      antes: Auditoria.texto(antes[columna], r.datosAntes),
      despues: Auditoria.texto(despues[columna], r.datosDespues),
      cambio: cambiadas.has(columna)
    }));
    if (cambiadas.has('contrasena') && !columnas.includes('contrasena')) {
      filas.push({ columna: 'contrasena', antes: '(oculta)', despues: '(oculta)', cambio: true });
    }
    return filas.sort((a, b) => Number(b.cambio) - Number(a.cambio));
  }

  /** Texto de un valor; '—' si la fila no existía en ese momento. */
  private static texto(valor: unknown, fila: Record<string, unknown> | null): string {
    if (fila === null) return '—';
    if (valor === null || valor === undefined) return 'vacío';
    return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  }

  private cargar(pagina: number): void {
    this.loading = true;
    this.errorMsg = '';
    this.seleccionado = null;
    this.auditoriaSvc.buscar(this.filtro, pagina, Auditoria.TAMANO).pipe(finalize(() => this.loading = false)).subscribe({
      next: (p) => {
        this.registros = p.registros ?? [];
        this.total = p.total;
        this.pagina = p.pagina;
      },
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudo cargar la auditoría.')
    });
  }
}
