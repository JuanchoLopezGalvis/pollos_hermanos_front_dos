import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MuestreoPesoDTO {
  avesPesadas: number;
  uniformidadPorcentaje: number;
}

export interface NovedadGalponDTO {
  tipo: string;
  descripcion?: string;
}

/** Seguimiento diario del crecimiento de un lote (documento de MongoDB). */
export interface SeguimientoCrecimientoDTO {
  id?: string;
  codigoLote: string;
  fecha?: string;
  edadDias?: number;
  pesoPromedioGramos?: number | null;
  temperaturaCelsius?: number | null;
  humedadRelativa?: number | null;
  observaciones?: string | null;
  muestreo?: MuestreoPesoDTO | null;
  novedades?: NovedadGalponDTO[];
}

export interface CurvaCrecimientoSemanalDTO {
  semana: number;
  pesoPromedioGramos: number;
  registros: number;
}

/** Cliente de /seguimientos. */
@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private readonly base = `${environment.api}/seguimientos`;

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<SeguimientoCrecimientoDTO[]> {
    return this.http.get<SeguimientoCrecimientoDTO[]>(this.base);
  }

  obtenerPorLote(codigoLote: string): Observable<SeguimientoCrecimientoDTO[]> {
    return this.http.get<SeguimientoCrecimientoDTO[]>(`${this.base}/lote/${encodeURIComponent(codigoLote)}`);
  }

  curvaSemanal(codigoLote: string): Observable<CurvaCrecimientoSemanalDTO[]> {
    return this.http.get<CurvaCrecimientoSemanalDTO[]>(
      `${this.base}/lote/${encodeURIComponent(codigoLote)}/curva-semanal`
    );
  }

  crear(dto: SeguimientoCrecimientoDTO): Observable<SeguimientoCrecimientoDTO> {
    return this.http.post<SeguimientoCrecimientoDTO>(this.base, dto);
  }

  actualizar(id: string, dto: SeguimientoCrecimientoDTO): Observable<SeguimientoCrecimientoDTO> {
    return this.http.put<SeguimientoCrecimientoDTO>(`${this.base}/${id}`, dto);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
