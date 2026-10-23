import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';

/** Cuerpo de POST /auth/login. El campo usuario acepta el nombre de usuario o el correo. */
export interface LoginRequest {
  usuario: string;
  contrasena: string;
}

/** Respuesta del backend (TokenDTO). */
export interface LoginResponse {
  token: string;
  tipo: string;
  nombreUsuario: string;
  nombreCompleto: string;
  superusuario: boolean;
  permisos: string[];
}

/** Datos del usuario que se guardan en el navegador mientras dura la sesión. */
export type UserSession = {
  nombreUsuario: string;
  nombreCompleto: string;
  superusuario: boolean;
  permisos: string[];
};

/**
 * Inicio y cierre de sesión con JWT. El token y los permisos se guardan en localStorage
 * para que el interceptor los envíe y el menú muestre solo los módulos permitidos.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.api}/auth`;
  private readonly TOKEN_KEY = 'ph.token';
  private readonly USER_KEY = 'ph.user';

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    const body: LoginRequest = {
      usuario: (data?.usuario ?? '').trim(),
      contrasena: data?.contrasena ?? ''
    };

    return this.http.post<LoginResponse>(`${this.base}/login`, body).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  saveSession(res: LoginResponse): void {
    if (!res?.token) return;

    localStorage.setItem(this.TOKEN_KEY, res.token);

    const user: UserSession = {
      nombreUsuario: res.nombreUsuario ?? '',
      nombreCompleto: res.nombreCompleto ?? '',
      superusuario: !!res.superusuario,
      permisos: Array.isArray(res.permisos) ? res.permisos : []
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get user(): UserSession | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  }

  isLogged(): boolean {
    return !!this.token;
  }

  get esSuperusuario(): boolean {
    return !!this.user?.superusuario;
  }

  /** Igual que EvaluadorPermisos del backend: el superusuario tiene todos los permisos. */
  tienePermiso(codigo: string): boolean {
    const u = this.user;
    if (!u) return false;
    return u.superusuario || u.permisos.includes(codigo);
  }

  tieneAlguno(codigos: string[]): boolean {
    return codigos.some(c => this.tienePermiso(c));
  }

  /** Nombre para mostrar en la interfaz. */
  get nombreVisible(): string {
    const u = this.user;
    return u?.nombreCompleto?.trim() || u?.nombreUsuario || 'Usuario';
  }
}
