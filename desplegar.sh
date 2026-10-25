#!/bin/bash
# Compila el frontend y publica la versión nueva en nginx.
set -e
cd "$(dirname "$0")"
git pull || echo "Sin git pull (el proyecto no está en un repositorio)"
npm ci
npx ng build
sudo rsync -a --delete dist/pollos-hermanos-front-dos/browser/ /var/www/pollos-hermanos/
echo "Frontend actualizado en /var/www/pollos-hermanos"
