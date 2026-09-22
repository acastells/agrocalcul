# Pruebas y calidad

## Verificación reproducible

```sh
npm ci
npm run verify
```

El comando ejecuta comprobación de sintaxis, ESLint, Prettier y las pruebas de Node tras compilar. Las pruebas utilizan SQLite real a través del mismo subconjunto de interfaz que consume el repositorio D1. No necesitan acceder al sitio publicado ni modifican producción.

## Casos cubiertos

| Archivo                       | Casos                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/calculations.test.mjs` | Totales originales, importe manual, proporcionalidad de superficie, precios NPK y dosis no negativa                                                                                              |
| `tests/database.test.mjs`     | Cierre/reapertura de base, CRUD, snapshots de configuración, NPK independientes, revisión obsoleta, aislamiento por usuario, autenticación, origen, JSON inválido, tamaño e importación heredada |
| `tests/save-queue.test.mjs`   | Guardar tras una cola vacía, editar durante una petición, recuperación de fallo temporal y bloqueo de conflictos                                                                                 |

La suite contiene 12 casos automatizados. Las pruebas de concurrencia usan promesas controladas; no dependen de tiempos de red ni esperas arbitrarias.

## Controles estáticos

- Imports y variables sin uso.
- Identificadores no definidos.
- Igualdad estricta y uso de `const` donde corresponde.
- Bloques vacíos injustificados, código inalcanzable y condiciones constantes.
- Prohibición de `eval` y ejecución implícita de cadenas.
- Formato consistente y sintaxis válida.

ESLint no es una prueba formal de ausencia de defectos. La suite no garantiza que no exista ningún code smell: los controles y decisiones revisados quedan explícitos para que otra persona pueda mantenerlos.

## Comprobaciones de entrega

Se verifican también la compilación ESM, la generación sin cambios de las migraciones existentes, los enlaces internos de documentación y una petición real contra el servidor local. El ZIP se genera con archivos seleccionados, excluyendo dependencias, historial Git, bases locales y secretos, e incluye un manifiesto de integridad SHA-256.

## Lo que no se ha verificado

No se ha hecho una nueva prueba visual/end-to-end en navegador de esta copia de entrega ni una publicación de esta revisión. El adaptador de pruebas no emula cuotas, replicación o latencia de D1. No se afirma una auditoría completa de vulnerabilidades de dependencias.

Antes de publicar cambios de UI, conviene verificar manualmente escritorio y móvil, teclado, campos inválidos, reconexión y guardado desde dos pestañas. Para cambios del modelo, probar una copia de datos antiguos antes de aplicar migraciones.
