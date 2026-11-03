import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Proveedor de alimento, de insumos sanitarios o de ambos. */
export interface ProveedorDTO {
  idProveedor?: number;
  nit: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  suministraAlimento: boolean;
  suministraSanidad: boolean;
  activo?: boolean | null;
}

/** Cliente de /proveedores. */
@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly base = `${environment.api}/proveedores`;

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<ProveedorDTO[]> {
    return this.http.get<ProveedorDTO[]>(this.base);
  }

  crear(dto: ProveedorDTO): Observable<ProveedorDTO> {
    return this.http.post<ProveedorDTO>(this.base, dto);
  }

  actualizar(id: number, dto: ProveedorDTO): Observable<ProveedorDTO> {
    return this.http.put<ProveedorDTO>(`${this.base}/${id}`, dto);
  }
}
