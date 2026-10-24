import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import {
  AlimentacionService, InventarioAlimentoDTO, CompraAlimentoDTO, ConsumoAlimentoDTO, EtapaAlimentacionDTO
} from '../services/alimentacion.service';
import { ProveedorService, ProveedorDTO } from '../services/proveedor.service';
import { LoteService, LoteDTO } from '../services/lote.service';
import { AuthService } from '../services/auth.service';
import { mensajeError } from '../services/error-api';
import { hoyISO } from '../navegacion';

type Pestana = 'inventario' | 'compras' | 'consumos';

/**
 * Alimentación por etapas: inventario, compras por bultos y consumo por lote.
 * PostgreSQL valida que el alimento corresponda a la edad del lote y que haya
 * inventario, y congela el costo promedio del bulto en cada consumo.
 */
@Component({
  selector: 'app-alimentacion',
  standalone: false,
  templateUrl: './alimentacion.html'
})
export class Alimentacion implements OnInit {

  pestana: Pestana = 'inventario';
  inventario: InventarioAlimentoDTO[] = [];
  compras: CompraAlimentoDTO[] = [];
  consumos: ConsumoAlimentoDTO[] = [];
  etapas: EtapaAlimentacionDTO[] = [];
  proveedores: ProveedorDTO[] = [];
  lotes: LoteDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';
  filtroLote: number | null = null;

  formulario: 'compra' | 'consumo' | 'tipo' | null = null;
  formCompra: FormGroup;
  formConsumo: FormGroup;
  formTipo: FormGroup;

  readonly hoy = hoyISO();

  constructor(
    private fb: FormBuilder,
    private alimentacionSvc: AlimentacionService,
    private proveedorSvc: ProveedorService,
    private loteSvc: LoteService,
    public auth: AuthService,
    private messages: MessageService
  ) {
    this.formCompra = this.fb.group({
      idProveedor: [null, Validators.required],
      idTipoAlimento: [null, Validators.required],
      fecha: [this.hoy, Validators.required],
      cantidadBultos: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      costoUnitario: [null, [Validators.required, Validators.min(1)]]
    });
    this.formConsumo = this.fb.group({
      idLote: [null, Validators.required],
      idTipoAlimento: [null, Validators.required],
      fecha: [this.hoy, Validators.required],
      cantidadBultos: [null, [Validators.required, Validators.min(0.01)]]
    });
    this.formTipo = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80)]],
      idEtapa: [null, Validators.required],
      pesoBultoKg: [40, [Validators.min(0.01)]]
    });
  }

  get puedeRegistrar(): boolean {
    return this.auth.tienePermiso('alimentacion.registrar');
  }

  get proveedoresAlimento(): ProveedorDTO[] {
    return this.proveedores.filter(p => p.activo && p.suministraAlimento);
  }

  get lotesActivos(): LoteDTO[] {
    return this.lotes.filter(l => l.estado === 'EN_ENGORDE' || l.estado === 'LISTO_PARA_VENTA');
  }

  get tiposActivos(): InventarioAlimentoDTO[] {
    return this.inventario.filter(t => t.activo);
  }

  get consumosVisibles(): ConsumoAlimentoDTO[] {
    return this.filtroLote ? this.consumos.filter(c => c.idLote === this.filtroLote) : this.consumos;
  }

  get bultosEnBodega(): number {
    return this.inventario.reduce((t, i) => t + Number(i.bultosDisponibles), 0);
  }

  /** Etapa que corresponde a la edad del lote elegido en la fecha del consumo. */
  get etapaSugerida(): EtapaAlimentacionDTO | null {
    const lote = this.lotes.find(l => l.id === this.formConsumo.value.idLote);
    const fecha = this.formConsumo.value.fecha;
    if (!lote || !fecha) return null;
    const edad = Math.round((Date.parse(fecha) - Date.parse(lote.fechaIngreso)) / 86400000) + 1;
    return this.etapas.find(e => edad >= e.diaInicio && (e.diaFin == null || edad <= e.diaFin)) ?? null;
  }

  /** Edad del lote elegido en la fecha del consumo. */
  get edadConsumo(): number | null {
    const lote = this.lotes.find(l => l.id === this.formConsumo.value.idLote);
    const fecha = this.formConsumo.value.fecha;
    return lote && fecha ? Math.round((Date.parse(fecha) - Date.parse(lote.fechaIngreso)) / 86400000) + 1 : null;
  }

  ngOnInit(): void {
    this.alimentacionSvc.etapas().subscribe({ next: e => this.etapas = e ?? [], error: () => this.etapas = [] });
    this.proveedorSvc.obtenerTodos().subscribe({ next: p => this.proveedores = p ?? [], error: () => this.proveedores = [] });
    this.loteSvc.obtenerTodos().subscribe({ next: l => this.lotes = l ?? [], error: () => this.lotes = [] });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    let pendientes = 3;
    const fin = () => { if (--pendientes === 0) this.loading = false; };
    const fallo = (err: unknown) => this.errorMsg = mensajeError(err, 'No se pudo cargar la alimentación.');
    this.alimentacionSvc.inventario().pipe(finalize(fin)).subscribe({ next: d => this.inventario = d ?? [], error: fallo });
    this.alimentacionSvc.compras().pipe(finalize(fin)).subscribe({ next: d => this.compras = d ?? [], error: fallo });
    this.alimentacionSvc.consumos().pipe(finalize(fin)).subscribe({ next: d => this.consumos = d ?? [], error: fallo });
  }

  abrir(formulario: 'compra' | 'consumo' | 'tipo'): void {
    this.formulario = formulario;
    this.formCompra.reset({ fecha: this.hoy });
    this.formConsumo.reset({ fecha: this.hoy });
    this.formTipo.reset({ pesoBultoKg: 40 });
  }

  /** Al elegir lote o fecha, propone el alimento de la etapa que le corresponde. */
  sugerirAlimento(): void {
    const etapa = this.etapaSugerida;
    const tipo = etapa ? this.tiposActivos.find(t => t.etapa === etapa.nombre) : undefined;
    if (tipo) this.formConsumo.patchValue({ idTipoAlimento: tipo.idTipoAlimento });
  }

  guardar(): void {
    const form = this.formulario === 'compra' ? this.formCompra : this.formulario === 'consumo' ? this.formConsumo : this.formTipo;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const v = form.value;
    this.guardando = true;
    const peticion: Observable<any> = this.formulario === 'compra'
      ? this.alimentacionSvc.registrarCompra({ ...v, cantidadBultos: Number(v.cantidadBultos), costoUnitario: Number(v.costoUnitario) })
      : this.formulario === 'consumo'
        ? this.alimentacionSvc.registrarConsumo({ ...v, cantidadBultos: Number(v.cantidadBultos) })
        : this.alimentacionSvc.crearTipo({ nombre: v.nombre.trim(), idEtapa: Number(v.idEtapa), pesoBultoKg: v.pesoBultoKg ? Number(v.pesoBultoKg) : null });
    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        const detalle = this.formulario === 'consumo'
          ? `Lote ${res.codigoLote}, día ${res.edadDias}: costo cargado ${res.costoTotal}`
          : this.formulario === 'compra' ? `${res.cantidadBultos} bultos de ${res.tipoAlimento}` : res.nombre;
        this.messages.add({ severity: 'success', summary: 'Registrado', detail: detalle });
        this.pestana = this.formulario === 'compra' ? 'compras' : this.formulario === 'consumo' ? 'consumos' : 'inventario';
        this.formulario = null;
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se registró', detail: mensajeError(err), life: 8000 })
    });
  }
}
