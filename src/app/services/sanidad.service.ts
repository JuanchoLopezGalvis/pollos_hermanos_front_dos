import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductoSanitarioDTO {
  idProducto: number;
  nombre: string;
  tipo: 'VITAMINA' | 'MEDICAMENTO';
  presentacion: string;
  unidadMedida: string;
  idProveedor: number;
  proveedor: string;
  activo: boolean;
  costoPromedio?: number | null;
}

export interface RegistroProductoSanitarioDTO {
  nombre: string;
  tipo: string;
  presentacion: string;
  unidadMedida: string;
  idProveedor: number;
  activo?: boolean | null;
}

export interface CompraSanitariaDTO {
  idCompraSanitaria: number;
  fecha: string;
  idProducto: number;
  producto: string;
  unidadMedida: string;
  cantidad: number;
  costoUnitario: number;
  total: number;
}

export interface AplicacionSanitariaDTO {
  idAplicacion: number;
  fecha: string;
  idLote: number;
  codigoLote: string;
  idProducto: number;
  producto: string;
  unidadMedida: string;
  dosis: number;
  costoUnitario: number;
  costoTotal: number;
  idEmpleado: number;
  responsable: string;
  observaciones?: string | null;
}

/** Cliente de /sanidad. */
@Injectable({ providedIn: 'root' })
export class SanidadService {
  private readonly base = `${environment.api}/sanidad`;

  constructor(private http: HttpClient) {}

  productos(): Observable<ProductoSanitarioDTO[]> {
    return this.http.get<ProductoSanitarioDTO[]>(`${this.base}/productos`);
  }

  crearProducto(dto: RegistroProductoSanitarioDTO): Observable<ProductoSanitarioDTO> {
    return this.http.post<ProductoSanitarioDTO>(`${this.base}/productos`, dto);
  }

  actualizarProducto(id: number, dto: RegistroProductoSanitarioDTO): Observable<ProductoSanitarioDTO> {
    return this.http.put<ProductoSanitarioDTO>(`${this.base}/productos/${id}`, dto);
  }

  compras(): Observable<CompraSanitariaDTO[]> {
    return this.http.get<CompraSanitariaDTO[]>(`${this.base}/compras`);
  }

  registrarCompra(dto: { idProducto: number; fecha?: string | null; cantidad: number;
                         costoUnitario: number }): Observable<CompraSanitariaDTO> {
    return this.http.post<CompraSanitariaDTO>(`${this.base}/compras`, dto);
  }

  aplicaciones(idLote?: number): Observable<AplicacionSanitariaDTO[]> {
    const params = idLote ? new HttpParams().set('lote', idLote) : undefined;
    return this.http.get<AplicacionSanitariaDTO[]>(`${this.base}/aplicaciones`, { params });
  }

  registrarAplicacion(dto: { idLote: number; idProducto: number; idEmpleado: number; fecha?: string | null;
                             dosis: number; observaciones?: string | null }): Observable<AplicacionSanitariaDTO> {
    return this.http.post<AplicacionSanitariaDTO>(`${this.base}/aplicaciones`, dto);
  }
}
