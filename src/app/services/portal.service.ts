import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CheckoutPagoDTO, ClienteDTO, PagoDTO, PedidoDTO, ResultadoPagoEnLineaDTO, VentaDTO
} from './comercial.service';

export interface DisponibilidadDTO {
  avesDisponibles: number;
}

/** Pedido que hace el cliente: solo la cantidad; los lotes los elige el sistema. */
export interface PedidoClienteDTO {
  cantidadAves: number;
  fechaEstimadaEntrega: string;
  observaciones?: string | null;
}

/** Cliente del portal: todo lo que devuelve es del cliente que inició sesión. */
@Injectable({ providedIn: 'root' })
export class PortalService {
  private readonly base = `${environment.api}/portal`;

  constructor(private http: HttpClient) {}

  perfil(): Observable<ClienteDTO> {
    return this.http.get<ClienteDTO>(`${this.base}/perfil`);
  }

  disponibilidad(): Observable<DisponibilidadDTO> {
    return this.http.get<DisponibilidadDTO>(`${this.base}/disponibilidad`);
  }

  pedidos(): Observable<PedidoDTO[]> {
    return this.http.get<PedidoDTO[]>(`${this.base}/pedidos`);
  }

  crearPedido(dto: PedidoClienteDTO): Observable<PedidoDTO> {
    return this.http.post<PedidoDTO>(`${this.base}/pedidos`, dto);
  }

  cancelarPedido(id: number): Observable<PedidoDTO> {
    return this.http.post<PedidoDTO>(`${this.base}/pedidos/${id}/cancelar`, {});
  }

  ventas(): Observable<VentaDTO[]> {
    return this.http.get<VentaDTO[]>(`${this.base}/ventas`);
  }

  pagos(idVenta: number): Observable<PagoDTO[]> {
    return this.http.get<PagoDTO[]>(`${this.base}/ventas/${idVenta}/pagos`);
  }

  /** Todos los pagos del cliente, en todas sus compras, del más reciente al más antiguo. */
  historialPagos(): Observable<PagoDTO[]> {
    return this.http.get<PagoDTO[]>(`${this.base}/pagos`);
  }

  iniciarPago(idVenta: number, monto: number, urlRetorno: string): Observable<CheckoutPagoDTO> {
    return this.http.post<CheckoutPagoDTO>(`${this.base}/ventas/${idVenta}/pago-en-linea`, { monto, urlRetorno });
  }

  confirmarPago(idTransaccion: string): Observable<ResultadoPagoEnLineaDTO> {
    return this.http.post<ResultadoPagoEnLineaDTO>(`${this.base}/pagos-en-linea/confirmar`, { idTransaccion });
  }
}
