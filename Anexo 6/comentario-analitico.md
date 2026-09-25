# Comentario analítico

El informe técnico documenta dos corridas de carga normal sobre DummyJSON con el mismo perfil de 20 VUs. La corrida 1 produjo 2.568 solicitudes a 10,57 req/s; la corrida 2, usada para el dashboard, produjo 2.447 solicitudes a 10,06 req/s. La lectura debe hacerse contra los SLO definidos: P95 global menor que 800 ms, P99 menor que 1.500 ms y tasa de error HTTP menor que 1%.

El primer KPI crítico es la **latencia P99**. En la línea base fue 679,27 ms y en la corrida 2 subió a 2.957,53 ms, incumpliendo el SLO por 1.457,53 ms. La mediana permaneció estable (200,76 ms frente a 202,95 ms), mientras que la cola se multiplicó más de cuatro veces. Esto indica que la experiencia típica es estable, pero una fracción pequeña de usuarios espera varios segundos. El P95 de la corrida 2 fue 515,11 ms y sí cumplió el objetivo de 800 ms, por lo que el promedio y la experiencia de la mayoría no bastan para declarar saludable el servicio. La variación puede relacionarse con red pública, infraestructura compartida, límites de terceros o esperas aguas abajo.

El segundo KPI crítico es el **throughput**, que se mantuvo cercano a 10 req/s en ambas corridas (10,57 y 10,06 req/s), con error HTTP de 0% y checks funcionales al 100%. Es una medida de capacidad entregada: el sistema atendió la demanda y llegó al máximo de 20 VUs. Sin embargo, debe leerse junto con la latencia. El problema principal no es una caída general ni respuestas incorrectas, sino degradación de la cola alta. Además, el paso de login fue el único que rompió su umbral propio: su P95 pasó de 314,95 ms a 609,45 ms frente al límite de 600 ms. Esto convierte a autenticación en el primer punto a investigar.

La evidencia de sistema tiene una limitación: no hay CPU, RAM o I/O del servidor porque DummyJSON es un tercero. El informe sí registra CPU del equipo cliente en 11% durante una corrida auxiliar de 10 VUs y 30 s; ese dato indica que el generador no fue el cuello de botella, pero no representa al SUT. k6 aporta además `data_received` (92,53 kB/s) y `data_sent` (3,46 kB/s). El CSV conserva evidencia secundaria de otra exportación y no debe mezclarse con los percentiles de la corrida 2.

## Recomendaciones priorizadas

1. **Alta, bajo esfuerzo:** investigar `POST /auth/login` con una prueba aislada y trazas/APM, incluyendo tiempos de generación de token y dependencias. Estimación: 0,5–1 día. Es el único paso que incumplió su SLO propio.
2. **Alta, bajo esfuerzo:** ejecutar 5–10 repeticiones en distintos horarios y comparar P95/P99. Estimación: 1 día. Permitirá distinguir variación aleatoria de un patrón reproducible antes de cambiar infraestructura.
3. **Media, bajo esfuerzo:** instrumentar Prometheus/APM y revisar timeouts, reintentos con backoff y pool de conexiones; después escalar gradualmente a 30, 50 y 80 VUs. Estimación: 1–2 días. Permitirá localizar la cola y comprobar si depende de la concurrencia.

En conclusión, el SLO P95 y el de error se cumplen en la corrida 2, pero el P99 y el login P95 no. La comparación de dos corridas demuestra que una sola ejecución no caracteriza el servicio; primero deben repetirse las mediciones y aislarse login antes de elevar los VUs.
