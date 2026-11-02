import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Usuario del sistema (UsuarioDTO). La contraseña solo se envía, nunca se recibe. */
export interface UsuarioDTO {
  id?: number;
  nombreUsuario?: string;
  correo?: string;
  contrasena?: string;
  nombres?: string;
  apellidos?: string;
  activo?: boolean;
  superusuario?: boolean;
  fechaRegistro?: string;
  ultimoIngreso?: string;
  roles?: string[];
  permisos?: string[];
  permisosEfectivos?: string[];
}

/** Cliente de /usuarios. */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly base = `${environment.api}/usuarios`;

  constructor(private http: HttpClient) {}

  obtenerActual(): Observable<UsuarioDTO> {
    return this.http.get<UsuarioDTO>(`${this.base}/yo`);
  }

  obtenerTodos(): Observable<UsuarioDTO[]> {
    return this.http.get<UsuarioDTO[]>(this.base);
  }

  crear(dto: UsuarioDTO): Observable<UsuarioDTO> {
    return this.http.post<UsuarioDTO>(this.base, dto);
  }

  actualizar(id: number, dto: UsuarioDTO): Observable<UsuarioDTO> {
    return this.http.put<UsuarioDTO>(`${this.base}/${id}`, dto);
  }

  /** El backend no borra al usuario: lo deja inactivo y conserva su historial. */
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
