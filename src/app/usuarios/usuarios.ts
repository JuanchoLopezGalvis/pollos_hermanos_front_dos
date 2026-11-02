import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UsuarioService, UsuarioDTO } from '../services/usuario.service';
import { RolService } from '../services/rol.service';
import { PermisoService, PermisoDTO } from '../services/permiso.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/** Administración de usuarios, sus roles y sus permisos directos. */
@Component({
  selector: 'app-usuarios',
  standalone: false,
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class Usuarios implements OnInit {

  usuarios: UsuarioDTO[] = [];
  rolesDisponibles: string[] = [];
  permisosDisponibles: PermisoDTO[] = [];
  rolesNoVisibles = false;

  loading = false;
  guardando = false;
  errorMsg = '';
  busqueda = '';

  mostrarFormulario = false;
  editandoId: number | null = null;
  rolesSeleccionados = new Set<string>();
  permisosSeleccionados = new Set<string>();
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private usuarioSvc: UsuarioService,
    private rolSvc: RolService,
    private permisoSvc: PermisoService,
    public auth: AuthService,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.crearFormulario(false);
  }

  get f() { return this.form.controls; }

  get filtrados(): UsuarioDTO[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.usuarios;
    return this.usuarios.filter(u =>
      [u.nombreUsuario, u.correo, u.nombres, u.apellidos].some(c => (c ?? '').toLowerCase().includes(q))
    );
  }

  ngOnInit(): void {
    this.cargar();
    this.rolSvc.obtenerTodos().subscribe({
      next: (roles) => this.rolesDisponibles = (roles ?? []).map(r => r.nombre),
      error: () => this.rolesNoVisibles = true
    });
    this.permisoSvc.obtenerTodos().subscribe({
      next: (permisos) => this.permisosDisponibles = permisos ?? [],
      error: () => this.permisosDisponibles = []
    });
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.usuarioSvc.obtenerTodos().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.usuarios = data ?? [],
      error: (err) => {
        this.usuarios = [];
        this.errorMsg = mensajeError(err, 'No se pudieron cargar los usuarios.');
      }
    });
  }

  /** En la edición la contraseña es opcional: si queda vacía no se cambia. */
  private crearFormulario(edicion: boolean): FormGroup {
    const contrasena = edicion
      ? [Validators.minLength(8), Validators.maxLength(72)]
      : [Validators.required, Validators.minLength(8), Validators.maxLength(72)];
    return this.fb.group({
      nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      contrasena: ['', contrasena],
      nombres: ['', [Validators.maxLength(80)]],
      apellidos: ['', [Validators.maxLength(80)]],
      activo: [true],
      superusuario: [false]
    });
  }

  nuevo(): void {
    this.editandoId = null;
    this.form = this.crearFormulario(false);
    this.rolesSeleccionados = new Set();
    this.permisosSeleccionados = new Set();
    this.mostrarFormulario = true;
  }

  editar(u: UsuarioDTO): void {
    this.editandoId = u.id ?? null;
    this.form = this.crearFormulario(true);
    this.form.patchValue({
      nombreUsuario: u.nombreUsuario ?? '',
      correo: u.correo ?? '',
      nombres: u.nombres ?? '',
      apellidos: u.apellidos ?? '',
      activo: u.activo ?? true,
      superusuario: u.superusuario ?? false
    });
    this.rolesSeleccionados = new Set(u.roles ?? []);
    this.permisosSeleccionados = new Set(u.permisos ?? []);
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  alternar(conjunto: Set<string>, valor: string): void {
    if (conjunto.has(valor)) {
      conjunto.delete(valor);
    } else {
      conjunto.add(valor);
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const dto: UsuarioDTO = {
      nombreUsuario: v.nombreUsuario.trim(),
      correo: v.correo.trim().toLowerCase(),
      nombres: v.nombres?.trim() || undefined,
      apellidos: v.apellidos?.trim() || undefined,
      activo: v.activo,
      roles: [...this.rolesSeleccionados],
      permisos: [...this.permisosSeleccionados]
    };
    if (v.contrasena) dto.contrasena = v.contrasena;
    // El backend solo deja cambiar esta marca a un superusuario.
    if (this.auth.esSuperusuario) dto.superusuario = v.superusuario;
    // Si no se pudieron leer los roles, no se envían para no borrar los actuales.
    if (this.rolesNoVisibles) delete dto.roles;

    this.guardando = true;
    const peticion = this.editandoId
      ? this.usuarioSvc.actualizar(this.editandoId, dto)
      : this.usuarioSvc.crear(dto);

    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        this.messages.add({
          severity: 'success',
          summary: this.editandoId ? 'Usuario actualizado' : 'Usuario creado',
          detail: res.nombreUsuario
        });
        this.mostrarFormulario = false;
        this.editandoId = null;
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se guardó', detail: mensajeError(err), life: 6000 })
    });
  }

  desactivar(u: UsuarioDTO): void {
    if (!u.id) return;
    this.confirm.confirm({
      header: 'Desactivar usuario',
      message: `¿Desactivar a ${u.nombreUsuario}? Conservará su historial, pero no podrá iniciar sesión.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.usuarioSvc.desactivar(u.id!).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Usuario desactivado' });
            this.cargar();
          },
          error: (err) => this.messages.add({ severity: 'error', summary: 'No se desactivó', detail: mensajeError(err) })
        });
      }
    });
  }

  nombreCompleto(u: UsuarioDTO): string {
    return [u.nombres, u.apellidos].filter(Boolean).join(' ') || '-';
  }
}
