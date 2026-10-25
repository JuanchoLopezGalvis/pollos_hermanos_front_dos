import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService, TipoClienteDTO } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/** Las dos contraseñas deben coincidir. */
function clavesIguales(group: AbstractControl): ValidationErrors | null {
  return group.get('contrasena')?.value === group.get('confirmacion')?.value ? null : { clavesDistintas: true };
}

/**
 * Registro público de clientes. Crea la cuenta (rol Cliente, que solo entra al
 * portal) y el registro de cliente, y deja la sesión abierta en el portal.
 */
@Component({
  selector: 'app-registro',
  standalone: false,
  templateUrl: './registro.html',
  styleUrls: ['../login/login.css', './registro.css']
})
export class Registro implements OnInit {
  form: FormGroup;
  tipos: TipoClienteDTO[] = [];
  loading = false;
  errorMsg = '';
  readonly anio = new Date().getFullYear();

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      idTipoCliente: [null, Validators.required],
      documento: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      telefono: ['', Validators.maxLength(20)],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      direccion: ['', [Validators.required, Validators.maxLength(200)]],
      nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9._-]+$/)]],
      contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmacion: ['', Validators.required]
    }, { validators: clavesIguales });

    if (this.auth.isLogged()) {
      this.router.navigate([this.auth.inicio]);
    }
  }

  get f() { return this.form.controls; }

  ngOnInit(): void {
    this.auth.tiposCliente().subscribe({ next: t => this.tipos = t ?? [], error: () => this.tipos = [] });
  }

  invalido(campo: string): boolean {
    return this.f[campo].invalid && this.f[campo].touched;
  }

  onSubmit(): void {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg = 'Revisa los campos marcados.';
      return;
    }
    const v = this.form.value;
    this.loading = true;
    this.auth.registrar({
      idTipoCliente: Number(v.idTipoCliente),
      documento: v.documento.trim(),
      nombre: v.nombre.trim(),
      telefono: v.telefono?.trim() || null,
      correo: v.correo.trim(),
      direccion: v.direccion.trim(),
      nombreUsuario: v.nombreUsuario.trim(),
      contrasena: v.contrasena
    }).pipe(finalize(() => this.loading = false)).subscribe({
      next: () => this.router.navigate(['/portal']),
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudo crear la cuenta. Inténtalo de nuevo.')
    });
  }
}
