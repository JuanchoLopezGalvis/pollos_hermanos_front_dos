import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ComercialService, ResultadoPagoEnLineaDTO } from '../services/comercial.service';
import { mensajeError } from '../services/error-api';

/**
 * Página a la que vuelve la pasarela después del pago. Pide al backend que
 * consulte la transacción en Wompi; solo si está aprobada queda registrada.
 */
@Component({
  selector: 'app-pago-resultado',
  standalone: false,
  templateUrl: './pago-resultado.html'
})
export class PagoResultado implements OnInit {

  resultado: ResultadoPagoEnLineaDTO | null = null;
  cargando = true;
  errorMsg = '';
  idTransaccion = '';

  constructor(private route: ActivatedRoute, private comercialSvc: ComercialService) {}

  ngOnInit(): void {
    this.idTransaccion = this.route.snapshot.queryParamMap.get('id') ?? '';
    if (!this.idTransaccion) {
      this.cargando = false;
      this.errorMsg = 'La pasarela no devolvió el número de la transacción.';
      return;
    }
    this.confirmar();
  }

  confirmar(): void {
    this.cargando = true;
    this.errorMsg = '';
    this.comercialSvc.confirmarPagoEnLinea(this.idTransaccion).pipe(finalize(() => this.cargando = false)).subscribe({
      next: (r) => this.resultado = r,
      error: (err) => this.errorMsg = mensajeError(err, 'No se pudo confirmar el pago.')
    });
  }
}
