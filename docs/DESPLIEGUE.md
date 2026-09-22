# Despliegue y operación

## Procedencia y alcance

El sitio del que se exportó el código es:

`https://agrocalcul-ingressos-npk.alcarras-arnau-caste.chatgpt.site`

La entrega es una revisión del código fuente. No cambia ese sitio ni su política de acceso. `.openai/hosting.json` conserva el ID existente y el binding lógico `DB`. Para crear una aplicación independiente, registra otro sitio y utiliza el ID que devuelva la plataforma; no reutilices el ID de producción para una prueba.

## Resultado de compilación

```sh
npm ci
npm run verify
```

El build genera:

```text
 dist/
   server/index.js
   .openai/hosting.json
   .openai/drizzle/
```

`dist/server/index.js` es ESM y exporta un objeto con `fetch(request, env)`. esbuild resuelve imports de servidor y un módulo virtual que contiene los assets del navegador. No se requiere `node_modules` en el runtime del Worker. La carpeta `dist` es reproducible y no forma parte del ZIP fuente.

## Publicar con Sites

La publicación requiere una sesión con permisos sobre el sitio y las herramientas de Sites. El ZIP no incorpora una clave ni un comando capaz de saltarse esa autorización.

Flujo de publicación:

1. Leer el sitio existente y conservar su audiencia actual.
2. Ejecutar las comprobaciones y compilar.
3. Guardar el código exacto en el repositorio asociado y obtener el SHA completo.
4. Empaquetar el output del build con el manifiesto y las migraciones.
5. Crear una versión de Sites asociada a ese SHA y al paquete.
6. Publicar esa versión y esperar al estado final de la operación.
7. Comprobar la existencia del binding `DB` y de las tablas esperadas.

Usa las herramientas y helpers vigentes de Sites en tu sesión: las rutas internas de los plugins cambian de versión y por eso no se fijan en los scripts de este proyecto.

El sitio original ya tiene un invitado externo. No debe tratarse como un sitio exclusivo del propietario ni hacerse público para desplegarlo. Los accesos de colaboradores se gestionan en Sites, no en la tabla `records`.

## Migraciones

Las migraciones son parte de la publicación. Pueden aplicarse antes de que finalice la activación del Worker; un fallo posterior no significa que el esquema haya vuelto atrás. Antes de reintentar un fallo de migración, identifica qué SQL se aplicó realmente. No reescribas un archivo ya aplicado.

Si cambias solo código, no generes una migración vacía. Si amplías campos dentro de `data` sin cambiar columnas SQL, diseña igualmente una estrategia para los JSON antiguos. Drizzle no transforma automáticamente esos documentos.

## Otra infraestructura

El código del Worker es portable a un runtime compatible, pero la autenticación **depende de Sites**. Antes de alojarlo fuera de esa plataforma, necesitas un proveedor de identidad, una política de acceso y un proxy/backend que elimine cualquier cabecera de identidad del cliente y establezca una identidad verificada. El servidor `npm run dev` no cubre esa necesidad.

El repositorio SQL utiliza solo `prepare().bind().first()/all()/run()` y `batch()`. El adaptador local reproduce ese subconjunto para desarrollo; no pretende reproducir todas las características, cuotas o errores de Cloudflare D1.

## Recuperación

Conserva por separado versiones de código y copias de datos. Volver a publicar una versión de código anterior no restaura registros borrados ni deshace una migración. Antes de volver atrás, comprueba la compatibilidad del código con el esquema vigente. Si necesitas recuperar contenido, usa una copia de base de datos validada.

No se incluyen automatismos de borrado, exportación ni restauración de producción. Los logs de la app registran el mensaje de fallos inesperados; no deben ampliarse con cuerpos completos que contengan datos agrícolas privados.
