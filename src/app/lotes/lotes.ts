import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  LoteService, LoteDTO, MortalidadDTO, EstadoLote, ESTADOS_LOTE, SIGUIENTES_ESTADOS
} from '../services/lote.service';
import { GalponService, GalponOcupacionDTO } from '../services/galpon.service';
import { AlimentacionService, ConsumoAlimentoDTO } from '../services/alimentacion.service';
import { SanidadService, AplicacionSanitariaDTO } from '../services/sanidad.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/**
 * Lotes de pollos, su estado y su mortalidad diaria. Un galpón aloja varios lotes
 * (uno nuevo cada semana). Las reglas (capacidad compartida del galpón, ciclo de 35
 * a 45 días, transiciones de estado, alerta del 5 %) las aplica PostgreSQL; esta
 * pantalla muestra sus mensajes cuando rechaza una operación.
 */
@Component({
  selector: 'app-lotes',
  standalone: false,
  templateUrl: './lotes.html',
  styleUrls: ['./lotes.css']
})
export class Lotes implements OnInit {

  lotes: LoteDTO[] = [];
  galpones: GalponOcupacionDTO[] = [];
  consumosLote: ConsumoAlimentoDTO[] = [];
  aplicacionesLote: AplicacionSanitariaDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';
  verInactivos = false;

  /** Formulario abierto: nuevo lote o corrección del lote seleccionado. */
  modoFormulario: 'nuevo' | 'editar' | null = null;
  form: FormGroup;

  seleccionado: LoteDTO | null = null;
  mortalidad: MortalidadDTO[] = [];
  cargandoMortalidad = false;
  formMortalidad: FormGroup;
  registrandoMortalidad = false;

  readonly estados = ESTADOS_LOTE;
  readonly hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  constructor(
    private fb: FormBuilder,
    private loteSvc: LoteService,
    private galponSvc: GalponService,
    private alimentacionSvc: AlimentacionService,
    private sanidadSvc: SanidadService,
    public auth: AuthService,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.crearFormulario();
    this.formMortalidad = this.crearFormularioMortalidad();
  }

  get puedeGestionar(): boolean {
    return this.auth.tienePermiso('lote.gestionar');
  }

  get puedeRegistrarMortalidad(): boolean {
    return this.auth.tieneAlguno(['mortalidad.registrar', 'lote.gestionar']);
  }

  get f() { return this.form.controls; }

  get fm() { return this.formMortalidad.controls; }

  /** Lotes visibles según el filtro de activos. */
  get visibles(): LoteDTO[] {
    return this.verInactivos ? this.lotes : this.lotes.filter(l => this.esActivo(l));
  }

  /** Galpones que pueden recibir un lote nuevo: no están en mantenimiento y tienen espacio. */
  get galponesDisponibles(): GalponOcupacionDTO[] {
    return this.galpones.filter(g => g.estado !== 'MANTENIMIENTO' && g.capacidadLibre > 0);
  }

  /** Espacio libre del galpón elegido en el formulario. */
  get capacidadLibreElegida(): number | null {
    return this.galpones.find(g => g.idGalpon === this.form.value.idGalpon)?.capacidadLibre ?? null;
  }

  get siguientesEstados(): EstadoLote[] {
    return this.seleccionado ? SIGUIENTES_ESTADOS[this.seleccionado.estado] : [];
  }

  ngOnInit(): void {
    this.cargar();
    this.cargarGalpones();
  }

  /** Edad del lote seleccionado en una fecha; el día de ingreso es el día 1. */
  edadEn(fecha: string): number | null {
    if (!this.seleccionado) return null;
    return Math.round((Date.parse(fecha) - Date.parse(this.seleccionado.fechaIngreso)) / 86400000) + 1;
  }

  esActivo(l: LoteDTO): boolean {
    return l.estado === 'EN_ENGORDE' || l.estado === 'LISTO_PARA_VENTA';
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9-]+$/)]],
      idGalpon: [null, [Validators.required]],
      fechaIngreso: [this.hoy, [Validators.required]],
      cantidadInicial: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      costoPollito: [null, [Validators.required, Validators.min(0)]],
      fechaEstimadaVenta: [null]
    });
  }

  private crearFormularioMortalidad(): FormGroup {
    return this.fb.group({
      fecha: [this.hoy, [Validators.required]],
      cantidad: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      causa: ['', [Validators.maxLength(200)]]
    });
  }

  cargar(idSeleccionado?: number): void {
    this.loading = true;
    this.errorMsg = '';
    this.loteSvc.obtenerTodos().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => {
        this.lotes = data ?? [];
        const id = idSeleccionado ?? this.seleccionado?.id;
        this.seleccionado = id ? this.lotes.find(l => l.id === id) ?? null : null;
      },
      error: (err) => {
        this.lotes = [];
        this.errorMsg = mensajeError(err, 'No se pudieron cargar los lotes.');
      }
    });
  }

  private cargarGalpones(): void {
    this.galponSvc.ocupacion().subscribe({
      next: (data) => this.galpones = [...(data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      error: () => this.galpones = []
    });
  }

  nuevo(): void {
    this.form = this.crearFormulario();
    this.modoFormulario = 'nuevo';
    this.cargarGalpones();
  }

  editar(l: LoteDTO): void {
    this.form = this.crearFormulario();
    this.form.patchValue({
      codigo: l.codigo,
      idGalpon: l.idGalpon,
      fechaIngreso: l.fechaIngreso,
      cantidadInicial: l.cantidadInicial,
      costoPollito: l.costoPollito,
      fechaEstimadaVenta: l.fechaEstimadaVenta
    });
    // El código, el galpón y la fecha de ingreso identifican el lote, también en MongoDB.
    ['codigo', 'idGalpon', 'fechaIngreso'].forEach(c => this.f[c].disable());
    this.f['fechaEstimadaVenta'].addValidators(Validators.required);
    this.modoFormulario = 'editar';
  }

  cancelar(): void {
    this.modoFormulario = null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messages.add({ severity: 'warn', summary: 'Revisa el formulario', detail: 'Hay campos con valores no válidos.' });
      return;
    }
    const v = this.form.getRawValue();
    this.guardando = true;

    const peticion = this.modoFormulario === 'editar' && this.seleccionado
      ? this.loteSvc.actualizar(this.seleccionado.id, {
          cantidadInicial: Number(v.cantidadInicial),
          costoPollito: Number(v.costoPollito),
          fechaEstimadaVenta: v.fechaEstimadaVenta
        })
      : this.loteSvc.crear({
          codigo: String(v.codigo).trim().toUpperCase(),
          idGalpon: Number(v.idGalpon),
          fechaIngreso: v.fechaIngreso,
          cantidadInicial: Number(v.cantidadInicial),
          costoPollito: Number(v.costoPollito),
          fechaEstimadaVenta: v.fechaEstimadaVenta || null
        });

    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (lote) => {
        this.messages.add({
          severity: 'success',
          summary: this.modoFormulario === 'editar' ? 'Lote actualizado' : 'Lote registrado',
          detail: `${lote.codigo} en ${lote.galpon}, venta estimada ${lote.fechaEstimadaVenta}`
        });
        this.modoFormulario = null;
        this.cargarGalpones();
        this.seleccionar(lote);
        this.cargar(lote.id);
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 })
    });
  }

  seleccionar(l: LoteDTO): void {
    this.seleccionado = l;
    this.formMortalidad = this.crearFormularioMortalidad();
    this.cargarMortalidad();
    this.cargarInsumos();
  }

  cerrarDetalle(): void {
    this.seleccionado = null;
    this.modoFormulario = null;
  }

  /** Alimento y vitaminas o medicamentos registrados para el lote, si el usuario puede verlos. */
  private cargarInsumos(): void {
    const lote = this.seleccionado;
    this.consumosLote = [];
    this.aplicacionesLote = [];
    if (!lote) return;
    if (this.auth.tieneAlguno(['alimentacion.ver', 'alimentacion.registrar'])) {
      this.alimentacionSvc.consumos(lote.id).subscribe({ next: c => this.consumosLote = c ?? [], error: () => this.consumosLote = [] });
    }
    if (this.auth.tieneAlguno(['sanidad.ver', 'sanidad.registrar'])) {
      this.sanidadSvc.aplicaciones(lote.id).subscribe({ next: a => this.aplicacionesLote = a ?? [], error: () => this.aplicacionesLote = [] });
    }
  }

  private cargarMortalidad(): void {
    if (!this.seleccionado) return;
    this.cargandoMortalidad = true;
    this.loteSvc.obtenerMortalidad(this.seleccionado.id).pipe(finalize(() => this.cargandoMortalidad = false)).subscribe({
      next: (data) => this.mortalidad = data ?? [],
      error: () => this.mortalidad = []
    });
  }

  registrarMortalidad(): void {
    if (!this.seleccionado) return;
    if (this.formMortalidad.invalid) {
      this.formMortalidad.markAllAsTouched();
      return;
    }
    const v = this.formMortalidad.value;
    const lote = this.seleccionado;
    this.registrandoMortalidad = true;
    this.loteSvc.registrarMortalidad(lote.id, {
      fecha: v.fecha,
      cantidad: Number(v.cantidad),
      causa: v.causa?.trim() || null
    }).pipe(finalize(() => this.registrandoMortalidad = false)).subscribe({
      next: (res) => {
        if (res.alerta) {
          this.messages.add({
            severity: 'warn',
            summary: 'Alerta de mortalidad',
            detail: `El lote ${lote.codigo} lleva ${res.porcentajeMortalidad} % de mortalidad, por encima del 5 % de referencia.`,
            life: 10000
          });
        } else {
          this.messages.add({
            severity: 'success',
            summary: 'Mortalidad registrada',
            detail: `Acumulada: ${res.porcentajeMortalidad} %`
          });
        }
        this.formMortalidad = this.crearFormularioMortalidad();
        this.cargarMortalidad();
        this.cargar(lote.id);
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se registró', detail: mensajeError(err), life: 6000 })
    });
  }

  cambiarEstado(estado: EstadoLote): void {
    const lote = this.seleccionado;
    if (!lote) return;
    this.confirm.confirm({
      header: 'Cambiar estado',
      message: `¿Pasar el lote ${lote.codigo} de "${this.estados[lote.estado]}" a "${this.estados[estado]}"?`,
      icon: 'pi pi-question-circle',
      acceptLabel: 'Cambiar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loteSvc.cambiarEstado(lote.id, estado).subscribe({
          next: (res) => {
            this.messages.add({ severity: 'success', summary: 'Estado actualizado', detail: `${res.codigo}: ${this.estados[res.estado]}` });
            this.cargarGalpones();
            this.cargar(res.id);
          },
          error: (err) => this.messages.add({ severity: 'error', summary: 'No se cambió el estado', detail: mensajeError(err), life: 8000 })
        });
      }
    });
  }

  claseEstado(l: LoteDTO): string {
    switch (l.estado) {
      case 'EN_ENGORDE': return 'verde';
      case 'LISTO_PARA_VENTA': return '';
      default: return 'gris';
    }
  }

  trackById(index: number, l: LoteDTO): number {
    return l.id;
  }
}
