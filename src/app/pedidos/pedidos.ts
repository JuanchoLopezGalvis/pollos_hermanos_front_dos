import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ComercialService, PedidoDTO, ClienteDTO, EstadoPedido } from '../services/comercial.service';
import { LoteService, LoteDTO } from '../services/lote.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';
import { hoyISO } from '../navegacion';

/**
 * Pedidos de aves de uno o varios lotes listos para venta. Se confirman (PostgreSQL
 * aparta las aves) y desde un pedido confirmado se registra la venta en libras.
 */
@Component({
  selector: 'app-pedidos',
  standalone: false,
  templateUrl: './pedidos.html'
})
export class Pedidos implements OnInit {

  pedidos: PedidoDTO[] = [];
  clientes: ClienteDTO[] = [];
  lotes: LoteDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';
  filtroEstado: EstadoPedido | '' = '';

  formulario: 'pedido' | 'venta' | null = null;
  pedidoVenta: PedidoDTO | null = null;
  formPedido: FormGroup;
  formVenta: FormGroup;

  readonly hoy = hoyISO();
  readonly estados: Record<EstadoPedido, string> = {
    PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado'
  };

  constructor(
    private fb: FormBuilder,
    private comercialSvc: ComercialService,
    private loteSvc: LoteService,
    public auth: AuthService,
    private messages: MessageService,
    private confirm: ConfirmationService,
    private router: Router
  ) {
    this.formPedido = this.fb.group({
      idCliente: [null, Validators.required],
      fechaEstimadaEntrega: [this.hoy, Validators.required],
      observaciones: ['', Validators.maxLength(300)],
      detalle: this.fb.array([])
    });
    this.formVenta = this.fb.group({
      fechaVenta: [this.hoy, Validators.required],
      pesoPromedioLibras: [null, Validators.min(0.01)],
      pesoTotalLibras: [null, [Validators.required, Validators.min(0.01)]],
      precioLibra: [null, [Validators.required, Validators.min(1)]],
      fechaLimitePago: [null]
    });
  }

  get puedeGestionar(): boolean { return this.auth.tienePermiso('pedido.gestionar'); }
  get puedeVender(): boolean { return this.auth.tienePermiso('venta.gestionar'); }

  get lineas(): FormArray { return this.formPedido.get('detalle') as FormArray; }

  get clientesActivos(): ClienteDTO[] { return this.clientes.filter(c => c.activo); }

  get lotesListos(): LoteDTO[] { return this.lotes.filter(l => l.estado === 'LISTO_PARA_VENTA' && l.avesDisponibles > 0); }

  get visibles(): PedidoDTO[] {
    return this.filtroEstado ? this.pedidos.filter(p => p.estado === this.filtroEstado) : this.pedidos;
  }

  get totalAvesPedido(): number {
    return this.lineas.controls.reduce((t, c) => t + (Number(c.value.cantidadAves) || 0), 0);
  }

  get valorVenta(): number {
    return (Number(this.formVenta.value.pesoTotalLibras) || 0) * (Number(this.formVenta.value.precioLibra) || 0);
  }

  ngOnInit(): void {
    this.comercialSvc.clientes().subscribe({ next: c => this.clientes = c ?? [], error: () => this.clientes = [] });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.loteSvc.obtenerTodos().subscribe({ next: l => this.lotes = l ?? [], error: () => this.lotes = [] });
    this.comercialSvc.pedidos().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => this.pedidos = data ?? [],
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudieron cargar los pedidos.')
    });
  }

  nuevoPedido(): void {
    this.formulario = 'pedido';
    this.formPedido.reset({ fechaEstimadaEntrega: this.hoy, observaciones: '' });
    this.lineas.clear();
    this.agregarLinea();
  }

  agregarLinea(): void {
    this.lineas.push(this.fb.group({
      idLote: [null, Validators.required],
      cantidadAves: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]]
    }));
  }

  quitarLinea(i: number): void {
    this.lineas.removeAt(i);
  }

  disponibles(idLote: number | null): number | null {
    return this.lotes.find(l => l.id === idLote)?.avesDisponibles ?? null;
  }

  guardarPedido(): void {
    if (this.formPedido.invalid || !this.lineas.length) {
      this.formPedido.markAllAsTouched();
      return;
    }
    const v = this.formPedido.value;
    this.guardando = true;
    this.comercialSvc.crearPedido({
      idCliente: v.idCliente, fechaEstimadaEntrega: v.fechaEstimadaEntrega, observaciones: v.observaciones?.trim() || null,
      detalle: v.detalle.map((l: any) => ({ idLote: Number(l.idLote), cantidadAves: Number(l.cantidadAves) }))
    }).pipe(finalize(() => this.guardando = false)).subscribe({
      next: (p) => {
        this.messages.add({ severity: 'success', summary: 'Pedido creado', detail: `Pedido ${p.idPedido}: ${p.totalAves} aves. Confírmalo para apartarlas.` });
        this.formulario = null;
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se creó el pedido', detail: mensajeError(err), life: 8000 })
    });
  }

  confirmar(p: PedidoDTO): void {
    this.comercialSvc.confirmarPedido(p.idPedido).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Pedido confirmado', detail: `Se apartaron ${p.totalAves} aves.` });
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se confirmó', detail: mensajeError(err), life: 8000 })
    });
  }

  cancelar(p: PedidoDTO): void {
    this.confirm.confirm({
      header: 'Cancelar pedido',
      message: `¿Cancelar el pedido ${p.idPedido} de ${p.cliente}? Sus aves quedan libres.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cancelar pedido',
      rejectLabel: 'Volver',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.comercialSvc.cancelarPedido(p.idPedido).subscribe({
        next: () => { this.messages.add({ severity: 'success', summary: 'Pedido cancelado' }); this.cargar(); },
        error: (err) => this.messages.add({ severity: 'error', summary: 'No se canceló', detail: mensajeError(err) })
      })
    });
  }

  vender(p: PedidoDTO): void {
    this.pedidoVenta = p;
    this.formulario = 'venta';
    this.formVenta.reset({ fechaVenta: this.hoy });
  }

  /** Con el peso promedio por ave calcula el peso total (ej. 96 aves × 6 lb = 576 lb). */
  calcularPesoTotal(): void {
    const promedio = Number(this.formVenta.value.pesoPromedioLibras);
    if (this.pedidoVenta && promedio > 0) {
      this.formVenta.patchValue({ pesoTotalLibras: Math.round(promedio * this.pedidoVenta.totalAves * 100) / 100 });
    }
  }

  guardarVenta(): void {
    if (!this.pedidoVenta) return;
    if (this.formVenta.invalid) {
      this.formVenta.markAllAsTouched();
      return;
    }
    const v = this.formVenta.value;
    this.guardando = true;
    this.comercialSvc.registrarVenta({
      idPedido: this.pedidoVenta.idPedido, fechaVenta: v.fechaVenta, pesoTotalLibras: Number(v.pesoTotalLibras),
      precioLibra: Number(v.precioLibra), fechaLimitePago: v.fechaLimitePago || null
    }).pipe(finalize(() => this.guardando = false)).subscribe({
      next: (venta) => {
        this.messages.add({ severity: 'success', summary: 'Venta registrada', detail: `Venta ${venta.idVenta} por ${venta.valorTotal}. Ahora puedes registrar pagos y la entrega.` });
        this.formulario = null;
        this.router.navigate(['/ventas'], { queryParams: { venta: venta.idVenta } });
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se registró la venta', detail: mensajeError(err), life: 8000 })
    });
  }

  claseEstado(p: PedidoDTO): string {
    return p.estado === 'CONFIRMADO' ? 'verde' : p.estado === 'CANCELADO' ? 'gris' : p.estado === 'ENTREGADO' ? 'gris' : '';
  }
}
