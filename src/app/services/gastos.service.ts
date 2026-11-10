import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GastoDTO {
  idGasto: number;
  fecha: string;
  idCategoriaGasto: number;
  categoria: string;
  idLote?: number | null;
  codigoLote?: string | null;
  monto: number;
  descripcion: string;
}

export interface JornadaBeneficioDTO {
  idJornada: number;
  fecha: string;
  idLote: number;
  codigoLote: string;
  observaciones?: string | null;
  avesBeneficiadas: number;
  beneficiadoras: number;
  costoTotal: number;
}

export interface DetalleBeneficioDTO {
  idJornada: number;
  idEmpleado: number;
  beneficiadora: string;
  avesBeneficiadas: number;
  tarifaPorAve: number;
  pago: number;
}

export interface LineaBeneficioDTO {
  idEmpleado: number;
  avesBeneficiadas: number;
  tarifaPorAve: number;
}

export interface OtroIngresoDTO {
  idOtroIngreso: number;
  fecha: string;
  idLote: number;
  codigoLote: string;
  monto: number;
  descripcion: string;
}

/** Balance económico de un lote (v_rentabilidad_lote). */
export interface RentabilidadLoteDTO {
  idLote: number;
  codigo: string;
  estado: string;
  costoPollitos: number;
  costoAlimento: number;
  costoSanidad: number;
  costoBeneficio: number;
  otrosGastos: number;
  costoTotal: number;
  avesVendidas: number;
  librasVendidas: number;
  pesoPromedioLibras?: number | null;
  ingresoVentas: number;
  otrosIngresos: number;
  ingresoTotal: number;
  ganancia: number;
  costoPorAveVendida?: number | null;
  costoPorLibra?: number | null;
  precioPromedioLibra?: number | null;
  margenPorcentaje?: number | null;
}

/** Cliente de gastos, beneficio, otros ingresos y balance. */
@Injectable({ providedIn: 'root' })
export class GastosService {
  private readonly api = environment.api;

  constructor(private http: HttpClient) {}

  private porLote(idLote?: number): HttpParams | undefined {
    return idLote ? new HttpParams().set('lote', idLote) : undefined;
  }

  gastos(idLote?: number): Observable<GastoDTO[]> {
    return this.http.get<GastoDTO[]>(`${this.api}/gastos`, { params: this.porLote(idLote) });
  }

  registrarGasto(dto: { idCategoriaGasto: number; idLote?: number | null; fecha?: string | null;
                        monto: number; descripcion: string }): Observable<GastoDTO> {
    return this.http.post<GastoDTO>(`${this.api}/gastos`, dto);
  }

  jornadas(idLote?: number): Observable<JornadaBeneficioDTO[]> {
    return this.http.get<JornadaBeneficioDTO[]>(`${this.api}/beneficio/jornadas`, { params: this.porLote(idLote) });
  }

  detalleJornada(id: number): Observable<DetalleBeneficioDTO[]> {
    return this.http.get<DetalleBeneficioDTO[]>(`${this.api}/beneficio/jornadas/${id}/detalle`);
  }

  registrarJornada(dto: { idLote: number; fecha?: string | null; observaciones?: string | null;
                          detalle: LineaBeneficioDTO[] }): Observable<JornadaBeneficioDTO> {
    return this.http.post<JornadaBeneficioDTO>(`${this.api}/beneficio/jornadas`, dto);
  }

  otrosIngresos(idLote?: number): Observable<OtroIngresoDTO[]> {
    return this.http.get<OtroIngresoDTO[]>(`${this.api}/ingresos`, { params: this.porLote(idLote) });
  }

  registrarOtroIngreso(dto: { idLote: number; fecha?: string | null; monto: number;
                              descripcion: string }): Observable<OtroIngresoDTO> {
    return this.http.post<OtroIngresoDTO>(`${this.api}/ingresos`, dto);
  }

  balance(): Observable<RentabilidadLoteDTO[]> {
    return this.http.get<RentabilidadLoteDTO[]>(`${this.api}/costos/lotes`);
  }

  balanceLote(idLote: number): Observable<RentabilidadLoteDTO> {
    return this.http.get<RentabilidadLoteDTO>(`${this.api}/costos/lotes/${idLote}`);
  }
}
