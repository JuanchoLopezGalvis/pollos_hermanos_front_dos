/** Módulo de la aplicación, con su ruta y los permisos que lo habilitan. */
export interface ModuloApp {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  permisos: string[];
}

/** Grupo de módulos en la barra lateral. */
export interface SeccionApp {
  titulo: string;
  modulos: ModuloApp[];
}

/**
 * Módulos de la aplicación agrupados por sección. La barra lateral, el inicio y
 * las rutas usan esta misma lista para que los permisos coincidan.
 */
export const SECCIONES: SeccionApp[] = [
  {
    titulo: 'Producción',
    modulos: [
      { titulo: 'Panel del galpón', descripcion: 'Lotes activos por galpón, próximas salidas y ganancias acumuladas.',
        icono: 'pi pi-th-large', ruta: '/panel', permisos: ['lote.ver', 'lote.gestionar', 'galpon.ver', 'galpon.gestionar', 'costo.ver'] },
      { titulo: 'Lotes y mortalidad', descripcion: 'Ingreso escalonado de lotes, mortalidad diaria con alerta del 5 % y estados.',
        icono: 'pi pi-home', ruta: '/lotes', permisos: ['lote.ver', 'lote.gestionar', 'mortalidad.registrar', 'seguimiento.registrar'] },
      { titulo: 'Galpones', descripcion: 'Capacidad compartida por varios lotes y ocupación de cada galpón.',
        icono: 'pi pi-building', ruta: '/galpones', permisos: ['galpon.ver', 'galpon.gestionar', 'lote.gestionar'] },
      { titulo: 'Seguimiento del crecimiento', descripcion: 'Peso promedio, observaciones y novedades diarias de cada lote (MongoDB).',
        icono: 'pi pi-chart-line', ruta: '/seguimiento', permisos: ['seguimiento.ver', 'seguimiento.registrar'] }
    ]
  },
  {
    titulo: 'Insumos y costos',
    modulos: [
      { titulo: 'Alimentación', descripcion: 'Compras por bultos, inventario y consumo de cada lote según su etapa.',
        icono: 'pi pi-box', ruta: '/alimentacion', permisos: ['alimentacion.ver', 'alimentacion.registrar'] },
      { titulo: 'Sanidad', descripcion: 'Vitaminas de la primera semana y medicamentos aplicados por lote.',
        icono: 'pi pi-heart', ruta: '/sanidad', permisos: ['sanidad.ver', 'sanidad.registrar'] },
      { titulo: 'Gastos y beneficio', descripcion: 'Gastos del lote o de la finca, jornadas de beneficio y otros ingresos.',
        icono: 'pi pi-receipt', ruta: '/gastos', permisos: ['gasto.registrar', 'beneficio.registrar', 'venta.gestionar', 'costo.ver'] },
      { titulo: 'Balance por lote', descripcion: 'Costos, ingresos y ganancia o pérdida de cada lote.',
        icono: 'pi pi-calculator', ruta: '/balance', permisos: ['costo.ver'] },
      { titulo: 'Proveedores', descripcion: 'Proveedores de alimento e insumos sanitarios.',
        icono: 'pi pi-truck', ruta: '/proveedores', permisos: ['proveedor.gestionar', 'alimentacion.registrar', 'sanidad.registrar'] }
    ]
  },
  {
    titulo: 'Comercial',
    modulos: [
      { titulo: 'Clientes', descripcion: 'Tiendas, restaurantes y personas naturales.',
        icono: 'pi pi-id-card', ruta: '/clientes', permisos: ['cliente.gestionar', 'pedido.gestionar'] },
      { titulo: 'Pedidos', descripcion: 'Pedidos con aves de uno o varios lotes listos para venta.',
        icono: 'pi pi-shopping-cart', ruta: '/pedidos', permisos: ['pedido.gestionar', 'venta.gestionar'] },
      { titulo: 'Ventas y cartera', descripcion: 'Ventas en libras, pagos de los clientes con Wompi, entregas y cartera vencida.',
        icono: 'pi pi-wallet', ruta: '/ventas', permisos: ['venta.gestionar', 'pago.registrar', 'cartera.ver'] }
    ]
  },
  {
    titulo: 'Administración',
    modulos: [
      { titulo: 'Personal', descripcion: 'Empleados y cargos: operarios, sanidad, transportistas y beneficiadoras.',
        icono: 'pi pi-briefcase', ruta: '/personal', permisos: ['personal.ver', 'personal.gestionar'] },
      { titulo: 'Usuarios', descripcion: 'Crear, modificar y desactivar las cuentas del sistema.',
        icono: 'pi pi-users', ruta: '/usuarios', permisos: ['usuario.gestionar'] },
      { titulo: 'Roles', descripcion: 'Agrupar permisos por cargo o responsabilidad.',
        icono: 'pi pi-shield', ruta: '/roles', permisos: ['rol.gestionar'] },
      { titulo: 'Permisos', descripcion: 'Catálogo de permisos con la forma modulo.accion.',
        icono: 'pi pi-key', ruta: '/permisos', permisos: ['rol.gestionar', 'usuario.gestionar'] }
    ]
  }
];

/** Todos los módulos, en el orden de la barra lateral. */
export const MODULOS: ModuloApp[] = SECCIONES.flatMap(s => s.modulos);

/** Permisos que habilitan la ruta indicada. */
export function permisosDe(ruta: string): string[] {
  return MODULOS.find(m => m.ruta === ruta)?.permisos ?? [];
}

/** Fecha de hoy en formato yyyy-MM-dd, en la zona horaria local. */
export function hoyISO(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
