import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Rol con los códigos de sus permisos (RolDTO). */
export interface RolDTO {
  id?: number;
  nombre: string;
  descripcion?: string;
  permisos?: string[];
}

/** Cliente de /roles. */
@Injectable({ providedIn: 'root' })
export class RolService {
  private readonly base = `${environment.api}/roles`;

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<RolDTO[]> {
    return this.http.get<RolDTO[]>(this.base);
  }

  crear(dto: RolDTO): Observable<RolDTO> {
    return this.http.post<RolDTO>(this.base, dto);
  }

  actualizar(id: number, dto: RolDTO): Observable<RolDTO> {
    return this.http.put<RolDTO>(`${this.base}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
