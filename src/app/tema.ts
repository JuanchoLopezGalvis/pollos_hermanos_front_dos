import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Tema de PrimeNG basado en Aura, con la escala roja como primaria y botones negros y modo claro. */
export const TemaPollos = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fef2f3',
      100: '#fde3e5',
      200: '#fbc9ce',
      300: '#f79ca5',
      400: '#ef6572',
      500: '#e11d2e',
      600: '#c41224',
      700: '#a30f1e',
      800: '#870f1c',
      900: '#6f111b',
      950: '#3d050a'
    },
    colorScheme: {
      light: {
        primary: {
          color: '#141414',
          contrastColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}'
        }
      }
    }
  }
});
