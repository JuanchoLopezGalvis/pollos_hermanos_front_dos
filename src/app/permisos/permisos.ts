import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PermisoService, PermisoDTO } from '../services/permiso.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/** Catálogo de permisos. Todos lo consultan; solo el superusuario lo modifica. */
@Component({
  selector: 'app-permisos',
  standalone: false,
  templateUrl: './permisos.html',
  styleUrls: ['./permisos.css']
})
export class Permisos implements OnInit {

  permisos: PermisoDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';

  mostrarFormulario = false;
  editandoId: number | null = null;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private permisoSvc: PermisoService,
    public auth: AuthService,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.crearFormulario();
  }

  get f() { return this.form.controls; }

  ngOnInit(): void {
    this.cargar();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/^[a-z_]+\.[a-z_]+$/)]],
      descripcion: ['', [Validators.maxLength(200)]]
    });
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.permisoSvc.obtenerTodos().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.permisos = [...(data ?? [])].sort((a, b) => a.codigo.localeCompare(b.codigo)),
      error: (err) => {
        this.permisos = [];
        this.errorMsg = mensajeError(err, 'No se pudieron cargar los permisos.');
      }
    });
  }

  nuevo(): void {
    this.editandoId = null;
    this.form = this.crearFormulario();
    this.mostrarFormulario = true;
  }

  editar(p: PermisoDTO): void {
    this.editandoId = p.id ?? null;
    this.form = this.crearFormulario();
    this.form.patchValue({ codigo: p.codigo, descripcion: p.descripcion ?? '' });
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto: PermisoDTO = {
      codigo: this.form.value.codigo.trim(),
      descripcion: this.form.value.descripcion?.trim() || undefined
    };

    this.guardando = true;
    const peticion = this.editandoId
      ? this.permisoSvc.actualizar(this.editandoId, dto)
      : this.permisoSvc.crear(dto);

    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        this.messages.add({ severity: 'success', summary: this.editandoId ? 'Permiso actualizado' : 'Permiso creado', detail: res.codigo });
        this.mostrarFormulario = false;
        this.editandoId = null;
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 })
    });
  }

  eliminar(p: PermisoDTO): void {
    if (!p.id) return;
    this.confirm.confirm({
      header: 'Eliminar permiso',
      message: `¿Eliminar el permiso ${p.codigo}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.permisoSvc.eliminar(p.id!).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Permiso eliminado' });
            this.cargar();
          },
          error: (err) => this.messages.add({ severity: 'error', summary: 'No se eliminó', detail: mensajeError(err) })
        });
      }
    });
  }
}
