import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Empleado con su cargo. */
export interface EmpleadoDTO {
  idEmpleado: number;
  documento: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  idCargo: number;
  codigoCargo: string;
  cargo: string;
  fechaIngreso: string;
  fechaRetiro?: string | null;
  activo: boolean;
}

export interface RegistroEmpleadoDTO {
  documento: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  idCargo: number;
  fechaIngreso: string;
}

/** Cliente de /empleados. */
@Injectable({ providedIn: 'root' })
export class PersonalService {
  private readonly base = `${environment.api}/empleados`;

  constructor(private http: HttpClient) {}

  obtener(soloActivos = false, cargo?: string): Observable<EmpleadoDTO[]> {
    let params = new HttpParams().set('activos', soloActivos);
    if (cargo) params = params.set('cargo', cargo);
    return this.http.get<EmpleadoDTO[]>(this.base, { params });
  }

  crear(dto: RegistroEmpleadoDTO): Observable<EmpleadoDTO> {
    return this.http.post<EmpleadoDTO>(this.base, dto);
  }

  actualizar(id: number, dto: RegistroEmpleadoDTO): Observable<EmpleadoDTO> {
    return this.http.put<EmpleadoDTO>(`${this.base}/${id}`, dto);
  }

  retirar(id: number, fechaRetiro?: string | null): Observable<EmpleadoDTO> {
    return this.http.patch<EmpleadoDTO>(`${this.base}/${id}/retiro`, { fechaRetiro: fechaRetiro || null });
  }
}
