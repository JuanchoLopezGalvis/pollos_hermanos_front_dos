import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Elemento de un catálogo (cargo, tipo de cliente, método de pago, categoría de gasto). */
export interface CatalogoDTO {
  id: number;
  codigo: string;
  nombre: string;
}

export type NombreCatalogo = 'cargos' | 'tipos-cliente' | 'metodos-pago' | 'categorias-gasto';

/** Cliente de /catalogos. */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly base = `${environment.api}/catalogos`;

  constructor(private http: HttpClient) {}

  obtener(nombre: NombreCatalogo): Observable<CatalogoDTO[]> {
    return this.http.get<CatalogoDTO[]>(`${this.base}/${nombre}`);
  }
}
