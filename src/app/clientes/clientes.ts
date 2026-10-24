import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ComercialService, ClienteDTO } from '../services/comercial.service';
import { CatalogoService, CatalogoDTO } from '../services/catalogo.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/** El cliente debe tener teléfono o correo de contacto (S29). */
function conContacto(group: AbstractControl): ValidationErrors | null {
  return group.get('telefono')?.value?.trim() || group.get('correo')?.value?.trim() ? null : { sinContacto: true };
}

/** Clientes: tiendas, restaurantes y personas naturales. */
@Component({
  selector: 'app-clientes',
  standalone: false,
  templateUrl: './clientes.html'
})
export class Clientes implements OnInit {

  clientes: ClienteDTO[] = [];
  tipos: CatalogoDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';
  busqueda = '';

  mostrarFormulario = false;
  editando: ClienteDTO | null = null;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private comercialSvc: ComercialService,
    private catalogoSvc: CatalogoService,
    public auth: AuthService,
    private messages: MessageService
  ) {
    this.form = this.crearFormulario();
  }

  get puedeGestionar(): boolean {
    return this.auth.tienePermiso('cliente.gestionar');
  }

  get f() { return this.form.controls; }

  get visibles(): ClienteDTO[] {
    const q = this.busqueda.trim().toLowerCase();
    return q ? this.clientes.filter(c => `${c.nombre} ${c.documento}`.toLowerCase().includes(q)) : this.clientes;
  }

  ngOnInit(): void {
    this.catalogoSvc.obtener('tipos-cliente').subscribe({ next: t => this.tipos = t ?? [], error: () => this.tipos = [] });
    this.cargar();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      idTipoCliente: [null, Validators.required],
      documento: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      direccion: ['', Validators.maxLength(200)],
      telefono: ['', Validators.maxLength(20)],
      correo: ['', [Validators.email, Validators.maxLength(120)]],
      activo: [true]
    }, { validators: conContacto });
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.comercialSvc.clientes().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.clientes = data ?? [],
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudieron cargar los clientes.')
    });
  }

  nuevo(): void {
    this.editando = null;
    this.form = this.crearFormulario();
    this.mostrarFormulario = true;
  }

  editar(c: ClienteDTO): void {
    this.editando = c;
    this.form = this.crearFormulario();
    this.form.patchValue({ ...c, direccion: c.direccion ?? '', telefono: c.telefono ?? '', correo: c.correo ?? '' });
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
    const dto = { ...v, idTipoCliente: Number(v.idTipoCliente), direccion: vacio(v.direccion), telefono: vacio(v.telefono), correo: vacio(v.correo) };
    this.guardando = true;
    const peticion = this.editando
      ? this.comercialSvc.actualizarCliente(this.editando.idCliente, dto)
      : this.comercialSvc.crearCliente(dto);
    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        this.messages.add({ severity: 'success', summary: this.editando ? 'Cliente actualizado' : 'Cliente registrado', detail: res.nombre });
        this.cancelar();
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 })
    });
  }
}
