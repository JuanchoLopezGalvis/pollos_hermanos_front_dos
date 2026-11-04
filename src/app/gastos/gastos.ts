import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { GastosService, GastoDTO, JornadaBeneficioDTO, DetalleBeneficioDTO, OtroIngresoDTO } from '../services/gastos.service';
import { CatalogoService, CatalogoDTO } from '../services/catalogo.service';
import { PersonalService, EmpleadoDTO } from '../services/personal.service';
import { LoteService, LoteDTO } from '../services/lote.service';
import { AuthService } from '../services/auth.service';
import { LIMITES, dinero, entero } from '../services/validaciones';
import { mensajeError } from '../services/error-api';
import { hoyISO } from '../navegacion';

type Pestana = 'gastos' | 'beneficio' | 'ingresos';

/**
 * Gastos del lote o de la finca, jornadas de beneficio (pago por pollo a cada
 * beneficiadora) y otros ingresos del lote. Los pagos del beneficio no se
 * registran como gasto, para no contarlos dos veces.
 */
@Component({
  selector: 'app-gastos',
  standalone: false,
  templateUrl: './gastos.html'
})
export class Gastos implements OnInit {

  pestana: Pestana = 'gastos';
  gastos: GastoDTO[] = [];
  jornadas: JornadaBeneficioDTO[] = [];
  ingresos: OtroIngresoDTO[] = [];
  categorias: CatalogoDTO[] = [];
  beneficiadoras: EmpleadoDTO[] = [];
  lotes: LoteDTO[] = [];
  detalle: Record<number, DetalleBeneficioDTO[]> = {};
  loading = false;
  guardando = false;
  errorMsg = '';

  formulario: 'gasto' | 'jornada' | 'ingreso' | null = null;
  formGasto: FormGroup;
  formJornada: FormGroup;
  formIngreso: FormGroup;

  readonly hoy = hoyISO();

  constructor(
    private fb: FormBuilder,
    private gastosSvc: GastosService,
    private catalogoSvc: CatalogoService,
    private personalSvc: PersonalService,
    private loteSvc: LoteService,
    public auth: AuthService,
    private messages: MessageService
  ) {
    this.formGasto = this.fb.group({
      idCategoriaGasto: [null, Validators.required],
      idLote: [null],
      fecha: [this.hoy, Validators.required],
      monto: [null, dinero()],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]]
    });
    this.formJornada = this.fb.group({
      idLote: [null, Validators.required],
      fecha: [this.hoy, Validators.required],
      observaciones: ['', Validators.maxLength(300)],
      detalle: this.fb.array([])
    });
    this.formIngreso = this.fb.group({
      idLote: [null, Validators.required],
      fecha: [this.hoy, Validators.required],
      monto: [null, dinero()],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  get puedeGasto(): boolean { return this.auth.tienePermiso('gasto.registrar'); }
  get puedeBeneficio(): boolean { return this.auth.tienePermiso('beneficio.registrar'); }
  get puedeIngreso(): boolean { return this.auth.tienePermiso('venta.gestionar'); }

  get lineas(): FormArray { return this.formJornada.get('detalle') as FormArray; }

  get lotesNoCerrados(): LoteDTO[] { return this.lotes.filter(l => l.estado !== 'CERRADO'); }

  /** El beneficio se hace en lotes listos para venta o ya vendidos. */
  get lotesParaBeneficio(): LoteDTO[] {
    return this.lotes.filter(l => l.estado === 'LISTO_PARA_VENTA' || l.estado === 'VENDIDO');
  }

  get totalJornada(): number {
    return this.lineas.controls.reduce((t, c) => t + (Number(c.value.avesBeneficiadas) || 0) * (Number(c.value.tarifaPorAve) || 0), 0);
  }

  get totalGastosLote(): number { return this.gastos.filter(g => g.idLote).reduce((t, g) => t + Number(g.monto), 0); }
  get totalGastosFinca(): number { return this.gastos.filter(g => !g.idLote).reduce((t, g) => t + Number(g.monto), 0); }

  ngOnInit(): void {
    this.catalogoSvc.obtener('categorias-gasto').subscribe({ next: c => this.categorias = c ?? [], error: () => this.categorias = [] });
    this.personalSvc.obtener(true, 'BENEFICIADORA').subscribe({ next: e => this.beneficiadoras = e ?? [], error: () => this.beneficiadoras = [] });
    this.loteSvc.obtenerTodos().subscribe({ next: l => this.lotes = l ?? [], error: () => this.lotes = [] });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    let pendientes = 3;
    const fin = () => { if (--pendientes === 0) this.loading = false; };
    const fallo = (err: unknown) => this.errorMsg = mensajeError(err, 'No se pudo cargar la información.');
    this.gastosSvc.gastos().pipe(finalize(fin)).subscribe({ next: d => this.gastos = d ?? [], error: fallo });
    this.gastosSvc.jornadas().pipe(finalize(fin)).subscribe({ next: d => this.jornadas = d ?? [], error: () => this.jornadas = [] });
    this.gastosSvc.otrosIngresos().pipe(finalize(fin)).subscribe({ next: d => this.ingresos = d ?? [], error: () => this.ingresos = [] });
  }

  abrir(formulario: 'gasto' | 'jornada' | 'ingreso'): void {
    this.formulario = formulario;
    this.formGasto.reset({ fecha: this.hoy, idLote: null, descripcion: '' });
    this.formIngreso.reset({ fecha: this.hoy, descripcion: '' });
    this.formJornada.reset({ fecha: this.hoy, observaciones: '' });
    this.lineas.clear();
    if (formulario === 'jornada') this.agregarLinea();
  }

  agregarLinea(): void {
    const anterior = this.lineas.length ? this.lineas.at(this.lineas.length - 1).value.tarifaPorAve : null;
    this.lineas.push(this.fb.group({
      idEmpleado: [null, Validators.required],
      avesBeneficiadas: [null, entero(1, LIMITES.aves)],
      tarifaPorAve: [anterior, dinero()]
    }));
  }

  quitarLinea(i: number): void {
    this.lineas.removeAt(i);
  }

  verDetalle(j: JornadaBeneficioDTO): void {
    if (this.detalle[j.idJornada]) {
      delete this.detalle[j.idJornada];
      return;
    }
    this.gastosSvc.detalleJornada(j.idJornada).subscribe({ next: d => this.detalle[j.idJornada] = d ?? [] });
  }

  guardar(): void {
    const form = this.formulario === 'gasto' ? this.formGasto : this.formulario === 'jornada' ? this.formJornada : this.formIngreso;
    if (form.invalid || (this.formulario === 'jornada' && !this.lineas.length)) {
      form.markAllAsTouched();
      return;
    }
    const v = form.value;
    this.guardando = true;
    const peticion: Observable<unknown> = this.formulario === 'gasto'
      ? this.gastosSvc.registrarGasto({ ...v, monto: Number(v.monto), idLote: v.idLote || null, descripcion: v.descripcion.trim() })
      : this.formulario === 'jornada'
        ? this.gastosSvc.registrarJornada({
            idLote: v.idLote, fecha: v.fecha, observaciones: v.observaciones?.trim() || null,
            detalle: v.detalle.map((l: any) => ({ idEmpleado: Number(l.idEmpleado), avesBeneficiadas: Number(l.avesBeneficiadas), tarifaPorAve: Number(l.tarifaPorAve) }))
          })
        : this.gastosSvc.registrarOtroIngreso({ ...v, monto: Number(v.monto), descripcion: v.descripcion.trim() });
    peticion.pipe(finalize(() => this.guardando = false)).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Registrado' });
        this.pestana = this.formulario === 'gasto' ? 'gastos' : this.formulario === 'jornada' ? 'beneficio' : 'ingresos';
        this.formulario = null;
        this.cargar();
      },
      error: (err: unknown) => this.messages.add({ severity: 'error', summary: 'No se registró', detail: mensajeError(err), life: 8000 })
    });
  }
}
