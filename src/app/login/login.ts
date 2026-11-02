import { Component } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService, LoginRequest } from '../services/auth.service';
import { mensajeError } from '../services/error-api';

/** Pantalla de inicio de sesión con nombre de usuario o correo. */
@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  form: FormGroup;
  loading = false;
  errorMsg = '';
  readonly anio = new Date().getFullYear();

  private REMEMBER_KEY = 'ph.remember.usuario';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const remembered = localStorage.getItem(this.REMEMBER_KEY) || '';
    this.form = this.fb.group({
      usuario: [remembered, [Validators.required, Validators.maxLength(120)]],
      contrasena: ['', [Validators.required, Validators.maxLength(72)]],
      remember: [!!remembered]
    });

    if (this.auth.isLogged()) {
      this.router.navigate([this.auth.inicio]);
    }
  }

  get f() { return this.form.controls; }

  onSubmit(e?: Event) {
    e?.preventDefault();
    this.errorMsg = '';

    if (this.form.invalid) {
      this.errorMsg = 'Escribe tu usuario y tu contraseña.';
      this.form.markAllAsTouched();
      return;
    }

    const payload: LoginRequest = {
      usuario: this.f['usuario'].value.trim(),
      contrasena: this.f['contrasena'].value
    };

    if (this.f['remember'].value) {
      localStorage.setItem(this.REMEMBER_KEY, payload.usuario);
    } else {
      localStorage.removeItem(this.REMEMBER_KEY);
    }

    this.loading = true;

    this.auth.login(payload)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigateByUrl(returnUrl || this.auth.inicio);
        },
        error: (err) => {
          this.errorMsg = mensajeError(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.');
          this.f['contrasena'].reset();
        }
      });
  }
}
