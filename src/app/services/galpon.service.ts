import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type EstadoGalpon = 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';

/** Galpón de la finca. */
export interface GalponDTO {
  id?: number;
  nombre: string;
  capacidadMaxima: number;
  estado?: EstadoGalpon;
}

/** Ocupación de un galpón: varios lotes comparten su capacidad. */
export interface GalponOcupacionDTO {
  idGalpon: number;
  nombre: string;
  capacidadMaxima: number;
  estado: EstadoGalpon;
  lotesActivos: number;
  avesAlojadas: number;
  capacidadLibre: number;
  proximaSalida?: string | null;
}

/** Nombres en español de los estados del galpón. */
export const ESTADOS_GALPON: Record<EstadoGalpon, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADO: 'Ocupado',
  MANTENIMIENTO: 'En mantenimiento'
};

/** Cliente de /galpones. */
@Injectable({ providedIn: 'root' })
export class GalponService {
  private readonly base = `${environment.api}/galpones`;

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<GalponDTO[]> {
    return this.http.get<GalponDTO[]>(this.base);
  }

  ocupacion(): Observable<GalponOcupacionDTO[]> {
    return this.http.get<GalponOcupacionDTO[]>(`${this.base}/ocupacion`);
  }

  crear(dto: GalponDTO): Observable<GalponDTO> {
    return this.http.post<GalponDTO>(this.base, dto);
  }

  actualizar(id: number, dto: GalponDTO): Observable<GalponDTO> {
    return this.http.put<GalponDTO>(`${this.base}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
