# Modelo de datos

## Persistencia

D1 contiene una tabla de documentos de dominio. Los conceptos y abonos se guardan dentro del JSON de su registro, de manera que un guardado representa una unidad coherente.

| Columna      | Tipo               | Significado                                         |
| ------------ | ------------------ | --------------------------------------------------- |
| `owner`      | TEXT, no nulo      | Identificador autenticado estable dentro del sitio  |
| `id`         | TEXT, no nulo      | `config`, IDs iniciales o UUID de un registro nuevo |
| `kind`       | TEXT, no nulo      | `production`, `npk` o `config`                      |
| `data`       | TEXT, no nulo      | JSON validado                                       |
| `revision`   | INTEGER, inicial 1 | Control optimista de concurrencia                   |
| `created_at` | TEXT               | Fecha UTC ISO de creación                           |
| `updated_at` | TEXT               | Fecha UTC ISO del último guardado                   |

La clave primaria compuesta es `(owner, id)`. Sirve tanto para localizar un registro del usuario como para listar su conjunto. No se añade otro índice redundante. El esquema SQL no impone cada condición del JSON: esa responsabilidad corresponde a `validateData`.

## Producción

Un registro `production` tiene `title`, `company`, `crop`, `year`, `area`, `startDate`, `endDate`, `income` y `expenses`.

- `area`: hectáreas, estrictamente positivas.
- `year`: entero de 1900 a 9999.
- Fechas: `YYYY-MM-DD`, fechas reales y comienzo no posterior al final. El año es una etiqueta independiente; un periodo puede abarcar más de un año.
- Ingreso: `{name, quantity, price, amount, mode}`. `mode` admite `manual` o `calculated`.
- Gasto: `{name, amount, group}`. `group` admite `production` o `general`.
- `amount` se conserva incluso cuando el ingreso usa cálculo automático; permite volver al importe manual anterior.

## NPK

Un registro `npk` tiene `title`, `company`, `farm`, `sector`, `variety`, `area`, `days`, `flow`, `n`, `p`, `k` y `fertilizers`.

Cada fertilizante contiene:

```json
{
  "name": "Adob complex",
  "basis": "k",
  "n": 2,
  "p": 2,
  "k": 9,
  "kgHa": 0,
  "price": 0,
  "density": 1.2
}
```

`basis` es `n`, `p`, `k` o `manual`. Los porcentajes se almacenan como 2, no como 0,02. `kgHa` es la dosis manual retenida; una base automática determina la dosis calculada sin sobrescribirla. Precio en €/kg, densidad en kg/L, cabal en L/min, objetivos en UF/ha.

## Configuración

El registro fijo `config` contiene `income` y `expenses` con los mismos formatos que producción. Cada nuevo periodo recibe una copia de esos arrays. El servidor realiza esa copia, por lo que crear desde otro navegador usa la configuración guardada, no una caché local desactualizada.

Cambiar una plantilla no cambia periodos anteriores. El primer conjunto de plantillas copia nombres, modos y precios del modelo original, con importes y cantidades inicializados a cero.

## Validación y tamaño

Los nombres tienen un máximo de 200 caracteres; cada lista, 1000 filas. Los valores numéricos deben ser números JSON finitos y no negativos, dentro del límite general de `1e12`. Superficie, densidad y cabal tienen mínimo `0.000001`; días es un entero entre 1 y 100000. Cada porcentaje debe estar entre 0 y 100. Se valida cada porcentaje individual, no su suma química. Los títulos deben contener texto. Los nombres de filas pueden quedar vacíos durante la edición.

El cuerpo HTTP tiene límite de 2.000.000 bytes. Estos límites no equivalen a recomendaciones de volumen de explotación. La API devuelve todo el conjunto del usuario, sin paginación; para grandes historiales habría que añadir consultas parciales.

## Inicialización e importación

`POST /api/bootstrap` ejecuta un lote atómico. Los registros iniciales se insertan únicamente cuando no existe `config`. El uso de `INSERT OR IGNORE` y la clave primaria hace que dos inicializaciones concurrentes no dupliquen esos registros. Eliminar un periodo inicial no provoca su reaparición.

La versión anterior utilizaba `localStorage['agrocalcul-v2']`. En la primera inicialización, el navegador envía esos datos y el servidor los acepta solo si cumplen el contrato actual. El navegador los elimina únicamente cuando la API confirma que se importaron. Si son inválidos, permanecen en el navegador y se usa el modelo original.

**Límite de la importación:** si la base de datos ya está inicializada para ese usuario, otro navegador con datos antiguos no los combina automáticamente. No existe importación masiva ni migración entre usuarios.

## Migraciones y copias

`db/schema.ts` genera `drizzle/*.sql` y `drizzle/meta/*`. La migración inicial incluida es `0000_spooky_pixie.sql`; el nombre procede de Drizzle. No se renombra ni se reescribe un archivo ya aplicado. Los cambios futuros añaden migraciones.

La entrega contiene el esquema y los datos de arranque, pero no una exportación de la base de datos viva. En desarrollo, detén el servidor antes de copiar `.local/agrocalcul.sqlite`. En producción, usa la operación de copia/exportación del proveedor con una revisión de acceso y restauración propia; esta app no incluye un comando de exportación de producción.
