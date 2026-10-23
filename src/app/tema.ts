import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Tema de PrimeNG basado en Aura, con el verde de finca como color primario y modo claro. */
export const TemaPollos = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef5f0',
      100: '#d6e8dc',
      200: '#aecfba',
      300: '#7fb092',
      400: '#548f6c',
      500: '#3a7353',
      600: '#2f5a41',
      700: '#254835',
      800: '#1b3728',
      900: '#13261c',
      950: '#0a150f'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.900}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.950}'
        }
      }
    }
  }
});
