import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import {
  ComercialService, VentaDTO, PagoDTO, EntregaDTO, CarteraVencidaDTO, VentasClienteDTO
} from '../services/comercial.service';
import { PersonalService, EmpleadoDTO } from '../services/personal.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';
import { hoyISO } from '../navegacion';

type Pestana = 'ventas' | 'entregas' | 'cartera' | 'clientes';

/**
 * Ventas en libras con sus pagos parciales (manuales o en línea por la pasarela
 * de pruebas), su entrega y la cartera vencida.
 */
@Component({
  selector: 'app-ventas',
  standalone: false,
  templateUrl: './ventas.html'
})
export class Ventas implements OnInit {

  pestana: Pestana = 'ventas';
  ventas: VentaDTO[] = [];
  entregas: EntregaDTO[] = [];
  cartera: CarteraVencidaDTO[] = [];
  porCliente: VentasClienteDTO[] = [];
  transportistas: EmpleadoDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';

  seleccionada: VentaDTO | null = null;
  pagos: PagoDTO[] = [];
  formEntrega: FormGroup;

  readonly hoy = hoyISO();
  readonly estadosVenta: Record<string, string> = { PENDIENTE_PAGO: 'Pendiente de pago', PAGADA: 'Pagada', VENCIDA: 'Vencida' };

  constructor(
    private fb: FormBuilder,
    private comercialSvc: ComercialService,
    private personalSvc: PersonalService,
    public auth: AuthService,
    private messages: MessageService,
    private route: ActivatedRoute
  ) {
    this.formEntrega = this.fb.group({
      idEmpleado: [null, Validators.required],
      observaciones: ['', Validators.maxLength(300)]
    });
  }

  get puedeGestionar(): boolean { return this.auth.tienePermiso('venta.gestionar'); }
  get puedeCartera(): boolean { return this.auth.tieneAlguno(['cartera.ver', 'pago.registrar']); }

  get entregaSeleccionada(): EntregaDTO | undefined {
    return this.entregas.find(e => e.idVenta === this.seleccionada?.idVenta);
  }

  get saldoTotal(): number { return this.ventas.reduce((t, v) => t + Number(v.saldo), 0); }
  get vendidoTotal(): number { return this.ventas.reduce((t, v) => t + Number(v.valorTotal), 0); }
  get carteraVencidaTotal(): number { return this.cartera.reduce((t, c) => t + Number(c.saldo), 0); }

  ngOnInit(): void {
    this.personalSvc.obtener(true, 'TRANSPORTISTA').subscribe({ next: e => this.transportistas = e ?? [], error: () => this.transportistas = [] });
    const id = Number(this.route.snapshot.queryParamMap.get('venta'));
    this.cargar(id || undefined);
  }

  cargar(idSeleccionar?: number): void {
    this.loading = true;
    this.errorMsg = '';
    this.comercialSvc.ventas().pipe(finalize(() => this.loading = false)).subscribe({
      next: (data) => {
        this.ventas = data ?? [];
        const id = idSeleccionar ?? this.seleccionada?.idVenta;
        const venta = id ? this.ventas.find(v => v.idVenta === id) : undefined;
        if (venta) this.seleccionar(venta); else this.seleccionada = null;
      },
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudieron cargar las ventas.')
    });
    this.comercialSvc.entregas().subscribe({ next: d => this.entregas = d ?? [], error: () => this.entregas = [] });
    if (this.puedeCartera) {
      this.comercialSvc.carteraVencida().subscribe({ next: d => this.cartera = d ?? [], error: () => this.cartera = [] });
      this.comercialSvc.ventasPorCliente().subscribe({ next: d => this.porCliente = d ?? [], error: () => this.porCliente = [] });
    }
  }

  seleccionar(v: VentaDTO): void {
    this.seleccionada = v;
    this.formEntrega.reset({ idEmpleado: null, observaciones: '' });
    this.comercialSvc.pagos(v.idVenta).subscribe({ next: p => this.pagos = p ?? [], error: () => this.pagos = [] });
  }

  programarEntrega(): void {
    if (!this.seleccionada || this.formEntrega.invalid) {
      this.formEntrega.markAllAsTouched();
      return;
    }
    const v = this.formEntrega.value;
    this.guardando = true;
    this.comercialSvc.programarEntrega(this.seleccionada.idVenta, {
      idEmpleado: v.idEmpleado, observaciones: v.observaciones?.trim() || null
    }).pipe(finalize(() => this.guardando = false)).subscribe({
      next: (e) => {
        this.messages.add({ severity: 'success', summary: 'Entrega programada', detail: `${e.transportista} → ${e.direccion}` });
        this.cargar(this.seleccionada?.idVenta);
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se programó la entrega', detail: mensajeError(err), life: 8000 })
    });
  }

  cerrarEntrega(e: EntregaDTO, estado: 'ENTREGADO' | 'DEVUELTO'): void {
    this.comercialSvc.actualizarEntrega(e.idEntrega, { estado, fechaEntrega: this.hoy }).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: estado === 'ENTREGADO' ? 'Entrega realizada' : 'Entrega devuelta' });
        this.cargar(e.idVenta);
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se actualizó la entrega', detail: mensajeError(err) })
    });
  }

  marcarVencidas(): void {
    this.comercialSvc.marcarCarteraVencida().subscribe({
      next: (r) => {
        this.messages.add({ severity: 'success', summary: 'Cartera actualizada', detail: `${r.ventasMarcadas} venta(s) marcadas como vencidas.` });
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se actualizó', detail: mensajeError(err) })
    });
  }

  claseVenta(v: VentaDTO): string {
    return v.estado === 'PAGADA' ? 'verde' : v.estado === 'VENCIDA' || v.vencida ? 'rojo' : '';
  }
}
