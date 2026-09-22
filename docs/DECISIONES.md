# Decisiones y límites de diseño

## JavaScript modular y vistas explícitas

La interfaz actual tiene tres apartados y formularios relativamente pequeños. Se conserva JavaScript del navegador para mantener una base pequeña y fácil de inspeccionar. Los cálculos, controles, transporte, vistas y cola de guardado están separados. No se introduce un framework completo solo para exportar el código.

Las vistas siguen siendo plantillas HTML explícitas. Un editor con cientos de filas visibles, filtros complejos o actualización en tiempo real podría justificar componentes o virtualización. No se añade esa complejidad sin una necesidad concreta.

## Documentos JSON en una tabla

Cada periodo o cálculo se escribe como una unidad con revisión. Esto evita transacciones fila a fila al modificar una mezcla o un presupuesto. El coste es que listar registros carga los JSON completos y no facilita agregaciones SQL por concepto. Si se incorporan informes globales o muchas campañas, debería evaluarse normalizar partidas y añadir paginación.

La revisión es por registro, no por campo: dos usuarios/pestañas que cambien campos distintos del mismo registro pueden entrar en conflicto. Es una elección conservadora para no fusionar silenciosamente información financiera.

## Datos separados por persona

La autorización de Sites controla visitantes; `owner` controla los datos. Se conserva el comportamiento de producción. Un modelo familiar compartido necesitaría una entidad de explotación y miembros autorizados, además de una migración explícita: no debe implementarse quitando simplemente el filtro por usuario.

## Configuración por copia

La configuración se copia al crear el periodo. Es deliberado que cambiar una plantilla no reescriba una campaña histórica. No existe una acción de aplicar retroactivamente plantillas.

## Cálculo NPK secuencial

Se mantiene el orden y la lógica de objetivos del documento y de la aplicación. No hay optimizador de costes ni balance simultáneo N/P/K. El algoritmo devuelve cero cuando el porcentaje del nutriente seleccionado es cero; la documentación hace visible esa limitación sin alterar el producto que ya usa el usuario.

## Sin promesa de trabajo offline

Los borradores pendientes viven en memoria. D1 es la fuente de verdad. Añadir una cola persistente offline requiere gestionar conflictos, dispositivos e identidad tras volver a iniciar sesión. No se ha añadido un almacén paralelo que pueda parecer guardado remoto.

## Dependencias de build

esbuild sustituye la concatenación con sustitución textual de imports/exports. El código de servidor conserva módulos reales y el compilador resuelve su grafo. Prettier y ESLint hacen reproducibles las reglas de mantenimiento. Drizzle se conserva para no cambiar el formato del historial de migraciones.

## Pendientes que requerirían nuevas decisiones

- Compartir registros entre familiares o empresas.
- Exportar/restaurar registros desde la interfaz.
- Fusión de conflictos y refresco en tiempo real.
- Reordenar abonos y resolver mezclas simultáneas.
- Paginación y consultas parciales para grandes historiales.
- Política de redondeo contable, impuestos y divisas.

Son capacidades no implementadas, no se presentan como disponibles en la interfaz ni en la API.
