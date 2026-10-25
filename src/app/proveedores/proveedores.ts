import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ProveedorService, ProveedorDTO } from '../services/proveedor.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/** El proveedor debe suministrar alimento, insumos sanitarios o ambos. */
function suministraAlgo(group: AbstractControl): ValidationErrors | null {
  return group.get('suministraAlimento')?.value || group.get('suministraSanidad')?.value ? null : { sinSuministro: true };
}

/** Proveedores de alimento e insumos sanitarios. No se eliminan: se desactivan. */
@Component({
  selector: 'app-proveedores',
  standalone: false,
  templateUrl: './proveedores.html'
})
export class Proveedores implements OnInit {

  proveedores: ProveedorDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';

  mostrarFormulario = false;
  editando: ProveedorDTO | null = null;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private proveedorSvc: ProveedorService,
    public auth: AuthService,
    private messages: MessageService
  ) {
    this.form = this.crearFormulario();
  }

  get puedeGestionar(): boolean {
    return this.auth.tienePermiso('proveedor.gestionar');
  }

  get f() { return this.form.controls; }

  ngOnInit(): void {
    this.cargar();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      nit: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      telefono: ['', [Validators.maxLength(20)]],
      correo: ['', [Validators.email, Validators.maxLength(120)]],
      direccion: ['', [Validators.maxLength(200)]],
      suministraAlimento: [true],
      suministraSanidad: [false],
      activo: [true]
    }, { validators: suministraAlgo });
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.proveedorSvc.obtenerTodos().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.proveedores = data ?? [],
      error: (err) => {
        this.proveedores = [];
        this.errorMsg = mensajeError(err, 'No se pudieron cargar los proveedores.');
      }
    });
  }

  nuevo(): void {
    this.editando = null;
    this.form = this.crearFormulario();
    this.mostrarFormulario = true;
  }

  editar(p: ProveedorDTO): void {
    this.editando = p;
    this.form = this.crearFormulario();
    this.form.patchValue({ ...p, telefono: p.telefono ?? '', correo: p.correo ?? '', direccion: p.direccion ?? '' });
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
    const v = this.form.value;
    const vacio = (x: string) => x?.trim() || null;
    const dto: ProveedorDTO = { ...v, telefono: vacio(v.telefono), correo: vacio(v.correo), direccion: vacio(v.direccion) };
    this.guardando = true;
    const peticion = this.editando?.idProveedor
      ? this.proveedorSvc.actualizar(this.editando.idProveedor, dto)
      : this.proveedorSvc.crear(dto);
    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        this.messages.add({ severity: 'success', summary: this.editando ? 'Proveedor actualizado' : 'Proveedor registrado', detail: res.nombre });
        this.cancelar();
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 })
    });
  }
}
