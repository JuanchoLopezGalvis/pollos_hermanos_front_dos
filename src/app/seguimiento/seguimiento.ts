import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  SeguimientoService, SeguimientoCrecimientoDTO, CurvaCrecimientoSemanalDTO, NovedadGalponDTO
} from '../services/seguimiento.service';
import { AuthService } from '../services/auth.service';
import { LoteService, LoteDTO } from '../services/lote.service';
import { mensajeError } from '../services/error-api';

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

  /** Mayor peso de la curva, para escalar las barras. */
  get pesoMaximo(): number {
    return Math.max(1, ...this.curva.map(c => c.pesoPromedioGramos));
  }

  ngOnInit(): void {
    this.loteSvc.obtenerTodos().subscribe({
      next: (l) => this.lotesActivos = (l ?? []).filter(x => x.estado === 'EN_ENGORDE' || x.estado === 'LISTO_PARA_VENTA'),
      error: () => this.lotesActivos = []
    });
    this.cargar();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      codigoLote: ['', [Validators.required, Validators.maxLength(30)]],
      fecha: [this.hoy],
      pesoPromedioGramos: [null, [Validators.min(0.01)]],
      observaciones: ['', [Validators.maxLength(1000)]],
      muestreo: this.fb.group({
        avesPesadas: [null, [Validators.min(1), Validators.pattern(/^\d+$/)]],
        uniformidadPorcentaje: [null, [Validators.min(0), Validators.max(100)]]
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

    const peticion = lote
      ? this.seguimientoSvc.obtenerPorLote(lote)
      : this.seguimientoSvc.obtenerTodos();

    peticion.pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => {
        this.seguimientos = [...(data ?? [])].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
      },
      error: (err) => {
        this.seguimientos = [];
        this.errorMsg = mensajeError(err, 'No se pudo cargar el seguimiento.');
      }
    });

    if (lote) {
      this.seguimientoSvc.curvaSemanal(lote).subscribe({
        next: (data) => this.curva = data ?? [],
        error: () => this.curva = []
      });
    }
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
