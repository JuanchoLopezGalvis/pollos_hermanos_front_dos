import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Permiso con la forma modulo.accion (PermisoDTO). */
export interface PermisoDTO {
  id?: number;
  codigo: string;
  descripcion?: string;
}

/** Cliente de /permisos. Crear, editar y eliminar es solo para superusuarios. */
@Injectable({ providedIn: 'root' })
export class PermisoService {
  private readonly base = `${environment.api}/permisos`;

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<PermisoDTO[]> {
    return this.http.get<PermisoDTO[]>(this.base);
  }

  crear(dto: PermisoDTO): Observable<PermisoDTO> {
    return this.http.post<PermisoDTO>(this.base, dto);
  }

  actualizar(id: number, dto: PermisoDTO): Observable<PermisoDTO> {
    return this.http.put<PermisoDTO>(`${this.base}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
