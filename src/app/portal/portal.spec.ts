import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { Portal } from './portal';
import { PortalService } from '../services/portal.service';
import { AuthService } from '../services/auth.service';
import { PedidoDTO, VentaDTO } from '../services/comercial.service';

describe('Portal', () => {
  let component: Portal;
  let fixture: ComponentFixture<Portal>;
  let portal: jasmine.SpyObj<PortalService>;
  let messages: jasmine.SpyObj<MessageService>;
  let confirm: jasmine.SpyObj<ConfirmationService>;

  const pedido: PedidoDTO = {
    idPedido: 10, idCliente: 4, cliente: 'Asadero', fechaPedido: '2026-10-25', fechaEstimadaEntrega: '2026-10-27',
    estado: 'PENDIENTE', totalAves: 6, idVenta: null
  };
  const venta: VentaDTO = {
    idVenta: 5, idPedido: 9, idCliente: 4, cliente: 'Asadero', fechaVenta: '2026-10-25', cantidadAves: 6,
    pesoTotalLibras: 36, precioLibra: 9500, valorTotal: 342000, pagado: 42000, saldo: 300000,
    fechaLimitePago: '2026-11-24', estado: 'PENDIENTE_PAGO', vencida: false
  };

  beforeEach(async () => {
    portal = jasmine.createSpyObj<PortalService>('PortalService',
      ['perfil', 'disponibilidad', 'pedidos', 'ventas', 'pagos', 'historialPagos', 'crearPedido', 'cancelarPedido', 'iniciarPago']);
    portal.perfil.and.returnValue(of({ idCliente: 4, idTipoCliente: 1, tipoCliente: 'Tienda', documento: '900', nombre: 'Asadero', activo: true }));
    portal.disponibilidad.and.returnValue(of({ avesDisponibles: 89 }));
    portal.pedidos.and.returnValue(of([pedido]));
    portal.ventas.and.returnValue(of([venta]));
    portal.pagos.and.returnValue(of([]));
    portal.historialPagos.and.returnValue(of([
      { idPago: 2, idVenta: 5, fecha: '2026-10-26', monto: 30000, codigoMetodo: 'EN_LINEA', metodo: 'En línea', referenciaPasarela: 'tx-2' },
      { idPago: 1, idVenta: 5, fecha: '2026-10-25', monto: 12000, codigoMetodo: 'EN_LINEA', metodo: 'En línea', referenciaPasarela: 'tx-1' }
    ]));
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    confirm = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      declarations: [Portal],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: PortalService, useValue: portal },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['logout'], { nombreVisible: 'Asadero' }) },
        { provide: MessageService, useValue: messages },
        { provide: ConfirmationService, useValue: confirm }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Portal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra las aves disponibles, los pedidos en curso y el saldo', () => {
    expect(component.avesDisponibles).toBe(89);
    expect(component.pedidosEnCurso).toBe(1);
    expect(component.saldoTotal).toBe(300000);
  });

  it('pide solo la cantidad de aves y la fecha', () => {
    portal.crearPedido.and.returnValue(of({ ...pedido, idPedido: 11, totalAves: 20 }));
    component.form.patchValue({ cantidadAves: 20, fechaEstimadaEntrega: '2026-10-28', observaciones: '  temprano ' });
    component.pedir();

    expect(portal.crearPedido).toHaveBeenCalledWith({ cantidadAves: 20, fechaEstimadaEntrega: '2026-10-28', observaciones: 'temprano' });
    expect(component.pestana).toBe('pedidos');
  });

  it('no envía un pedido de cero aves', () => {
    component.form.patchValue({ cantidadAves: 0 });
    component.pedir();
    expect(portal.crearPedido).not.toHaveBeenCalled();
  });

  it('no deja pedir más pollos de los disponibles', () => {
    component.form.patchValue({ cantidadAves: 100 });
    component.pedir();

    expect(component.f['cantidadAves'].errors?.['limite'].mensaje).toBe('Hoy solo hay 89 pollos disponibles.');
    expect(portal.crearPedido).not.toHaveBeenCalled();
  });

  it('muestra el rechazo cuando no hay aves suficientes', () => {
    const mensaje = 'Solo hay 80 aves disponibles: no alcanza para las 89 del pedido.';
    portal.crearPedido.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { estado: 409, mensaje, detalles: [], fecha: '' }
    })));
    component.form.patchValue({ cantidadAves: 89 });
    component.pedir();

    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: mensaje }));
  });

  it('pide confirmación antes de cancelar un pedido', () => {
    portal.cancelarPedido.and.returnValue(of({ ...pedido, estado: 'CANCELADO' }));
    confirm.confirm.and.callFake((c: any) => { c.accept(); return confirm; });
    component.cancelarPedido(pedido);
    expect(portal.cancelarPedido).toHaveBeenCalledWith(10);
  });

  it('propone pagar el saldo y abre el checkout de Wompi', () => {
    spyOn(component, 'irA');
    portal.iniciarPago.and.returnValue(of({ urlCheckout: 'https://checkout.wompi.co/p/?x', referencia: 'PH-V5-1', montoEnCentavos: 30000000, moneda: 'COP' }));

    component.verVenta(venta);
    expect(component.montoPago).toBe(300000);
    component.pagar();

    expect(portal.iniciarPago).toHaveBeenCalledWith(5, 300000, jasmine.stringMatching(/\/pago-resultado$/));
    expect(component.irA).toHaveBeenCalledWith('https://checkout.wompi.co/p/?x');
  });

  it('no deja pagar más que el saldo', () => {
    component.verVenta(venta);
    component.montoPago = 300001;
    component.pagar();
    expect(portal.iniciarPago).not.toHaveBeenCalled();
  });

  it('muestra el peso promedio de cada pollo de la compra', () => {
    expect(component.pesoPromedio(venta)).toBe(6);
    component.pestana = 'compras';
    component.verVenta(venta);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Peso promedio por pollo');
  });

  it('suma el historial de todos los pagos del cliente', () => {
    expect(portal.historialPagos).toHaveBeenCalled();
    expect(component.totalPagado).toBe(42000);
    component.pestana = 'historial';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('el pedido aparece pagado solo cuando su compra no tiene saldo', () => {
    const conVenta = { ...pedido, idVenta: 5 };
    expect(component.ventaDe(conVenta)?.saldo).toBe(300000);
    component.ventas = [{ ...venta, saldo: 0, pagado: 342000, estado: 'PAGADA' }];
    expect(component.ventaDe(conVenta)?.estado).toBe('PAGADA');
    expect(component.ventaDe(pedido)).toBeUndefined();
  });
});
