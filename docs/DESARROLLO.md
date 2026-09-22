# Desarrollo local

## Entorno reproducible

Instala Node.js 24 o superior y npm. El adaptador local y las pruebas requieren `node:sqlite`; el Worker de producción no usa módulos de Node. Ejecuta `node --version` antes de empezar.

```sh
npm ci
npm run verify
npm run dev
```

El lockfile es parte de la entrega. `npm ci` instala sus versiones exactas; no lo elimines para solucionar una instalación. esbuild utiliza un ejecutable específico del sistema operativo, por lo que no debes copiar `node_modules` entre sistemas.

En el entorno de preparación fue necesario instalar con `--ignore-scripts` por un error temporal al ejecutar un binario anidado de esbuild. Después se verificaron el build, las migraciones y las pruebas con las dependencias instaladas. En un entorno normal usa `npm ci`; si aplicas `--ignore-scripts`, comprueba después `npm run verify` y `npm run db:generate` antes de trabajar.

## Servidor de desarrollo

`npm run dev` compila primero y ejecuta `scripts/dev.mjs`. Escucha solo en `127.0.0.1:8787`, verifica el host de la petición e inyecta una identidad fija de desarrollo. El navegador conserva el mismo comportamiento que en producción, pero todos sus registros locales pertenecen a `local-developer`.

Variables opcionales:

| Variable        | Predeterminado    | Uso                                 |
| --------------- | ----------------- | ----------------------------------- |
| `PORT`          | 8787              | Puerto local válido entre 1 y 65535 |
| `AGRO_DEV_USER` | `local-developer` | Simular otra identidad local        |

Ejemplo para una shell POSIX:

```sh
AGRO_DEV_USER=segundo-usuario PORT=8788 npm run dev
```

No hay recarga en caliente. Después de editar archivos, detén el proceso con Ctrl+C y vuelve a ejecutar `npm run dev`. Reiniciar conserva la base de datos local. Para empezar desde cero, detén el servidor y renombra `.local/agrocalcul.sqlite`; así conservas una copia antes de generar otra.

Nunca expongas este adaptador local en Internet: la identidad fija es una facilidad de desarrollo, no un mecanismo de autenticación. El binding `DB` de producción lo proporciona Sites.

## Cambios habituales

### Añadir un campo a un cálculo

1. Define su significado y unidad en `docs/DATOS.md` y `docs/CALCULOS.md`.
2. Añade el valor inicial en `web/data.mjs` y en la creación de nuevos registros si corresponde.
3. Amplía la validación de servidor.
4. Decide cómo cargar registros antiguos cuyo JSON no contiene el campo; no supongas que ya lo tienen.
5. Añade el control en la vista y actualiza las funciones puras si afecta resultados.
6. Añade una prueba con un resultado esperado independiente del código.

### Cambiar conceptos por defecto

Para trabajo diario, usa Configuración en la interfaz. Modificar `web/data.mjs` afecta solo inicializaciones futuras: no reescribe datos ya guardados. Los periodos nuevos reciben una copia de la configuración de su propietario.

### Cambiar el esquema SQL

Edita `db/schema.ts` y ejecuta `npm run db:generate`. Inspecciona el SQL nuevo y prueba la migración sobre una copia. Conserva sin cambios los SQL y metadatos ya aplicados. El adaptador local recorre el journal y registra cada migración en `_local_migrations`, dentro de una transacción. Ese registro es exclusivo del desarrollo; producción usa el historial gestionado por Sites.

### Cambiar el frontend

La aplicación usa módulos del navegador. Añadir un archivo `.mjs` dentro de `web/` hace que el build lo incluya como asset. No coloques código de servidor, secretos o datos de producción en esa carpeta. Las cadenas interpoladas con datos de usuario deben pasar por `esc`; los textos simples usan `textContent`.

## Diagnóstico

| Síntoma                                           | Comprobación                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `node:sqlite` no disponible                       | Revisa que Node sea 24 o superior                                                       |
| Puerto ocupado                                    | Cambia `PORT` o detén el proceso anterior                                               |
| Error de formato                                  | Ejecuta `npm run format` y revisa el diff                                               |
| Error 401 en un despliegue propio                 | Falta un proxy de autenticación fiable; no lo resuelvas aceptando cabeceras del cliente |
| Error 409 al guardar                              | Otro guardado avanzó la revisión; conserva las ediciones que necesites y recarga        |
| Cambios que desaparecen tras reiniciar localmente | Comprueba la carpeta de ejecución y `.local/agrocalcul.sqlite`                          |
| Plantillas no afectan un periodo antiguo          | Es el comportamiento previsto: son copias independientes                                |

El comando `npm run check` comprueba sintaxis, no tipos. No existe un proyecto TypeScript completo: TypeScript se usa para el esquema y la configuración de Drizzle.
