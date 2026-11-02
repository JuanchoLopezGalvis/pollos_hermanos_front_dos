import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Tipo de alimento con su inventario. */
export interface InventarioAlimentoDTO {
  idTipoAlimento: number;
  nombre: string;
  etapa: string;
  diaInicio: number;
  diaFin?: number | null;
  pesoBultoKg: number;
  activo: boolean;
  bultosComprados: number;
  bultosConsumidos: number;
  bultosDisponibles: number;
  costoPromedio?: number | null;
}

export interface EtapaAlimentacionDTO {
  idEtapa: number;
  nombre: string;
  orden: number;
  diaInicio: number;
  diaFin?: number | null;
}

export interface CompraAlimentoDTO {
  idCompraAlimento: number;
  fecha: string;
  idProveedor: number;
  proveedor: string;
  idTipoAlimento: number;
  tipoAlimento: string;
  cantidadBultos: number;
  costoUnitario: number;
  total: number;
}

export interface ConsumoAlimentoDTO {
  idConsumoAlimento: number;
  fecha: string;
  idLote: number;
  codigoLote: string;
  edadDias: number;
  idTipoAlimento: number;
  tipoAlimento: string;
  cantidadBultos: number;
  costoUnitario: number;
  costoTotal: number;
}

/** Cliente de /alimentacion. */
@Injectable({ providedIn: 'root' })
export class AlimentacionService {
  private readonly base = `${environment.api}/alimentacion`;

  constructor(private http: HttpClient) {}

  etapas(): Observable<EtapaAlimentacionDTO[]> {
    return this.http.get<EtapaAlimentacionDTO[]>(`${this.base}/etapas`);
  }

  inventario(): Observable<InventarioAlimentoDTO[]> {
    return this.http.get<InventarioAlimentoDTO[]>(`${this.base}/inventario`);
  }

  crearTipo(dto: { nombre: string; idEtapa: number; pesoBultoKg?: number | null }): Observable<InventarioAlimentoDTO> {
    return this.http.post<InventarioAlimentoDTO>(`${this.base}/tipos`, dto);
  }

  compras(): Observable<CompraAlimentoDTO[]> {
    return this.http.get<CompraAlimentoDTO[]>(`${this.base}/compras`);
  }

  registrarCompra(dto: { idProveedor: number; idTipoAlimento: number; fecha?: string | null;
                         cantidadBultos: number; costoUnitario: number }): Observable<CompraAlimentoDTO> {
    return this.http.post<CompraAlimentoDTO>(`${this.base}/compras`, dto);
  }

  consumos(idLote?: number): Observable<ConsumoAlimentoDTO[]> {
    const params = idLote ? new HttpParams().set('lote', idLote) : undefined;
    return this.http.get<ConsumoAlimentoDTO[]>(`${this.base}/consumos`, { params });
  }

  registrarConsumo(dto: { idLote: number; idTipoAlimento: number; fecha?: string | null;
                          cantidadBultos: number }): Observable<ConsumoAlimentoDTO> {
    return this.http.post<ConsumoAlimentoDTO>(`${this.base}/consumos`, dto);
  }
}
