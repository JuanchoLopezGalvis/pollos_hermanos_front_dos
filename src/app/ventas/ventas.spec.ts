import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { Ventas } from './ventas';
import { ComercialService, VentaDTO } from '../services/comercial.service';
import { PersonalService } from '../services/personal.service';
import { AuthService } from '../services/auth.service';

describe('Ventas', () => {
  const venta: VentaDTO = { idVenta: 7, idPedido: 5, idCliente: 1, cliente: 'Asadero', fechaVenta: '2026-10-20', cantidadAves: 96,
    pesoTotalLibras: 576, precioLibra: 9000, valorTotal: 5184000, pagado: 2000000, saldo: 3184000, fechaLimitePago: '2026-11-19',
    estado: 'PENDIENTE_PAGO', vencida: false, direccionCliente: 'Calle 1 # 2-3' };
  let component: Ventas;
  let comercial: jasmine.SpyObj<ComercialService>;
  let messages: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    comercial = jasmine.createSpyObj<ComercialService>('ComercialService',
      ['ventas', 'entregas', 'carteraVencida', 'ventasPorCliente', 'pagos', 'programarEntrega']);
    comercial.ventas.and.returnValue(of([venta]));
    comercial.entregas.and.returnValue(of([]));
    comercial.carteraVencida.and.returnValue(of([]));
    comercial.ventasPorCliente.and.returnValue(of([]));
    comercial.pagos.and.returnValue(of([]));
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    auth.tieneAlguno.and.returnValue(true);
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    await TestBed.configureTestingModule({
      declarations: [Ventas],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: ComercialService, useValue: comercial },
        { provide: PersonalService, useValue: { obtener: () => of([]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: messages }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Ventas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('el personal no registra pagos: no hay formulario de pago', () => {
    component.seleccionar(venta);
    expect((component as any).formPago).toBeUndefined();
    expect((component as any).registrarPago).toBeUndefined();
  });

  it('programa la entrega sin dirección: la pone la base con la del cliente', () => {
    comercial.programarEntrega.and.returnValue(of({ idEntrega: 1, idVenta: 7, cliente: 'Asadero', idEmpleado: 3,
      transportista: 'Tomás Ruta', direccion: 'Calle 1 # 2-3', estado: 'PENDIENTE' } as any));
    component.seleccionar(venta);
    component.formEntrega.patchValue({ idEmpleado: 3 });
    component.programarEntrega();

    expect(comercial.programarEntrega).toHaveBeenCalledWith(7, { idEmpleado: 3, observaciones: null });
  });
});
