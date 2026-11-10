# Los Pollos Hermanos: frontend (propuesta dos, "Campo vivo")

Frontend del Proyecto Final de Bases de Datos 2 (Universidad El Bosque). Consume la API de
`pollos_hermanos_back` (Spring Boot). Sigue la misma estructura del proyecto anterior del equipo
(Donatello IA): Angular 20 con `NgModule`, componentes no standalone y PrimeNG.

Esta es una segunda propuesta visual: modo claro, verde de finca con amarillo yema como acento,
tipografías Bricolage Grotesque e Instrument Sans y menú lateral fijo. La lógica, los servicios
y las rutas son los mismos de `pollos_hermanos_front`.

## Requisitos

- Node.js 22 LTS (o 20.19+) y npm. Con nvm: `nvm install 22`.
- El backend corriendo en `http://localhost:8081`.

## Comandos

```bash
npm install          # instalar dependencias
npm start            # servidor de desarrollo en http://localhost:4200
npm run build        # build de producción en dist/
npm test             # pruebas unitarias (Karma + Jasmine, necesita Chrome)
```

En desarrollo, las peticiones a `/api` pasan por `proxy.conf.json` hacia el backend, así que no hay
problemas de CORS. Para producción, ajusta la URL en `src/environments/environment.prod.ts`.

## Estructura

```
src/app/
├── app-module.ts / app-routing-module.ts   módulo raíz y rutas
├── tema.ts                                 tema de PrimeNG con los colores de la marca
├── protection/   guard: exige sesión y los permisos declarados en data.permisos
├── services/     clientes HTTP, AuthService, interceptor JWT y mensajes de error
├── login/        inicio de sesión (usuario o correo)
├── menu/         página de inicio con los módulos según permisos
├── sidebar/      barra lateral compartida de las pantallas internas
├── seguimiento/  seguimiento diario del crecimiento (MongoDB) y curva semanal
├── usuarios/     usuarios, roles asignados y permisos directos
├── roles/        roles y sus permisos
└── permisos/     catálogo de permisos (modulo.accion)
```

## Reglas

- Las reglas de negocio viven en PostgreSQL; el frontend solo valida formato y muestra en español
  el mensaje que devuelve el backend (`ErrorApiDTO`).
- Los menús se arman con los permisos del token, pero quien autoriza de verdad es el backend.
- Los módulos de lotes, alimentación, sanidad, costos, ventas y pagos aparecen como "Próximamente"
  hasta que exista su API.
