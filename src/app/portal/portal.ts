import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../services/auth.service';
import { PortalService } from '../services/portal.service';
import { ClienteDTO, PagoDTO, PedidoDTO, VentaDTO } from '../services/comercial.service';
import { mensajeError } from '../services/error-api';
import { hoyISO } from '../navegacion';

type Pestana = 'pedir' | 'pedidos' | 'compras';

/** Cómo ve el cliente el estado de su pedido. */
const ESTADOS_PEDIDO: Record<string, string> = {
  PENDIENTE: 'Esperando aprobación',
  CONFIRMADO: 'Aprobado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado'
};

/** Cómo ve el cliente el estado de su compra. */
const ESTADOS_VENTA: Record<string, string> = {
  PENDIENTE_PAGO: 'Por pagar',
  PAGADA: 'Pagada',
  VENCIDA: 'Vencida'
};

/**
 * Portal del cliente: pide aves (el sistema elige los lotes), sigue sus
 * pedidos y paga sus compras con Wompi. Todo lo que muestra es suyo.
 */
@Component({
  selector: 'app-portal',
  standalone: false,
  templateUrl: './portal.html',
  styleUrls: ['./portal.css']
})
export class Portal implements OnInit {

  pestana: Pestana = 'pedir';
  cliente: ClienteDTO | null = null;
  avesDisponibles: number | null = null;
  pedidos: PedidoDTO[] = [];
  ventas: VentaDTO[] = [];
  pagos: PagoDTO[] = [];
  seleccionada: VentaDTO | null = null;
  montoPago: number | null = null;

  cargando = false;
  enviando = false;
  redirigiendo = false;
  errorMsg = '';

  readonly hoy = hoyISO();
  readonly estadosPedido = ESTADOS_PEDIDO;
  readonly estadosVenta = ESTADOS_VENTA;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private portalSvc: PortalService,
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.crearFormulario();
  }

  get f() { return this.form.controls; }

  /** Pedidos que la finca todavía no entrega ni cancela. */
  get pedidosEnCurso(): number {
    return this.pedidos.filter(p => p.estado === 'PENDIENTE' || p.estado === 'CONFIRMADO').length;
  }

  /** Lo que el cliente debe en todas sus compras. */
  get saldoTotal(): number {
    return this.ventas.reduce((t, v) => t + Number(v.saldo), 0);
  }

  ngOnInit(): void {
    const ver = this.route.snapshot.queryParamMap.get('ver') as Pestana | null;
    if (ver === 'pedidos' || ver === 'compras') {
      this.pestana = ver;
    }
    this.portalSvc.perfil().subscribe({
      next: (c) => this.cliente = c,
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudieron cargar tus datos.')
    });
    this.cargar();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      cantidadAves: [null, [Validators.required, Validators.min(1), Validators.max(100000), Validators.pattern(/^\d+$/)]],
      fechaEstimadaEntrega: [hoyISO(), Validators.required],
      observaciones: ['', Validators.maxLength(300)]
    });
  }

  cargar(): void {
    this.cargando = true;
    this.portalSvc.disponibilidad().subscribe({
      next: (d) => this.avesDisponibles = d.avesDisponibles,
      error: () => this.avesDisponibles = null
    });
    this.portalSvc.pedidos().subscribe({ next: (p) => this.pedidos = p ?? [], error: () => this.pedidos = [] });
    this.portalSvc.ventas().pipe(finalize(() => this.cargando = false)).subscribe({
      next: (v) => {
        this.ventas = v ?? [];
        if (this.seleccionada) {
          const actual = this.ventas.find(x => x.idVenta === this.seleccionada!.idVenta);
          actual ? this.verVenta(actual) : this.seleccionada = null;
        }
      },
      error: () => this.ventas = []
    });
  }

  pedir(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    this.enviando = true;
    this.portalSvc.crearPedido({
      cantidadAves: Number(v.cantidadAves),
      fechaEstimadaEntrega: v.fechaEstimadaEntrega,
      observaciones: v.observaciones?.trim() || null
    }).pipe(finalize(() => this.enviando = false)).subscribe({
      next: (p) => {
        this.messages.add({
          severity: 'success', summary: `Pedido ${p.idPedido} enviado`,
          detail: `${p.totalAves} aves. La finca lo revisa y te avisa el valor cuando las pese.`, life: 6000
        });
        this.form = this.crearFormulario();
        this.pestana = 'pedidos';
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se pudo hacer el pedido', detail: mensajeError(err), life: 8000 })
    });
  }

  cancelarPedido(p: PedidoDTO): void {
    this.confirm.confirm({
      header: 'Cancelar pedido',
      message: `¿Cancelar el pedido ${p.idPedido} de ${p.totalAves} aves?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cancelar pedido',
      rejectLabel: 'Volver',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.portalSvc.cancelarPedido(p.idPedido).subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: `Pedido ${p.idPedido} cancelado` });
          this.cargar();
        },
        error: (err) => this.messages.add({ severity: 'error', summary: 'No se canceló', detail: mensajeError(err), life: 6000 })
      })
    });
  }

  verVenta(v: VentaDTO): void {
    this.seleccionada = v;
    this.montoPago = Number(v.saldo) > 0 ? Number(v.saldo) : null;
    this.pagos = [];
    this.portalSvc.pagos(v.idVenta).subscribe({ next: (p) => this.pagos = p ?? [], error: () => this.pagos = [] });
  }

  /** Abre el checkout de Wompi; al terminar vuelve a /pago-resultado. */
  pagar(): void {
    const v = this.seleccionada;
    if (!v || !this.montoPago || this.montoPago <= 0) return;
    if (this.montoPago > Number(v.saldo)) {
      this.messages.add({ severity: 'warn', summary: 'Monto mayor que el saldo', detail: 'Puedes pagar como máximo lo que debes.' });
      return;
    }
    this.redirigiendo = true;
    const retorno = `${window.location.origin}/pago-resultado`;
    this.portalSvc.iniciarPago(v.idVenta, Number(this.montoPago), retorno).subscribe({
      next: (checkout) => this.irA(checkout.urlCheckout),
      error: (err) => {
        this.redirigiendo = false;
        this.messages.add({ severity: 'error', summary: 'No se pudo iniciar el pago', detail: mensajeError(err), life: 8000 });
      }
    });
  }

  /** Separado para poder simularlo en las pruebas. */
  irA(url: string): void {
    window.location.assign(url);
  }

  /** Compra del pedido, si la finca ya lo pesó. */
  ventaDe(p: PedidoDTO): VentaDTO | undefined {
    return p.idVenta ? this.ventas.find(v => v.idVenta === p.idVenta) : undefined;
  }

  verCompra(idVenta: number): void {
    this.pestana = 'compras';
    const v = this.ventas.find(x => x.idVenta === idVenta);
    if (v) this.verVenta(v);
  }

  claseEstadoPedido(estado: string): string {
    return estado === 'CONFIRMADO' || estado === 'ENTREGADO' ? 'verde' : estado === 'CANCELADO' ? 'gris' : '';
  }

  claseEstadoVenta(v: VentaDTO): string {
    return v.estado === 'PAGADA' ? 'verde' : v.vencida || v.estado === 'VENCIDA' ? 'rojo' : '';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
