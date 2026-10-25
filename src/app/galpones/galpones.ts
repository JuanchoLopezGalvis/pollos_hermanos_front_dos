import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { GalponService, GalponDTO, GalponOcupacionDTO, ESTADOS_GALPON } from '../services/galpon.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/**
 * Galpones de la finca. Cada galpón aloja varios lotes de distintas edades que
 * comparten su capacidad. El estado "Ocupado" lo asigna PostgreSQL mientras haya
 * lotes activos, así que en el formulario solo se elige entre disponible y en
 * mantenimiento.
 */
@Component({
  selector: 'app-galpones',
  standalone: false,
  templateUrl: './galpones.html',
  styleUrls: ['./galpones.css']
})
export class Galpones implements OnInit {

  galpones: GalponDTO[] = [];
  ocupacion: Record<number, GalponOcupacionDTO> = {};
  loading = false;
  guardando = false;
  errorMsg = '';

  mostrarFormulario = false;
  editando: GalponDTO | null = null;
  form: FormGroup;

  readonly estados = ESTADOS_GALPON;

  constructor(
    private fb: FormBuilder,
    private galponSvc: GalponService,
    public auth: AuthService,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.crearFormulario();
  }

  get puedeGestionar(): boolean {
    return this.auth.tienePermiso('galpon.gestionar');
  }

  get f() { return this.form.controls; }

  /** Aves vivas alojadas en todos los galpones. */
  get avesAlojadas(): number {
    return Object.values(this.ocupacion).reduce((t, o) => t + o.avesAlojadas, 0);
  }

  /** Aves que caben en todos los galpones. */
  get capacidadTotal(): number {
    return this.galpones.reduce((total, g) => total + g.capacidadMaxima, 0);
  }

  contar(estado: string): number {
    return this.galpones.filter(g => g.estado === estado).length;
  }

  ngOnInit(): void {
    this.cargar();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(60)]],
      capacidadMaxima: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      estado: ['DISPONIBLE']
    });
  }

  cargar(): void {
    this.cargarOcupacion();
    this.loading = true;
    this.errorMsg = '';
    this.galponSvc.obtenerTodos().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.galpones = [...(data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      error: (err) => {
        this.galpones = [];
        this.errorMsg = mensajeError(err, 'No se pudieron cargar los galpones.');
      }
    });
  }

  private cargarOcupacion(): void {
    this.galponSvc.ocupacion().subscribe({
      next: (data) => this.ocupacion = Object.fromEntries((data ?? []).map(o => [o.idGalpon, o])),
      error: () => this.ocupacion = {}
    });
  }

  nuevo(): void {
    this.editando = null;
    this.form = this.crearFormulario();
    this.mostrarFormulario = true;
  }

  editar(g: GalponDTO): void {
    this.editando = g;
    this.form = this.crearFormulario();
    this.form.patchValue({ nombre: g.nombre, capacidadMaxima: g.capacidadMaxima, estado: g.estado });
    // Un galpón ocupado cambia de estado solo cuando su lote sale.
    if (g.estado === 'OCUPADO') {
      this.f['estado'].disable();
    }
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editando = null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messages.add({ severity: 'warn', summary: 'Revisa el formulario', detail: 'Hay campos con valores no válidos.' });
      return;
    }
    const v = this.form.getRawValue();
    const dto: GalponDTO = { nombre: String(v.nombre).trim(), capacidadMaxima: Number(v.capacidadMaxima) };
    if (!this.f['estado'].disabled) {
      dto.estado = v.estado;
    }

    this.guardando = true;
    const peticion = this.editando?.id
      ? this.galponSvc.actualizar(this.editando.id, dto)
      : this.galponSvc.crear(dto);

    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        this.messages.add({
          severity: 'success',
          summary: this.editando ? 'Galpón actualizado' : 'Galpón creado',
          detail: res.nombre
        });
        this.cancelar();
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 })
    });
  }

  eliminar(g: GalponDTO): void {
    if (!g.id) return;
    this.confirm.confirm({
      header: 'Eliminar galpón',
      message: `¿Eliminar el galpón ${g.nombre}? Solo es posible si nunca ha tenido lotes.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.galponSvc.eliminar(g.id!).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Galpón eliminado' });
            this.cargar();
          },
          error: (err) => this.messages.add({ severity: 'error', summary: 'No se eliminó', detail: mensajeError(err), life: 6000 })
        });
      }
    });
  }

  claseEstado(g: GalponDTO): string {
    return g.estado === 'OCUPADO' ? 'verde' : g.estado === 'MANTENIMIENTO' ? 'rojo' : '';
  }
}
