import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ComercialService, ClienteDTO } from '../services/comercial.service';
import { CatalogoService, CatalogoDTO } from '../services/catalogo.service';
import { AuthService } from '../services/auth.service';
import { PATRON_DOCUMENTO, PATRON_TELEFONO } from '../services/validaciones';
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

  /** Cliente al que se le está creando la cuenta del portal. */
  conCuentaNueva: ClienteDTO | null = null;
  formCuenta: FormGroup;
  creandoCuenta = false;

  constructor(
    private fb: FormBuilder,
    private comercialSvc: ComercialService,
    private catalogoSvc: CatalogoService,
    public auth: AuthService,
    private messages: MessageService
  ) {
    this.form = this.crearFormulario();
    this.formCuenta = this.crearFormularioCuenta();
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
      documento: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(PATRON_DOCUMENTO)]],
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      direccion: ['', Validators.maxLength(200)],
      telefono: ['', [Validators.maxLength(20), Validators.pattern(PATRON_TELEFONO)]],
      correo: ['', [Validators.email, Validators.maxLength(120)]],
      activo: [true]
    }, { validators: conContacto });
  }

  private crearFormularioCuenta(correo: string | null = null): FormGroup {
    return this.fb.group({
      nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9._-]+$/)]],
      contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      correo: [correo ?? '', [Validators.required, Validators.email, Validators.maxLength(120)]]
    });
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
    this.conCuentaNueva = null;
    this.editando = null;
    this.form = this.crearFormulario();
    this.mostrarFormulario = true;
  }

  editar(c: ClienteDTO): void {
    this.conCuentaNueva = null;
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
    const dto = { ...v, documento: v.documento.trim(), idTipoCliente: Number(v.idTipoCliente), direccion: vacio(v.direccion), telefono: vacio(v.telefono), correo: vacio(v.correo) };
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

  /** Abre el formulario para crear la cuenta del portal de un cliente ya registrado (D25). */
  nuevaCuenta(c: ClienteDTO): void {
    this.cancelar();
    this.conCuentaNueva = c;
    this.formCuenta = this.crearFormularioCuenta(c.correo ?? null);
  }

  cancelarCuenta(): void {
    this.conCuentaNueva = null;
  }

  crearCuenta(): void {
    const c = this.conCuentaNueva;
    if (!c) return;
    if (this.formCuenta.invalid) {
      this.formCuenta.markAllAsTouched();
      return;
    }
    const v = this.formCuenta.value;
    this.creandoCuenta = true;
    this.comercialSvc.crearCuentaCliente(c.idCliente, {
      nombreUsuario: v.nombreUsuario.trim(), contrasena: v.contrasena, correo: v.correo.trim()
    }).pipe(finalize(() => this.creandoCuenta = false)).subscribe({
      next: (res) => {
        this.messages.add({
          severity: 'success', summary: 'Cuenta creada',
          detail: `${res.nombre} ya puede entrar al portal con el usuario ${res.usuario}.`, life: 6000
        });
        this.conCuentaNueva = null;
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se creó la cuenta', detail: mensajeError(err), life: 6000 })
    });
  }
}
