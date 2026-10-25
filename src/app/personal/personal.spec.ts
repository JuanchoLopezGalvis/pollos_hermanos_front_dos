import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Personal } from './personal';
import { PersonalService } from '../services/personal.service';
import { CatalogoService } from '../services/catalogo.service';
import { AuthService } from '../services/auth.service';

describe('Personal', () => {
  it('valida el formulario antes de enviarlo', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['tienePermiso', 'tieneAlguno']);
    auth.tienePermiso.and.returnValue(true);
    await TestBed.configureTestingModule({
      declarations: [Personal],
      imports: [FormsModule, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: PersonalService, useValue: { obtener: () => of([]) } }, { provide: CatalogoService, useValue: { obtener: () => of([]) } },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) },
        { provide: ConfirmationService, useValue: jasmine.createSpyObj('ConfirmationService', ['confirm']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(Personal);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.nuevo();
    expect(c.form.valid).toBeFalse();
    c.form.patchValue({ documento: '101', nombres: 'Berta', apellidos: 'Uno', idCargo: 5 });
    expect(c.form.valid).toBeTrue();
  });
});
