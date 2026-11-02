import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { RolService, RolDTO } from '../services/rol.service';
import { PermisoService, PermisoDTO } from '../services/permiso.service';
import { mensajeError } from '../services/error-api';

/** Roles del sistema y los permisos que agrupan. */
@Component({
  selector: 'app-roles',
  standalone: false,
  templateUrl: './roles.html',
  styleUrls: ['./roles.css']
})
export class Roles implements OnInit {

  roles: RolDTO[] = [];
  permisosDisponibles: PermisoDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';

  mostrarFormulario = false;
  editandoId: number | null = null;
  permisosSeleccionados = new Set<string>();
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private rolSvc: RolService,
    private permisoSvc: PermisoService,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.crearFormulario();
  }

  get f() { return this.form.controls; }

  ngOnInit(): void {
    this.cargar();
    this.permisoSvc.obtenerTodos().subscribe({
      next: (data) => this.permisosDisponibles = data ?? [],
      error: () => this.permisosDisponibles = []
    });
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(60)]],
      descripcion: ['', [Validators.maxLength(200)]]
    });
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.rolSvc.obtenerTodos().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.roles = data ?? [],
      error: (err) => {
        this.roles = [];
        this.errorMsg = mensajeError(err, 'No se pudieron cargar los roles.');
      }
    });
  }

  nuevo(): void {
    this.editandoId = null;
    this.form = this.crearFormulario();
    this.permisosSeleccionados = new Set();
    this.mostrarFormulario = true;
  }

  editar(r: RolDTO): void {
    this.editandoId = r.id ?? null;
    this.form = this.crearFormulario();
    this.form.patchValue({ nombre: r.nombre, descripcion: r.descripcion ?? '' });
    this.permisosSeleccionados = new Set(r.permisos ?? []);
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  alternar(codigo: string): void {
    if (this.permisosSeleccionados.has(codigo)) {
      this.permisosSeleccionados.delete(codigo);
    } else {
      this.permisosSeleccionados.add(codigo);
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto: RolDTO = {
      nombre: this.form.value.nombre.trim(),
      descripcion: this.form.value.descripcion?.trim() || undefined,
      permisos: [...this.permisosSeleccionados]
    };

    this.guardando = true;
    const peticion = this.editandoId
      ? this.rolSvc.actualizar(this.editandoId, dto)
      : this.rolSvc.crear(dto);

    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        this.messages.add({ severity: 'success', summary: this.editandoId ? 'Rol actualizado' : 'Rol creado', detail: res.nombre });
        this.mostrarFormulario = false;
        this.editandoId = null;
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 })
    });
  }

  eliminar(r: RolDTO): void {
    if (!r.id) return;
    this.confirm.confirm({
      header: 'Eliminar rol',
      message: `¿Eliminar el rol ${r.nombre}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.rolSvc.eliminar(r.id!).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Rol eliminado' });
            this.cargar();
          },
          error: (err) => this.messages.add({ severity: 'error', summary: 'No se eliminó', detail: mensajeError(err) })
        });
      }
    });
  }
}
