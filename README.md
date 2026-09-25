# Dashboard de rendimiento y observabilidad con k6

Proyecto de la Actividad 3 y EV-5 para analizar una prueba de carga sobre la API pública DummyJSON.

## Objetivo

Consolidar indicadores de rendimiento y evidencia de la ejecución de k6:

- Latencia P50, P95 y P99.
- Throughput o solicitudes por segundo.
- Tasa de error y checks funcionales.
- Tráfico de red observado desde k6.
- Estado de disponibilidad de métricas de CPU, RAM e I/O.
- Comentario analítico y recomendaciones priorizadas.

## Abrir el dashboard

Abrir este archivo directamente en el navegador:

`Anexo 4/reporte-dashboard.html`

El dashboard funciona offline y no requiere instalar dependencias. Incluye un selector para consultar la vista global, login o búsqueda.

## Resultados principales

Los valores principales de la ejecución usada como fuente primaria son:

| KPI | Resultado | Objetivo | Estado |
|---|---:|---:|---|
| P50 de latencia | 202,95 ms | Referencia | Informativo |
| P95 de latencia | 515,11 ms | < 800 ms | Cumple |
| P99 de latencia | 2.957,53 ms | < 1.500 ms | No cumple |
| Throughput | 10,06 req/s | Según escenario | Informativo |
| Tasa de error HTTP | 0% | < 1% | Cumple |
| Checks funcionales | 4.282/4.282 | 100% | Cumple |

El principal hallazgo es una cola larga de latencia: el P99 incumple el SLO aunque el P95 y la tasa de error cumplen.

El informe técnico compara dos corridas: corrida 1 P50/P95/P99 de 200,76/277,31/679,27 ms frente a 202,95/515,12/2.957,53 ms en corrida 2. Además, `login` pasó de 314,95 ms a 609,45 ms de P95 y superó su SLO de 600 ms.

## Estructura del proyecto

- `Anexo 1/`: script de prueba de carga `k6-load-test-dummyjson.js`.
- `Anexo 2/`: configuración, escenario de carga y umbrales SLA/SLO.
- `Anexo 3/`: `summary.json` y resultados crudos JSON de k6.
- `Anexo 4/`: dashboard HTML interactivo.
- `Anexo 5/`: resultados crudos en CSV.
- `Anexo 6/`: export JSON, comentario analítico y captura PNG.
- `Informe_Tecnico.pdf`: informe técnico existente del proyecto.

## Evidencias de entrega

- Dashboard: `Anexo 4/reporte-dashboard.html`
- Export del dashboard: `Anexo 6/dashboard-export.json`
- Comentario analítico: `Anexo 6/comentario-analitico.md`
- Captura del dashboard: `Anexo 6/dashboard-kpis.png`

## Reproducir la prueba

Se necesita tener k6 instalado. Desde la carpeta `Anexo 1` se puede ejecutar:

```bash
k6 run --summary-export=../Anexo 3/summary.json \
  --out json=../Anexo 3/raw-results.json \
  k6-load-test-dummyjson.js
```

También se pueden cambiar la URL y el número de VUs:

```bash
k6 run -e BASE_URL=https://dummyjson.com -e VUS=20 k6-load-test-dummyjson.js
```

## Fuentes y limitaciones

La fuente primaria del dashboard es `Anexo 3/summary.json`, contrastada con `Anexo 3/raw-results.json`. El CSV se conserva como evidencia secundaria porque corresponde a una ejecución que no coincide exactamente con el resumen: registra 2.576 muestras de solicitudes frente a 2.447 en el resumen.

Los datos de CPU, RAM e I/O del servidor no fueron instrumentados porque DummyJSON es un servicio de terceros. El informe aporta CPU del cliente: 11% en una corrida auxiliar de 10 VUs durante 30 s. Ese valor se incluye como evidencia del generador, no del servidor. Los valores de red mostrados corresponden al tráfico medido por k6 (`data_received` y `data_sent`), no a la utilización de las interfaces del servidor.

## Recomendaciones resumidas

1. Instrumentar Prometheus/APM y trazas distribuidas por endpoint y paso del flujo.
2. Revisar timeouts, reintentos y reutilización del pool de conexiones.
3. Repetir la prueba en un entorno controlado para separar variabilidad de red de saturación reproducible.
