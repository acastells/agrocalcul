# Contrato HTTP

Base: el mismo origen que la web. Las respuestas de API son JSON con `Cache-Control: no-store`. No hay una API pública para terceros ni un token de aplicación incluido en esta entrega.

## Autenticación y peticiones

En producción, Sites añade `oai-authenticated-user-id` después de autenticar al visitante. La aplicación usa esa identidad como `owner`. El navegador no debe enviar ni controlar ese encabezado.

Todas las escrituras requieren `X-Agro-Request: 1`. Cuando existe `Origin`, debe coincidir exactamente con el origen de la URL del Worker. No se permiten respuestas CORS para otros orígenes. El cuerpo debe ser un objeto JSON, con un máximo de 2.000.000 bytes.

## Rutas

| Método | Ruta               | Entrada                | Salida                         |
| ------ | ------------------ | ---------------------- | ------------------------------ |
| POST   | `/api/bootstrap`   | `{}` o `{legacy: ...}` | `{records, imported}`          |
| GET    | `/api/records`     | Ninguna                | `{records}` del usuario actual |
| POST   | `/api/records`     | `{id, kind}`           | `{record}` nuevo, HTTP 201     |
| PUT    | `/api/records/:id` | `{revision, data}`     | `{record}` actualizado         |
| DELETE | `/api/records/:id` | `{revision}`           | `{deleted: true}`              |

`record` tiene forma `{id, kind, data, revision}`. Las fechas de auditoría y el propietario se quedan en la base de datos y no se exponen en las respuestas. La revisión empieza en 1 y aumenta en cada guardado aceptado.

### Inicializar

```json
{}
```

Crea los datos iniciales una sola vez y devuelve el conjunto actual. `imported: true` significa que los datos heredados del navegador se utilizaron en esa inicialización. No indica que se hayan fusionado varios dispositivos.

### Crear un periodo

```json
{
  "id": "97c37b95-e71d-441b-8bd1-925397d4a281",
  "kind": "production"
}
```

El cliente genera el UUID una vez. El servidor copia la configuración guardada y utiliza el año UTC actual para las fechas iniciales. Para NPK, usa `kind: "npk"`; se crea un cálculo independiente con parámetros iniciales del modelo. No se aceptan importes o filas arbitrarias en esta ruta: se editan con PUT.

Repetir el mismo ID existente devuelve el registro, con HTTP 200. Esto permite que el mismo intento de creación sea idempotente. La interfaz no ofrece un reintento automático de creación tras una respuesta perdida.

### Guardar

El cliente debe reenviar el **objeto `data` completo**, incluyendo arrays. No es un PATCH. Por ejemplo, tras obtener un registro:

```js
const response = await fetch(`/api/records/${record.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'X-Agro-Request': '1' },
  body: JSON.stringify({ revision: record.revision, data: record.data }),
});
```

Una respuesta exitosa contiene la nueva revisión. Debe utilizarse para el siguiente guardado. No inventar revisiones ni repetir un PUT con una revisión vieja después de un conflicto.

### Eliminar

DELETE requiere la revisión vigente. El servidor impide eliminar `config`. No hay borrado recuperable, papelera ni historial de contenido dentro de la app; la interfaz pide confirmación para eliminar un periodo o cálculo entero.

## Errores

```json
{ "error": "Hi ha canvis en un altre dispositiu. Recarrega." }
```

| Estado | Motivo principal                                                   | Tratamiento                              |
| ------ | ------------------------------------------------------------------ | ---------------------------------------- |
| 400    | JSON incorrecto, campos inválidos o revisión no válida             | Corregir los datos                       |
| 401    | No existe identidad autenticada                                    | Iniciar sesión en el sitio               |
| 403    | Origen/cabecera de escritura rechazados o borrado de configuración | Revisar la operación y el acceso         |
| 404    | Ruta inexistente o registro ajeno/inexistente                      | Actualizar la selección                  |
| 405    | Método no admitido                                                 | Usar el contrato de rutas                |
| 409    | Revisión obsoleta o configuración no inicializada                  | Recargar explícitamente; no sobrescribir |
| 413    | Cuerpo demasiado grande                                            | Reducir la petición                      |
| 503    | Fallo no esperado de almacenamiento/servidor                       | Conservar el borrador y reintentar       |

Un registro ajeno responde como no encontrado. El servidor no devuelve detalles internos de SQL. Los fallos no previstos se registran sin imprimir el cuerpo de la petición.

## Assets

`/` sirve `index.html`. Los archivos presentes en `web/` se integran en un mapa durante el build y se sirven por su ruta. No existe navegación a archivos fuera de ese mapa. Las páginas no implementan un router de múltiples URLs: los apartados se seleccionan dentro de la misma página.
