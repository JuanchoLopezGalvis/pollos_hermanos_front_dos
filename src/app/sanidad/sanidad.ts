import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { SanidadService, ProductoSanitarioDTO, CompraSanitariaDTO, AplicacionSanitariaDTO } from '../services/sanidad.service';
import { ProveedorService, ProveedorDTO } from '../services/proveedor.service';
import { PersonalService, EmpleadoDTO } from '../services/personal.service';
import { LoteService, LoteDTO } from '../services/lote.service';
import { AuthService } from '../services/auth.service';
import { LIMITES, decimal, dinero } from '../services/validaciones';
import { mensajeError } from '../services/error-api';
import { hoyISO } from '../navegacion';

type Pestana = 'aplicaciones' | 'productos' | 'compras';

/**
 * Vitaminas y medicamentos: catálogo, compras y aplicaciones por lote. Solo un
 * encargado de sanidad activo puede ser responsable de una aplicación, y su costo
 * se carga al lote al costo promedio de compra.
 */
@Component({
  selector: 'app-sanidad',
  standalone: false,
  templateUrl: './sanidad.html'
})
export class Sanidad implements OnInit {

  pestana: Pestana = 'aplicaciones';
  productos: ProductoSanitarioDTO[] = [];
  compras: CompraSanitariaDTO[] = [];
  aplicaciones: AplicacionSanitariaDTO[] = [];
  proveedores: ProveedorDTO[] = [];
  encargados: EmpleadoDTO[] = [];
  lotes: LoteDTO[] = [];
  loading = false;
  guardando = false;
  errorMsg = '';
  filtroLote: number | null = null;

  formulario: 'producto' | 'compra' | 'aplicacion' | null = null;
  editandoProducto: ProductoSanitarioDTO | null = null;
  formProducto: FormGroup;
  formCompra: FormGroup;
  formAplicacion: FormGroup;

  readonly hoy = hoyISO();

  constructor(
    private fb: FormBuilder,
    private sanidadSvc: SanidadService,
    private proveedorSvc: ProveedorService,
    private personalSvc: PersonalService,
    private loteSvc: LoteService,
    public auth: AuthService,
    private messages: MessageService
  ) {
    this.formProducto = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      tipo: ['VITAMINA', Validators.required],
      presentacion: ['', [Validators.required, Validators.maxLength(80)]],
      unidadMedida: ['ml', [Validators.required, Validators.maxLength(20)]],
      idProveedor: [null, Validators.required],
      activo: [true]
    });
    this.formCompra = this.fb.group({
      idProducto: [null, Validators.required],
      fecha: [this.hoy, Validators.required],
      cantidad: [null, decimal(0.01, LIMITES.cantidad10)],
      costoUnitario: [null, dinero()]
    });
    this.formAplicacion = this.fb.group({
      idLote: [null, Validators.required],
      idProducto: [null, Validators.required],
      idEmpleado: [null, Validators.required],
      fecha: [this.hoy, Validators.required],
      dosis: [null, decimal(0.01, LIMITES.cantidad10)],
      observaciones: ['', Validators.maxLength(300)]
    });
  }

  get puedeRegistrar(): boolean {
    return this.auth.tienePermiso('sanidad.registrar');
  }

  get proveedoresSanidad(): ProveedorDTO[] {
    return this.proveedores.filter(p => p.activo && p.suministraSanidad);
  }

  get productosActivos(): ProductoSanitarioDTO[] {
    return this.productos.filter(p => p.activo);
  }

  get lotesActivos(): LoteDTO[] {
    return this.lotes.filter(l => l.estado === 'EN_ENGORDE' || l.estado === 'LISTO_PARA_VENTA');
  }

  get aplicacionesVisibles(): AplicacionSanitariaDTO[] {
    return this.filtroLote ? this.aplicaciones.filter(a => a.idLote === this.filtroLote) : this.aplicaciones;
  }

  get productoElegido(): ProductoSanitarioDTO | undefined {
    return this.productos.find(p => p.idProducto === this.formAplicacion.value.idProducto);
  }

  /** Edad del lote elegido en la fecha de la aplicación. */
  get edadAplicacion(): number | null {
    const lote = this.lotes.find(l => l.id === this.formAplicacion.value.idLote);
    const fecha = this.formAplicacion.value.fecha;
    return lote && fecha ? Math.round((Date.parse(fecha) - Date.parse(lote.fechaIngreso)) / 86400000) + 1 : null;
  }

  ngOnInit(): void {
    this.proveedorSvc.obtenerTodos().subscribe({ next: p => this.proveedores = p ?? [], error: () => this.proveedores = [] });
    this.personalSvc.obtener(true, 'ENCARGADO_SANIDAD').subscribe({ next: e => this.encargados = e ?? [], error: () => this.encargados = [] });
    this.loteSvc.obtenerTodos().subscribe({ next: l => this.lotes = l ?? [], error: () => this.lotes = [] });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    let pendientes = 3;
    const fin = () => { if (--pendientes === 0) this.loading = false; };
    const fallo = (err: unknown) => this.errorMsg = mensajeError(err, 'No se pudo cargar la sanidad.');
    this.sanidadSvc.productos().pipe(finalize(fin)).subscribe({ next: d => this.productos = d ?? [], error: fallo });
    this.sanidadSvc.compras().pipe(finalize(fin)).subscribe({ next: d => this.compras = d ?? [], error: fallo });
    this.sanidadSvc.aplicaciones().pipe(finalize(fin)).subscribe({ next: d => this.aplicaciones = d ?? [], error: fallo });
  }

  abrir(formulario: 'producto' | 'compra' | 'aplicacion', producto?: ProductoSanitarioDTO): void {
    this.formulario = formulario;
    this.editandoProducto = producto ?? null;
    this.formProducto.reset({ tipo: 'VITAMINA', unidadMedida: 'ml', activo: true, ...(producto ?? {}) });
    this.formCompra.reset({ fecha: this.hoy });
    this.formAplicacion.reset({ fecha: this.hoy, observaciones: '' });
  }

  guardar(): void {
    const form = this.formulario === 'producto' ? this.formProducto : this.formulario === 'compra' ? this.formCompra : this.formAplicacion;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const v = form.value;
    this.guardando = true;
    let peticion: Observable<any>;
    if (this.formulario === 'producto') {
      const dto = { ...v, idProveedor: Number(v.idProveedor) };
      peticion = this.editandoProducto
        ? this.sanidadSvc.actualizarProducto(this.editandoProducto.idProducto, dto)
        : this.sanidadSvc.crearProducto(dto);
    } else if (this.formulario === 'compra') {
      peticion = this.sanidadSvc.registrarCompra({ ...v, cantidad: Number(v.cantidad), costoUnitario: Number(v.costoUnitario) });
    } else {
      peticion = this.sanidadSvc.registrarAplicacion({ ...v, dosis: Number(v.dosis), observaciones: v.observaciones?.trim() || null });
    }
    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: (res) => {
        const detalle = this.formulario === 'aplicacion'
          ? `${res.producto} al lote ${res.codigoLote}: costo cargado ${res.costoTotal}` : (res.nombre ?? res.producto);
        this.messages.add({ severity: 'success', summary: 'Registrado', detail: detalle });
        this.pestana = this.formulario === 'producto' ? 'productos' : this.formulario === 'compra' ? 'compras' : 'aplicaciones';
        this.formulario = null;
        this.cargar();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'No se registró', detail: mensajeError(err), life: 8000 })
    });
  }
}
