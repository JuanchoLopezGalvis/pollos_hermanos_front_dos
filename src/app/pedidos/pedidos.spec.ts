import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Pedidos } from './pedidos';
import { ComercialService, PedidoDTO } from '../services/comercial.service';
import { LoteService } from '../services/lote.service';
import { AuthService } from '../services/auth.service';

describe('Pedidos', () => {
  const pedido: PedidoDTO = { idPedido: 5, idCliente: 1, cliente: 'Asadero', fechaPedido: '2026-10-20', fechaEstimadaEntrega: '2026-10-22',
                              estado: 'CONFIRMADO', totalAves: 96, lotes: 'ESC-01 (96)', idVenta: null };
  let component: Pedidos;
  let comercial: jasmine.SpyObj<ComercialService>;

  beforeEach(async () => {
    comercial = jasmine.createSpyObj<ComercialService>('ComercialService', ['pedidos', 'clientes', 'crearPedido', 'confirmarPedido', 'cancelarPedido', 'registrarVenta']);
    comercial.pedidos.and.returnValue(of([pedido]));
    comercial.clientes.and.returnValue(of([]));
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);

    await TestBed.configureTestingModule({
      declarations: [Pedidos],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: ComercialService, useValue: comercial },
        { provide: LoteService, useValue: { obtenerTodos: () => of([]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Pedidos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('calcula el peso total con el peso promedio: 96 aves × 6 lb = 576 lb', () => {
    component.vender(pedido);
    component.formVenta.patchValue({ pesoPromedioLibras: 6, precioLibra: 9000 });
    component.calcularPesoTotal();

    expect(component.formVenta.value.pesoTotalLibras).toBe(576);
    expect(component.valorVenta).toBe(5184000);
  });

  it('envía la venta en libras', () => {
    comercial.registrarVenta.and.returnValue(of({ idVenta: 9, valorTotal: 5184000 } as any));
    component.vender(pedido);
    component.formVenta.patchValue({ pesoTotalLibras: 576, precioLibra: 9000 });
    component.guardarVenta();

    expect(comercial.registrarVenta).toHaveBeenCalledWith(jasmine.objectContaining({ idPedido: 5, pesoTotalLibras: 576, precioLibra: 9000 }));
  });
});
