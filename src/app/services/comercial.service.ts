import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClienteDTO {
  idCliente: number;
  idTipoCliente: number;
  tipoCliente: string;
  documento: string;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  activo: boolean;
}

export interface RegistroClienteDTO {
  idTipoCliente: number;
  documento: string;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  activo?: boolean | null;
}

export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'ENTREGADO' | 'CANCELADO';

export interface PedidoDTO {
  idPedido: number;
  idCliente: number;
  cliente: string;
  fechaPedido: string;
  fechaEstimadaEntrega: string;
  estado: EstadoPedido;
  observaciones?: string | null;
  totalAves: number;
  lotes: string;
  idVenta?: number | null;
}

export interface LineaPedidoDTO {
  idLote: number;
  cantidadAves: number;
}

export interface VentaDTO {
  idVenta: number;
  idPedido: number;
  idCliente: number;
  cliente: string;
  fechaVenta: string;
  cantidadAves: number;
  pesoTotalLibras: number;
  precioLibra: number;
  valorTotal: number;
  pagado: number;
  saldo: number;
  fechaLimitePago: string;
  estado: 'PENDIENTE_PAGO' | 'PAGADA' | 'VENCIDA';
  vencida: boolean;
  idEntrega?: number | null;
  estadoEntrega?: string | null;
}

export interface PagoDTO {
  idPago: number;
  idVenta: number;
  fecha: string;
  monto: number;
  codigoMetodo: string;
  metodo: string;
  referenciaPasarela?: string | null;
}

export interface EntregaDTO {
  idEntrega: number;
  idVenta: number;
  cliente: string;
  idEmpleado: number;
  transportista: string;
  direccion: string;
  fechaEntrega?: string | null;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'DEVUELTO';
  observaciones?: string | null;
}

export interface CarteraVencidaDTO {
  idVenta: number;
  idCliente: number;
  cliente: string;
  fechaLimitePago: string;
  diasVencida: number;
  valorTotal: number;
  saldo: number;
}

export interface VentasClienteDTO {
  idCliente: number;
  cliente: string;
  tipoCliente: string;
  ventas: number;
  valorVendido: number;
  saldoPendiente: number;
}

export interface CheckoutPagoDTO {
  urlCheckout: string;
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
}

export interface ResultadoPagoEnLineaDTO {
  idTransaccion: string;
  estadoTransaccion: string;
  registrado: boolean;
  idVenta?: number | null;
  monto: number;
  saldo?: number | null;
  mensaje: string;
}

/** Cliente de clientes, pedidos, ventas, pagos, entregas, cartera y pago en línea. */
@Injectable({ providedIn: 'root' })
export class ComercialService {
  private readonly api = environment.api;

  constructor(private http: HttpClient) {}

  clientes(): Observable<ClienteDTO[]> {
    return this.http.get<ClienteDTO[]>(`${this.api}/clientes`);
  }

  crearCliente(dto: RegistroClienteDTO): Observable<ClienteDTO> {
    return this.http.post<ClienteDTO>(`${this.api}/clientes`, dto);
  }

  actualizarCliente(id: number, dto: RegistroClienteDTO): Observable<ClienteDTO> {
    return this.http.put<ClienteDTO>(`${this.api}/clientes/${id}`, dto);
  }

  pedidos(estado?: EstadoPedido): Observable<PedidoDTO[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<PedidoDTO[]>(`${this.api}/pedidos`, { params });
  }

  crearPedido(dto: { idCliente: number; fechaEstimadaEntrega: string; observaciones?: string | null;
                     detalle: LineaPedidoDTO[] }): Observable<PedidoDTO> {
    return this.http.post<PedidoDTO>(`${this.api}/pedidos`, dto);
  }

  confirmarPedido(id: number): Observable<PedidoDTO> {
    return this.http.patch<PedidoDTO>(`${this.api}/pedidos/${id}/confirmar`, {});
  }

  cancelarPedido(id: number): Observable<PedidoDTO> {
    return this.http.patch<PedidoDTO>(`${this.api}/pedidos/${id}/cancelar`, {});
  }

  ventas(): Observable<VentaDTO[]> {
    return this.http.get<VentaDTO[]>(`${this.api}/ventas`);
  }

  registrarVenta(dto: { idPedido: number; fechaVenta?: string | null; pesoTotalLibras: number; precioLibra: number;
                        fechaLimitePago?: string | null }): Observable<VentaDTO> {
    return this.http.post<VentaDTO>(`${this.api}/ventas`, dto);
  }

  pagos(idVenta: number): Observable<PagoDTO[]> {
    return this.http.get<PagoDTO[]>(`${this.api}/ventas/${idVenta}/pagos`);
  }

  registrarPago(idVenta: number, dto: { codigoMetodo: string; fecha?: string | null; monto: number }): Observable<VentaDTO> {
    return this.http.post<VentaDTO>(`${this.api}/ventas/${idVenta}/pagos`, dto);
  }

  entregas(): Observable<EntregaDTO[]> {
    return this.http.get<EntregaDTO[]>(`${this.api}/entregas`);
  }

  programarEntrega(idVenta: number, dto: { idEmpleado: number; direccion?: string | null;
                                           observaciones?: string | null }): Observable<EntregaDTO> {
    return this.http.post<EntregaDTO>(`${this.api}/ventas/${idVenta}/entrega`, dto);
  }

  actualizarEntrega(id: number, dto: { estado: 'ENTREGADO' | 'DEVUELTO'; fechaEntrega?: string | null;
                                       observaciones?: string | null }): Observable<EntregaDTO> {
    return this.http.patch<EntregaDTO>(`${this.api}/entregas/${id}`, dto);
  }

  carteraVencida(): Observable<CarteraVencidaDTO[]> {
    return this.http.get<CarteraVencidaDTO[]>(`${this.api}/cartera/vencida`);
  }

  marcarCarteraVencida(): Observable<{ ventasMarcadas: number }> {
    return this.http.post<{ ventasMarcadas: number }>(`${this.api}/cartera/marcar-vencidas`, {});
  }

  ventasPorCliente(): Observable<VentasClienteDTO[]> {
    return this.http.get<VentasClienteDTO[]>(`${this.api}/reportes/ventas-por-cliente`);
  }

  iniciarPagoEnLinea(idVenta: number, monto: number, urlRetorno: string): Observable<CheckoutPagoDTO> {
    return this.http.post<CheckoutPagoDTO>(`${this.api}/pagos-en-linea/ventas/${idVenta}`, { monto, urlRetorno });
  }

  confirmarPagoEnLinea(idTransaccion: string): Observable<ResultadoPagoEnLineaDTO> {
    return this.http.post<ResultadoPagoEnLineaDTO>(`${this.api}/pagos-en-linea/confirmar`, { idTransaccion });
  }
}
