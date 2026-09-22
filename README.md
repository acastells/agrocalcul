# AgroCàlcul — código fuente documentado

Aplicación privada para gestionar ingresos y gastos agrícolas por periodo, configurar conceptos por defecto y calcular dosis de fertilizantes NPK. Interfaz en catalán y documentación técnica en español.

Esta entrega **3.1.0** procede de la versión publicada **3**, commit `f0f5d23939e16691f70de4838e405434c7115234`. Incluye una revisión de mantenibilidad y correcciones descritas en [CHANGELOG.md](CHANGELOG.md). Es una copia de entrega: no se ha publicado sobre el sitio existente.

## Inicio en cinco minutos

Requisitos: **Node.js 24 o superior** y npm. La base de datos local utiliza `node:sqlite`, incluido en Node; no necesitas instalar un servidor SQL. Ejecuta los comandos desde esta carpeta:

```sh
npm ci
npm run verify
npm run dev
```

Abre **http://127.0.0.1:8787**. Los datos locales se conservan en `.local/agrocalcul.sqlite`. El servidor se limita a la interfaz de red local y utiliza una identidad de desarrollo; no es el servidor de producción. Tras cambiar el código, detén y vuelve a ejecutar `npm run dev`.

## Qué incluye

- Frontend HTML, CSS y JavaScript modular, sin framework.
- Worker HTTP con API de registros, validación, control de acceso y persistencia D1.
- Esquema y migraciones Drizzle originales, sin modificar su historial.
- Compilación ESM con esbuild y dependencias fijadas en `package-lock.json`.
- Adaptador SQLite y servidor de desarrollo local.
- Pruebas de negocio, persistencia, concurrencia y autorización.
- Formato automático, análisis estático y comandos reproducibles.

No incluye una copia de los datos actuales de la base de datos de producción, credenciales, tokens, cuentas de invitados, dependencias instaladas ni archivos compilados. `web/data.mjs` contiene los **datos iniciales de los documentos originales**, no un volcado de producción. El identificador del sitio en `.openai/hosting.json` se conserva para documentar su procedencia; no es una credencial.

## Documentación

| Documento                            | Contenido                                                     |
| ------------------------------------ | ------------------------------------------------------------- |
| [Guía de uso](docs/USO.md)           | Periodos, NPK, configuración y guardado                       |
| [Arquitectura](docs/ARQUITECTURA.md) | Responsabilidades, módulos y recorrido de una modificación    |
| [Modelo de datos](docs/DATOS.md)     | Esquema SQL, JSON, unidades, migraciones e importación        |
| [API](docs/API.md)                   | Rutas, cuerpos, respuestas, validaciones y errores            |
| [Cálculos](docs/CALCULOS.md)         | Fórmulas y casos de referencia de los Excel                   |
| [Desarrollo](docs/DESARROLLO.md)     | Instalación, comandos, estructura y modificaciones habituales |
| [Despliegue](docs/DESPLIEGUE.md)     | Build, Sites, migraciones, identidad y recuperación           |
| [Seguridad](docs/SEGURIDAD.md)       | Autenticación, autorización, entradas y límites de confianza  |
| [Pruebas y calidad](docs/CALIDAD.md) | Comprobaciones ejecutadas y límites de verificación           |
| [Decisiones](docs/DECISIONES.md)     | Motivos de diseño, límites conocidos y alternativas           |
| [Historial de entrega](CHANGELOG.md) | Diferencias frente al código publicado                        |

## Comandos

| Comando                | Resultado                                                   |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Compila y sirve localmente en el puerto 8787                |
| `npm run build`        | Genera el Worker autocontenido y las migraciones en `dist/` |
| `npm test`             | Compila y ejecuta pruebas de Node                           |
| `npm run lint`         | Comprueba errores estáticos sin modificar archivos          |
| `npm run check`        | Comprueba sintaxis JavaScript                               |
| `npm run format`       | Formatea código y documentación                             |
| `npm run format:check` | Verifica formato sin escribir                               |
| `npm run verify`       | Ejecuta sintaxis, análisis, formato, compilación y pruebas  |
| `npm run db:generate`  | Genera una nueva migración tras editar `db/schema.ts`       |

## Acceso y titularidad de datos

Sites controla quién puede visitar el sitio. Dentro de la aplicación, los registros se separan por la identidad autenticada de cada usuario. Invitar a otra persona no le concede acceso a los datos del propietario. El rol de visitante de Sites permite usar la aplicación: no implica que los formularios internos sean de solo lectura.

No se añade una licencia de código abierto en nombre del usuario. Las dependencias mantienen sus propias licencias. La documentación de entrega describe la implementación concreta, no sustituye asesoramiento agronómico ni una auditoría de seguridad.
