# Comentario analítico

La ejecución de carga normal sobre DummyJSON alcanzó 20 VUs y produjo 2.447 solicitudes a un throughput de 10,06 req/s. La lectura debe hacerse contra los SLO definidos en la configuración: P95 global menor que 800 ms, P99 menor que 1.500 ms y tasa de error HTTP menor que 1%.

El primer KPI crítico es la **latencia P99**, que llegó a 2.957,53 ms. El valor incumple el SLO por 1.457,53 ms y es 5,7 veces la mediana (P50: 202,95 ms). Esto describe una cola larga: la respuesta típica es rápida, pero una fracción pequeña de usuarios espera varios segundos. El P95 fue 515,11 ms y sí cumplió, por lo que el promedio y la experiencia de la mayoría no bastan para declarar saludable el servicio. Este patrón puede relacionarse con variabilidad de red pública, límites de una API de terceros, cold starts o esperas aguas abajo. No permite afirmar saturación de CPU sin mediciones del host. El panel incluye el P99 precisamente para visibilizar el riesgo que un promedio ocultaría.

El segundo KPI crítico es el **throughput**, con 10,06 req/s durante la carga. Es una medida de capacidad entregada: el sistema atendió la demanda del escenario y llegó al máximo de 20 VUs. Debe interpretarse junto con la calidad. La tasa de error HTTP observada es 0% y los checks funcionales pasaron 4.282 de 4.282. Por tanto, el problema principal no es una caída general ni respuestas incorrectas, sino degradación de la cola alta de latencia. La combinación de throughput sostenido, checks correctos y P99 fuera de objetivo sugiere que el servicio puede cumplir para la mayoría, pero no garantiza una experiencia consistente para el extremo de la distribución.

La evidencia de sistema tiene una limitación: k6 aporta `data_received` (92,53 kB/s) y `data_sent` (3,46 kB/s), pero no aporta series cuantitativas de CPU, RAM o I/O del servidor. Esas señales se muestran como no instrumentadas y no como cero. Además, el CSV secundario no coincide exactamente con el resumen oficial: contiene 2.576 muestras de solicitudes y produce percentiles distintos. Por trazabilidad, el dashboard usa `summary.json` y `raw-results.json` como fuente primaria y conserva el CSV separado.

## Recomendaciones priorizadas

1. **Alta, bajo esfuerzo:** incorporar Prometheus/APM y trazas distribuidas por endpoint y `step`, con CPU, RAM, I/O, red, códigos HTTP y tiempos aguas abajo. Estimación: 0,5–1 día. Es la acción de mayor impacto porque permite localizar la causa del P99.
2. **Alta, bajo esfuerzo:** revisar timeouts, reintentos y reutilización del pool de conexiones; separar alertas P95/P99 para `browse`, `search`, `login` y `perfil`. Estimación: 1 día. Puede reducir esperas puntuales sin aumentar la carga.
3. **Media, bajo esfuerzo:** repetir tres veces la prueba en un entorno controlado y comparar los mismos SLO. Estimación: 1 día. Permitirá distinguir variación de red pública de saturación reproducible y validar la mejora.

En conclusión, el SLO P95 se cumple y el de error también, pero el P99 no. La próxima iteración debe priorizar observabilidad y reducción de la cola larga antes de elevar los VUs.
