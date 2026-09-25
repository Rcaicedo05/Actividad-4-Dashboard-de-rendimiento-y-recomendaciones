# Comentario analítico

El informe técnico documenta dos corridas de carga normal sobre DummyJSON con el mismo perfil de 20 VUs. La corrida 1 produjo 2.568 solicitudes a 10,57 req/s; la corrida 2, usada para el dashboard, produjo 2.447 solicitudes a 10,06 req/s. Se comparan con los SLO: P95 menor que 800 ms, P99 menor que 1.500 ms y error HTTP menor que 1%.

El primer KPI crítico es la **latencia P99**. En la línea base fue 679,27 ms y en la corrida 2 subió a 2.957,53 ms, incumpliendo el SLO por 1.457,53 ms. La mediana permaneció estable (200,76 ms frente a 202,95 ms), pero la cola se multiplicó más de cuatro veces. La experiencia típica es estable, aunque una fracción pequeña espera varios segundos. El P95 de la corrida 2 fue 515,11 ms y cumplió; por eso el promedio no basta para declarar saludable el servicio. La variación puede relacionarse con red pública, infraestructura compartida, límites de terceros o esperas aguas abajo.

El segundo KPI crítico es el **throughput**, cercano a 10 req/s en ambas corridas (10,57 y 10,06), con error HTTP de 0% y checks al 100%. Representa la capacidad entregada: el sistema atendió la demanda a 20 VUs. Debe leerse junto con la latencia: no hubo caída general ni respuestas incorrectas, sino degradación de la cola alta. Además, `login` fue el único paso que rompió su umbral: pasó de 314,95 ms a 609,45 ms de P95 frente al límite de 600 ms. Es el primer punto a investigar.

No hay CPU, RAM o I/O del servidor porque DummyJSON es un tercero. El informe registra CPU del cliente en 11% durante 10 VUs y 30 s: el generador no fue el cuello de botella, pero el dato no representa al SUT. k6 aporta `data_received` (92,53 kB/s) y `data_sent` (3,46 kB/s). El CSV es evidencia secundaria y no se mezcla con los percentiles de la corrida 2.

## Recomendaciones priorizadas

1. **Alta, bajo esfuerzo:** investigar `POST /auth/login` con una prueba aislada y trazas/APM para medir generación de token y dependencias. Estimación: 0,5–1 día. Es el único paso que incumplió su SLO.
2. **Alta, bajo esfuerzo:** ejecutar 5–10 repeticiones en distintos horarios y comparar P95/P99. Estimación: 1 día. Permitirá distinguir variación aleatoria de un patrón reproducible.
3. **Media, bajo esfuerzo:** instrumentar Prometheus/APM y revisar timeouts, reintentos con backoff y pool de conexiones; luego escalar a 30, 50 y 80 VUs. Estimación: 1–2 días. Permitirá localizar la cola y comprobar si depende de la concurrencia.

En conclusión, el SLO P95 y el de error se cumplen en la corrida 2, pero el P99 y el login P95 no. La comparación de dos corridas demuestra que una sola ejecución no caracteriza el servicio; primero deben repetirse las mediciones y aislarse login antes de elevar los VUs.
