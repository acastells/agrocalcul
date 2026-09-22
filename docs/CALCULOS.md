# Cálculos y unidades

La lógica verificable está en `web/calc.mjs`. Las funciones no consultan la base de datos ni modifican sus argumentos. La presentación usa `Intl.NumberFormat('ca-ES')` con dos decimales; los valores internos no se redondean en cada operación.

## Ingresos y gastos

Para cada ingreso:

- Modo `manual`: se toma `amount`.
- Modo `calculated`: se toma `quantity × price`.

Los ingresos totales son la suma de esas cantidades. Los gastos de producción y generales se suman según `group`. Los gastos totales son la suma de ambas clases. El resultado es ingresos menos gastos. Cada magnitud por hectárea se divide entre `area`.

### Caso original de almendra, 2025

| Concepto             | Resultado esperado |
| -------------------- | -----------------: |
| Superficie           |              32 ha |
| Ingresos             |       387.696,09 € |
| Gastos de producción |        50.070,00 € |
| Gastos generales     |         3.400,00 € |
| Gastos totales       |        53.470,00 € |
| Resultado            |       334.226,09 € |

Los importes originales de VAIRO y LAUREANNE son manuales. VAIRO conserva 161.446,00 €, aunque 30.441 × 5,30 da 161.337,30 €. LAUREANNE conserva 75.926,00 €, aunque 14.601 × 5,20 da 75.925,20 €. Cambiar de modo cambia el total; no es una diferencia de redondeo introducida por la aplicación.

## Dosis NPK

Los fertilizantes se procesan **en el orden del array**. Se acumulan tres aportaciones por hectárea: N, P y K.

1. Si la fila es manual, su dosis es `kgHa`.
2. Si calcula por un nutriente, se toma su objetivo menos la aportación acumulada por filas anteriores.
3. Se limita el resto a cero como mínimo, para evitar dosis negativas.
4. Se divide ese resto entre el porcentaje del nutriente dividido por 100.
5. Se añaden al balance las aportaciones de N, P y K de la dosis resultante.

Si el porcentaje del nutriente seleccionado es cero, la implementación conserva el comportamiento existente y devuelve dosis cero. No puede cubrir ese objetivo con ese producto. Esto no es un optimizador de mezclas y no busca simultáneamente una solución a los tres objetivos. Añadir una fila al final no recalcula hacia atrás las dosis anteriores.

No hay conversión entre fósforo/potasio elementales y óxidos. Las etiquetas y unidades corresponden al documento aportado. El orden es significativo, aunque la interfaz no dispone actualmente de arrastrar filas para reordenarlas.

## Aplicación y costes

Para cada fila:

```text
kgSector = kgHa × hectáreas
litrosSector = kgSector / densidad
litrosDía = litrosSector / días
litrosSemana = litrosDía × 7
minutosDía = litrosDía / cabal
minutosSemana = minutosDía × 7
costeSector = kgSector × precioKg
costeHa = costeSector / hectáreas
```

Los minutos representan el tiempo de inyección de cada producto al cabal indicado, no necesariamente la duración total del riego. La función devuelve también los resultados semanales aunque la tabla compacta actual muestra los diarios.

### Caso original HONEY GLO, sector 9

Superficie 1,4 ha; objetivos 120/40/240 UF/ha; complejo 2/2/9; nitrogenado 20/0/0; 105 días; 2 L/min; densidad 1,2 kg/L.

| Magnitud          |     Complejo | Nitrogenado |
| ----------------- | -----------: | ----------: |
| Dosis kg/ha       | 2.666,666667 |  333,333333 |
| Kg del sector     | 3.733,333333 |  466,666667 |
| Litros del sector | 3.111,111111 |  388,888889 |
| Minutos por día   |    14,814815 |    1,851852 |

Balance resultante: N = 120, P = 53,333333 y K = 240 UF/ha. La interfaz mantiene el exceso de P como valor calculado, sin banners informativos. Ambos precios originales son cero. Con 0,50 €/kg para el complejo y 1 €/kg para el nitrogenado, el coste del sector es 2.333,333333 €.

## Precisión

Se usa `Number` de JavaScript (coma flotante binaria). Las pruebas comparan cantidades con tolerancia `1e-7`. No se implementan contabilidad en céntimos, impuestos, IVA ni reglas fiscales de redondeo por línea. Si se incorpora facturación, habrá que definir esa política antes de modificar la aritmética.
