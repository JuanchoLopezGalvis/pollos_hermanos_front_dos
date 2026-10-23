import { Component, signal } from '@angular/core';

/** Componente raíz: solo aloja el router y los avisos globales. */
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('pollos-hermanos-front-dos');
}
