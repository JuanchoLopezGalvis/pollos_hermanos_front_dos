import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  SeguimientoService, SeguimientoCrecimientoDTO, CurvaCrecimientoSemanalDTO, NovedadGalponDTO
} from '../services/seguimiento.service';
import { AuthService } from '../services/auth.service';
import { LoteService, LoteDTO } from '../services/lote.service';
import { LIMITES, decimal, entero } from '../services/validaciones';
import { mensajeError } from '../services/error-api';
import { PuntoGrafico } from './graficos/grafico-linea';
import { BarraGrafico } from './graficos/grafico-barras';

/** Indicadores del lote filtrado. */
export interface IndicadoresLote {
  pesoActual: number | null;
  edadDias: number | null;
  /** Gramos que gana por día entre el primer y el último peso. */
  gananciaDiaria: number | null;
  uniformidad: number | null;
  novedades: number;
}

/** Indicadores de todos los lotes. */
export interface IndicadoresGenerales {
  registros: number;
  lotes: number;
  muestreos: number;
  novedades: number;
}

/** Promedia los valores que caen en el mismo día de vida (varios registros el mismo día). */
function promedioPorDia(valores: { dia: number; valor: number; fecha?: string }[]): PuntoGrafico[] {
  const porDia = new Map<number, { suma: number; n: number; fecha?: string }>();
  valores.forEach(v => {
    const actual = porDia.get(v.dia) ?? { suma: 0, n: 0, fecha: v.fecha };
    porDia.set(v.dia, { suma: actual.suma + v.valor, n: actual.n + 1, fecha: actual.fecha });
  });
  return [...porDia.entries()].sort((a, b) => a[0] - b[0]).map(([dia, a]) => ({
    x: dia,
    y: Math.round((a.suma / a.n) * 10) / 10,
    detalle: [a.fecha ? fechaCorta(a.fecha) : '', a.n > 1 ? `promedio de ${a.n} registros` : ''].filter(Boolean).join(' · ')
  }));
}

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/** Cuenta las novedades por tipo, de la más frecuente a la menos. */
function novedadesPorTipo(lista: SeguimientoCrecimientoDTO[]): BarraGrafico[] {
  const conteo = new Map<string, number>();
  lista.forEach(s => (s.novedades ?? []).forEach(n => {
    const tipo = n.tipo.trim();
    conteo.set(tipo, (conteo.get(tipo) ?? 0) + 1);
  }));
  return [...conteo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([etiqueta, valor]) => ({ etiqueta, valor, detalle: `${valor} ${valor === 1 ? 'vez' : 'veces'}` }));
}

/** El muestreo es opcional, pero si se llena un campo se deben llenar los dos. */
function muestreoCompleto(group: AbstractControl): ValidationErrors | null {
  const aves = group.get('avesPesadas')?.value;
  const uniformidad = group.get('uniformidadPorcentaje')?.value;
  const vacio = (v: unknown) => v === null || v === undefined || v === '';
  return vacio(aves) === vacio(uniformidad) ? null : { muestreoIncompleto: true };
}

/**
 * Seguimiento diario del crecimiento de los lotes (MongoDB): peso, muestreos,
 * novedades y observaciones. La temperatura y la humedad no se registran porque
 * las condiciones de la zona son favorables. Un lote puede tener varios
 * seguimientos el mismo día. El backend valida en PostgreSQL que el lote exista y
 * esté activo, y calcula su edad.
 */
@Component({
  selector: 'app-seguimiento',
  standalone: false,
  templateUrl: './seguimiento.html',
  styleUrls: ['./seguimiento.css']
})
export class Seguimiento implements OnInit {

  seguimientos: SeguimientoCrecimientoDTO[] = [];
  lotesActivos: LoteDTO[] = [];
  curva: CurvaCrecimientoSemanalDTO[] = [];
  loteFiltro = '';
  loteActual = '';
  /** Lotes que se pueden elegir en el filtro: activos o con seguimientos. */
  codigosLote: string[] = [];

  // Estadísticas: se recalculan al cargar para que las gráficas reciban los mismos arreglos.
  indicadoresLote: IndicadoresLote | null = null;
  indicadoresGenerales: IndicadoresGenerales | null = null;
  pesoPorDia: PuntoGrafico[] = [];
  uniformidadPorDia: PuntoGrafico[] = [];
  semanas: BarraGrafico[] = [];
  pesoPorLote: BarraGrafico[] = [];
  novedadesTipo: BarraGrafico[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';

  mostrarFormulario = false;
  editandoId: string | null = null;
  form: FormGroup;

  readonly hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  constructor(
    private fb: FormBuilder,
    private seguimientoSvc: SeguimientoService,
    private loteSvc: LoteService,
    public auth: AuthService,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.crearFormulario();
  }

  get puedeRegistrar(): boolean {
    return this.auth.tienePermiso('seguimiento.registrar');
  }

  get f() { return this.form.controls; }

  get novedades(): FormArray {
    return this.form.get('novedades') as FormArray;
  }

  ngOnInit(): void {
    this.loteSvc.obtenerTodos().subscribe({
      next: (l) => {
        this.lotesActivos = (l ?? []).filter(x => x.estado === 'EN_ENGORDE' || x.estado === 'LISTO_PARA_VENTA');
        this.agregarCodigos(this.lotesActivos.map(x => x.codigo));
      },
      error: () => this.lotesActivos = []
    });
    this.cargar();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      codigoLote: ['', [Validators.required, Validators.maxLength(30)]],
      fecha: [this.hoy],
      pesoPromedioGramos: [null, decimal(0.01, LIMITES.pesoAveGramos, 2, false)],
      observaciones: ['', [Validators.maxLength(1000)]],
      muestreo: this.fb.group({
        avesPesadas: [null, entero(1, LIMITES.aves, false)],
        uniformidadPorcentaje: [null, decimal(0, 100, 2, false)]
      }, { validators: muestreoCompleto }),
      novedades: this.fb.array([])
    });
  }

  private crearNovedad(n?: NovedadGalponDTO): FormGroup {
    return this.fb.group({
      tipo: [n?.tipo ?? '', [Validators.required, Validators.maxLength(60)]],
      descripcion: [n?.descripcion ?? '', [Validators.maxLength(500)]]
    });
  }

  agregarNovedad(): void {
    this.novedades.push(this.crearNovedad());
  }

  quitarNovedad(i: number): void {
    this.novedades.removeAt(i);
  }

  /** Carga todos los seguimientos o, si hay un lote en el filtro, los de ese lote con su curva. */
  cargar(): void {
    const lote = this.loteFiltro.trim();
    this.loading = true;
    this.errorMsg = '';
    this.loteActual = lote;
    this.curva = [];
    this.semanas = [];

    const peticion = lote
      ? this.seguimientoSvc.obtenerPorLote(lote)
      : this.seguimientoSvc.obtenerTodos();

    peticion.pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => {
        this.seguimientos = [...(data ?? [])].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
        this.agregarCodigos(this.seguimientos.map(s => s.codigoLote));
        this.calcularEstadisticas();
      },
      error: (err) => {
        this.seguimientos = [];
        this.calcularEstadisticas();
        this.errorMsg = mensajeError(err, 'No se pudo cargar el seguimiento.');
      }
    });

    if (lote) {
      this.seguimientoSvc.curvaSemanal(lote).subscribe({
        next: (data) => {
          this.curva = data ?? [];
          this.semanas = this.curva.map(c => ({
            etiqueta: `Sem. ${c.semana}`, valor: c.pesoPromedioGramos,
            detalle: `${c.registros} ${c.registros === 1 ? 'registro' : 'registros'} (días ${c.semana * 7 - 6} a ${c.semana * 7})`
          }));
        },
        error: () => { this.curva = []; this.semanas = []; }
      });
    }
  }

  /** Elegir un lote en el filtro muestra sus estadísticas; vacío muestra todos. */
  elegirLote(codigo: string): void {
    this.loteFiltro = codigo;
    this.cargar();
  }

  private agregarCodigos(codigos: string[]): void {
    this.codigosLote = [...new Set([...this.codigosLote, ...codigos])].sort();
  }

  /** Calcula los indicadores y las series de las gráficas con los seguimientos cargados. */
  calcularEstadisticas(): void {
    const lista = this.seguimientos;
    const conPeso = lista.filter(s => s.pesoPromedioGramos != null && s.edadDias != null);
    this.novedadesTipo = novedadesPorTipo(lista);
    const totalNovedades = lista.reduce((t, s) => t + (s.novedades?.length ?? 0), 0);

    if (this.loteActual) {
      this.indicadoresGenerales = null;
      this.pesoPorLote = [];
      this.pesoPorDia = promedioPorDia(conPeso.map(s => ({ dia: s.edadDias!, valor: s.pesoPromedioGramos!, fecha: s.fecha })));
      this.uniformidadPorDia = promedioPorDia(lista.filter(s => s.muestreo && s.edadDias != null)
        .map(s => ({ dia: s.edadDias!, valor: s.muestreo!.uniformidadPorcentaje, fecha: s.fecha })));

      const primero = this.pesoPorDia[0];
      const ultimo = this.pesoPorDia[this.pesoPorDia.length - 1];
      const muestreos = [...lista].filter(s => s.muestreo)
        .sort((a, b) => (a.edadDias ?? 0) - (b.edadDias ?? 0));
      this.indicadoresLote = {
        pesoActual: ultimo?.y ?? null,
        edadDias: lista.length ? Math.max(...lista.map(s => s.edadDias ?? 0)) : null,
        gananciaDiaria: primero && ultimo && ultimo.x > primero.x
          ? Math.round(((ultimo.y - primero.y) / (ultimo.x - primero.x)) * 10) / 10 : null,
        uniformidad: muestreos.length ? muestreos[muestreos.length - 1].muestreo!.uniformidadPorcentaje : null,
        novedades: totalNovedades
      };
      return;
    }

    this.indicadoresLote = null;
    this.pesoPorDia = [];
    this.uniformidadPorDia = [];
    this.semanas = [];
    this.indicadoresGenerales = {
      registros: lista.length,
      lotes: new Set(lista.map(s => s.codigoLote)).size,
      muestreos: lista.filter(s => s.muestreo).length,
      novedades: totalNovedades
    };
    // Último peso registrado de cada lote (el de mayor edad).
    const ultimoPorLote = new Map<string, SeguimientoCrecimientoDTO>();
    conPeso.forEach(s => {
      const actual = ultimoPorLote.get(s.codigoLote);
      if (!actual || s.edadDias! > actual.edadDias! || (s.edadDias === actual.edadDias && (s.fecha ?? '') > (actual.fecha ?? ''))) {
        ultimoPorLote.set(s.codigoLote, s);
      }
    });
    this.pesoPorLote = [...ultimoPorLote.values()].sort((a, b) => b.pesoPromedioGramos! - a.pesoPromedioGramos!)
      .map(s => ({ etiqueta: s.codigoLote, valor: s.pesoPromedioGramos!, detalle: `Día ${s.edadDias} · ${fechaCorta(s.fecha ?? '')}` }));
  }

  limpiarFiltro(): void {
    this.loteFiltro = '';
    this.cargar();
  }

  nuevo(): void {
    this.editandoId = null;
    this.form = this.crearFormulario();
    if (this.loteActual) {
      this.form.patchValue({ codigoLote: this.loteActual });
    }
    this.mostrarFormulario = true;
  }

  editar(s: SeguimientoCrecimientoDTO): void {
    this.editandoId = s.id ?? null;
    this.form = this.crearFormulario();
    this.form.patchValue({
      codigoLote: s.codigoLote,
      fecha: s.fecha,
      pesoPromedioGramos: s.pesoPromedioGramos ?? null,
      observaciones: s.observaciones ?? '',
      muestreo: {
        avesPesadas: s.muestreo?.avesPesadas ?? null,
        uniformidadPorcentaje: s.muestreo?.uniformidadPorcentaje ?? null
      }
    });
    (s.novedades ?? []).forEach(n => this.novedades.push(this.crearNovedad(n)));
    // El lote y la fecha no se modifican después de registrar.
    this.f['codigoLote'].disable();
    this.f['fecha'].disable();
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messages.add({ severity: 'warn', summary: 'Revisa el formulario', detail: 'Hay campos con valores no válidos.' });
      return;
    }

    const dto = this.construirDTO();
    this.guardando = true;

    const peticion = this.editandoId
      ? this.seguimientoSvc.actualizar(this.editandoId, dto)
      : this.seguimientoSvc.crear(dto);

    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        this.messages.add({
          severity: 'success',
          summary: this.editandoId ? 'Seguimiento actualizado' : 'Seguimiento registrado',
          detail: `Lote ${res.codigoLote}, día ${res.edadDias ?? '-'}`
        });
        this.mostrarFormulario = false;
        this.editandoId = null;
        this.loteFiltro = res.codigoLote;
        this.cargar();
      },
      error: (err) => {
        this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 });
      }
    });
  }

  /** Arma el cuerpo de la petición sin enviar campos vacíos. */
  private construirDTO(): SeguimientoCrecimientoDTO {
    const v = this.form.getRawValue();
    const numero = (x: unknown) => (x === null || x === undefined || x === '' ? undefined : Number(x));

    const dto: SeguimientoCrecimientoDTO = { codigoLote: String(v.codigoLote).trim() };
    if (!this.editandoId && v.fecha) dto.fecha = v.fecha;
    dto.pesoPromedioGramos = numero(v.pesoPromedioGramos);
    if (v.observaciones?.trim()) dto.observaciones = v.observaciones.trim();

    const aves = numero(v.muestreo.avesPesadas);
    const uniformidad = numero(v.muestreo.uniformidadPorcentaje);
    if (aves !== undefined && uniformidad !== undefined) {
      dto.muestreo = { avesPesadas: aves, uniformidadPorcentaje: uniformidad };
    }

    dto.novedades = (v.novedades as NovedadGalponDTO[]).map(n => ({
      tipo: n.tipo.trim(),
      ...(n.descripcion?.trim() ? { descripcion: n.descripcion.trim() } : {})
    }));
    return dto;
  }

  eliminar(s: SeguimientoCrecimientoDTO): void {
    if (!s.id) return;
    this.confirm.confirm({
      header: 'Eliminar seguimiento',
      message: `¿Eliminar el seguimiento del lote ${s.codigoLote} del ${s.fecha}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.seguimientoSvc.eliminar(s.id!).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Seguimiento eliminado' });
            this.cargar();
          },
          error: (err) => this.messages.add({ severity: 'error', summary: 'No se eliminó', detail: mensajeError(err) })
        });
      }
    });
  }

  trackById(index: number, s: SeguimientoCrecimientoDTO): string {
    return s.id ?? `${s.codigoLote}-${s.fecha}-${index}`;
  }
}
