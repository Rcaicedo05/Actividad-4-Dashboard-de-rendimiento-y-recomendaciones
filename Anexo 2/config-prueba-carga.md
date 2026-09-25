# Documento de configuración — Prueba de carga con k6

## 1. Entorno objetivo
- **Sistema bajo prueba (SUT):** DummyJSON API — `https://dummyjson.com`
- **Naturaleza:** API pública de datos simulados, sin infraestructura propia visible, usada aquí como sustituto académico de un backend real
- **Endpoints ejercitados:**
  - `GET /products?limit=10` — listado (lectura simple)
  - `GET /products/search?q={term}` — búsqueda (parametrizada)
  - `POST /auth/login` — autenticación (origen de la correlación)
  - `GET /auth/me` — perfil autenticado (usa el token del paso anterior)

## 2. Herramienta y versión
- k6 (última versión estable instalada localmente)
- Ejecución local, sin balanceador ni CDN propio de por medio

## 3. Perfil de carga
| Parámetro | Valor | Justificación |
|---|---|---|
| Tipo de prueba | Carga normal (load) | Alcance priorizado de la actividad |
| VUs objetivo | 20 | Concurrencia moderada representativa de uso normal |
| Ramp-up | 30s → 20 VUs | Evita arranque abrupto no realista |
| Estado estable | 3 min a 20 VUs | Ventana suficiente para percentiles estables |
| Ramp-down | 30s → 0 | Cierre ordenado de sesiones |
| Think time | 1–2.5s entre pasos | Simula tiempo de lectura/decisión de un usuario real |
| TPS estimado | ~8–10 req/s | 20 VUs × 4 requests / (~8-9s de ciclo por VU) |

## 4. Datos y escenarios
- 3 usuarios de prueba (credenciales oficiales de DummyJSON) seleccionados aleatoriamente por VU
- 5 términos de búsqueda representativos, seleccionados aleatoriamente
- La selección aleatoria evita que todos los VUs golpeen el mismo recurso (caché artificial)

## 5. Correlación
- El `accessToken` devuelto por `POST /auth/login` se extrae y reutiliza en el header `Authorization` de `GET /auth/me`
- Si el login falla, el flujo corta antes del paso 4 para no contaminar esa métrica con errores derivados

## 6. Umbrales (SLA/SLO)
- `p95` tiempo de respuesta global < 800 ms
- `p99` tiempo de respuesta global < 1500 ms
- Tasa de error HTTP < 1%
- `p95` de login < 600 ms / `p95` de búsqueda < 700 ms

## 7. Supuestos
- La API pública puede tener latencia de red variable fuera de nuestro control (no es un entorno dedicado)
- No se realizan pruebas de estrés/spike contra este servicio público por buenas prácticas de uso responsable de APIs de terceros
- Los umbrales fueron definidos como ejercicio académico, no como SLA contractual real

## 8. Comandos de ejecución y evidencia
```bash
# Ejecución con resumen HTML (requiere k6-reporter o --summary-export)
k6 run --summary-export=resultados/summary.json k6-load-test-dummyjson.js

# Exportar resultados crudos en formato JSON (línea por métrica)
k6 run --out json=resultados/raw-results.json k6-load-test-dummyjson.js

# Variables de entorno soportadas
k6 run -e BASE_URL=https://dummyjson.com -e VUS=20 k6-load-test-dummyjson.js
```
- Conservar `resultados/summary.json` y `resultados/raw-results.json` como evidencia cruda
- Tomar capturas de la consola de k6 (resumen final con thresholds ✓/✗) como evidencia de dashboard
