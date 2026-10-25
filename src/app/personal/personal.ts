import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PersonalService, EmpleadoDTO } from '../services/personal.service';
import { CatalogoService, CatalogoDTO } from '../services/catalogo.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';
import { hoyISO } from '../navegacion';

/**
 * Empleados de la finca. Los retirados conservan su historial y ya no se asignan
 * a nuevos registros; las beneficiadoras se registran con su propio cargo.
 */
@Component({
  selector: 'app-personal',
  standalone: false,
  templateUrl: './personal.html'
})
export class Personal implements OnInit {

  empleados: EmpleadoDTO[] = [];
  cargos: CatalogoDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';
  verRetirados = false;
  filtroCargo = '';

  mostrarFormulario = false;
  editando: EmpleadoDTO | null = null;
  form: FormGroup;

  readonly hoy = hoyISO();

  constructor(
    private fb: FormBuilder,
    private personalSvc: PersonalService,
    private catalogoSvc: CatalogoService,
    public auth: AuthService,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.crearFormulario();
  }

  get puedeGestionar(): boolean {
    return this.auth.tienePermiso('personal.gestionar');
  }

  get f() { return this.form.controls; }

  get visibles(): EmpleadoDTO[] {
    return this.empleados.filter(e =>
      (this.verRetirados || e.activo) && (!this.filtroCargo || e.codigoCargo === this.filtroCargo));
  }

  contar(codigo: string): number {
    return this.empleados.filter(e => e.activo && e.codigoCargo === codigo).length;
  }

  ngOnInit(): void {
    this.catalogoSvc.obtener('cargos').subscribe({ next: c => this.cargos = c ?? [], error: () => this.cargos = [] });
    this.cargar();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      documento: ['', [Validators.required, Validators.maxLength(20)]],
      nombres: ['', [Validators.required, Validators.maxLength(80)]],
      apellidos: ['', [Validators.required, Validators.maxLength(80)]],
      telefono: ['', [Validators.maxLength(20)]],
      idCargo: [null, [Validators.required]],
      fechaIngreso: [this.hoy, [Validators.required]]
    });
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.personalSvc.obtener().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.empleados = data ?? [],
      error: (err) => {
        this.empleados = [];
        this.errorMsg = mensajeError(err, 'No se pudo cargar el personal.');
      }
    });
  }

  nuevo(): void {
    this.editando = null;
    this.form = this.crearFormulario();
    this.mostrarFormulario = true;
  }

  editar(e: EmpleadoDTO): void {
    this.editando = e;
    this.form = this.crearFormulario();
    this.form.patchValue({ ...e, telefono: e.telefono ?? '' });
    if (!e.activo) this.f['idCargo'].disable();
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editando = null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto = { ...v, idCargo: Number(v.idCargo), telefono: v.telefono?.trim() || null };
    this.guardando = true;
    const peticion = this.editando
      ? this.personalSvc.actualizar(this.editando.idEmpleado, dto)
      : this.personalSvc.crear(dto);
    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        this.messages.add({ severity: 'success', summary: this.editando ? 'Empleado actualizado' : 'Empleado registrado',
                            detail: `${res.nombres} ${res.apellidos} · ${res.cargo}` });
        this.cancelar();
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 })
    });
  }

  retirar(e: EmpleadoDTO): void {
    this.confirm.confirm({
      header: 'Retirar empleado',
      message: `¿Retirar a ${e.nombres} ${e.apellidos}? Conserva su historial, pero ya no se le asignan registros nuevos.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Retirar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.personalSvc.retirar(e.idEmpleado).subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Empleado retirado' });
          this.cargar();
        },
        error: (err) => this.messages.add({ severity: 'error', summary: 'No se retiró', detail: mensajeError(err) })
      })
    });
  }
}
