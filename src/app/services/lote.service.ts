import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type EstadoLote = 'EN_ENGORDE' | 'LISTO_PARA_VENTA' | 'VENDIDO' | 'CERRADO';

/** Lote con sus cifras calculadas en PostgreSQL (vista v_lote_resumen). */
export interface LoteDTO {
  id: number;
  codigo: string;
  idGalpon: number;
  galpon: string;
  fechaIngreso: string;
  cantidadInicial: number;
  costoPollito: number;
  costoPollitos: number;
  fechaEstimadaVenta: string;
  estado: EstadoLote;
  edadDias: number;
  mortalidadAcumulada: number;
  porcentajeMortalidad: number;
  avesDisponibles: number;
  alertaMortalidad: boolean;
  avesVendidas: number;
  consumoAlimentoBultos: number;
  consumoAlimentoKg: number;
}

/** Datos para registrar un lote con sp_registrar_lote. */
export interface RegistroLoteDTO {
  codigo: string;
  idGalpon: number;
  fechaIngreso: string;
  cantidadInicial: number;
  costoPollito: number;
  fechaEstimadaVenta?: string | null;
}

/** Datos corregibles de un lote. */
export interface ActualizacionLoteDTO {
  cantidadInicial: number;
  costoPollito: number;
  fechaEstimadaVenta: string;
}

/** Registro de mortalidad de un día. */
export interface MortalidadDTO {
  id?: number;
  fecha?: string | null;
  cantidad: number;
  causa?: string | null;
}

/** Respuesta de sp_registrar_mortalidad. */
export interface MortalidadRegistradaDTO {
  idMortalidad: number;
  porcentajeMortalidad: number;
  alerta: boolean;
}

/** Nombres en español de los estados del lote. */
export const ESTADOS_LOTE: Record<EstadoLote, string> = {
  EN_ENGORDE: 'En engorde',
  LISTO_PARA_VENTA: 'Listo para venta',
  VENDIDO: 'Vendido',
  CERRADO: 'Cerrado'
};

/**
 * Transiciones que se ofrecen en la interfaz. PostgreSQL es quien decide: si una
 * transición no procede (por ejemplo, cerrar un lote con aves), la rechaza con un mensaje.
 */
export const SIGUIENTES_ESTADOS: Record<EstadoLote, EstadoLote[]> = {
  EN_ENGORDE: ['LISTO_PARA_VENTA', 'CERRADO'],
  LISTO_PARA_VENTA: ['VENDIDO', 'CERRADO'],
  VENDIDO: ['CERRADO'],
  CERRADO: []
};

/** Cliente de /lotes. */
@Injectable({ providedIn: 'root' })
export class LoteService {
  private readonly base = `${environment.api}/lotes`;

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<LoteDTO[]> {
    return this.http.get<LoteDTO[]>(this.base);
  }

  crear(dto: RegistroLoteDTO): Observable<LoteDTO> {
    return this.http.post<LoteDTO>(this.base, dto);
  }

  actualizar(id: number, dto: ActualizacionLoteDTO): Observable<LoteDTO> {
    return this.http.put<LoteDTO>(`${this.base}/${id}`, dto);
  }

  cambiarEstado(id: number, estado: EstadoLote): Observable<LoteDTO> {
    return this.http.patch<LoteDTO>(`${this.base}/${id}/estado`, { estado });
  }

  obtenerMortalidad(id: number): Observable<MortalidadDTO[]> {
    return this.http.get<MortalidadDTO[]>(`${this.base}/${id}/mortalidad`);
  }

  registrarMortalidad(id: number, dto: MortalidadDTO): Observable<MortalidadRegistradaDTO> {
    return this.http.post<MortalidadRegistradaDTO>(`${this.base}/${id}/mortalidad`, dto);
  }

  actualizarMortalidad(id: number, idMortalidad: number, dto: MortalidadDTO): Observable<LoteDTO> {
    return this.http.put<LoteDTO>(`${this.base}/${id}/mortalidad/${idMortalidad}`, dto);
  }
}
