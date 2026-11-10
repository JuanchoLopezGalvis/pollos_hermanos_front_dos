import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Un cambio registrado por los triggers de auditoría de PostgreSQL. */
export interface AuditoriaDTO {
  idAuditoria: number;
  tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  idRegistro: string | null;
  columnasCambiadas: string[] | null;
  datosAntes: Record<string, unknown> | null;
  datosDespues: Record<string, unknown> | null;
  /** null cuando lo hizo el sistema (Wompi, tarea programada, registro público). */
  usuarioApp: string | null;
  usuarioBd: string;
  idTransaccion: number;
  fecha: string;
}

/** Página de la auditoría, del cambio más reciente al más antiguo. */
export interface PaginaAuditoriaDTO {
  registros: AuditoriaDTO[];
  total: number;
  pagina: number;
  tamano: number;
}

/** Filtros de la consulta; los vacíos no se envían. */
export interface FiltroAuditoria {
  tabla?: string | null;
  operacion?: string | null;
  usuario?: string | null;
  soloSistema?: boolean;
  registro?: string | null;
  desde?: string | null;
  hasta?: string | null;
}

/** Permiso que habilita la pantalla de auditoría. */
export const PERMISO_AUDITORIA = 'auditoria.ver';

/** Operaciones auditadas, con su nombre en pantalla. */
export const OPERACIONES: Record<string, string> = {
  INSERT: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Borrado',
  TRUNCATE: 'Vaciado'
};

/** Nombres en pantalla de las tablas; las que no estén aquí se muestran tal cual. */
export const NOMBRES_TABLA: Record<string, string> = {
  aplicacion_sanitaria: 'Aplicaciones sanitarias',
  cargo: 'Cargos',
  categoria_gasto: 'Categorías de gasto',
  cliente: 'Clientes',
  compra_alimento: 'Compras de alimento',
  compra_sanitaria: 'Compras sanitarias',
  consumo_alimento: 'Consumos de alimento',
  detalle_beneficio: 'Detalle de beneficio',
  detalle_pedido: 'Detalle de pedidos',
  empleado: 'Empleados',
  entrega: 'Entregas',
  etapa_alimentacion: 'Etapas de alimentación',
  galpon: 'Galpones',
  gasto: 'Gastos',
  jornada_beneficio: 'Jornadas de beneficio',
  lote: 'Lotes',
  mensaje_restriccion: 'Mensajes de restricciones',
  metodo_pago: 'Métodos de pago',
  mortalidad: 'Mortalidad',
  otro_ingreso: 'Otros ingresos',
  pago: 'Pagos',
  pedido: 'Pedidos',
  permiso: 'Permisos',
  producto_sanitario: 'Productos sanitarios',
  proveedor: 'Proveedores',
  rol: 'Roles',
  rol_permiso: 'Permisos de roles',
  tipo_alimento: 'Tipos de alimento',
  tipo_cliente: 'Tipos de cliente',
  usuario: 'Usuarios',
  usuario_permiso: 'Permisos de usuarios',
  usuario_rol: 'Roles de usuarios',
  venta: 'Ventas'
};

/** Cliente de /auditoria (solo lectura). */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly base = `${environment.api}/auditoria`;

  constructor(private http: HttpClient) {}

  buscar(filtro: FiltroAuditoria, pagina = 0, tamano = 50): Observable<PaginaAuditoriaDTO> {
    let params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor === true) params = params.set(clave, 'true');
      else if (typeof valor === 'string' && valor.trim()) params = params.set(clave, valor.trim());
    }
    return this.http.get<PaginaAuditoriaDTO>(this.base, { params });
  }

  tablas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/tablas`);
  }
}
