/**
 * Configuración para desarrollo. Las peticiones a /api pasan por proxy.conf.json
 * hacia el backend en http://localhost:8081, así que no hay problemas de CORS.
 */
export const environment = {
  production: false,
  api: '/api'
};
