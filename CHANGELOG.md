# Historial de entrega

## 3.1.0 — revisión documentada, 22 de septiembre de 2026

Base: versión publicada 3, commit `f0f5d23939e16691f70de4838e405434c7115234`.

### Mantenibilidad

- Separación de transporte HTTP, cola de guardado, vistas y controles del frontend.
- Compilación de módulos con esbuild en lugar de sustituciones textuales de código.
- Inicialización de datos separada del despacho de peticiones.
- Lectura y validación de JSON en un módulo HTTP.
- Documentación de arquitectura, contrato, fórmulas, seguridad, operación y decisiones.
- Formato uniforme, ESLint y scripts de verificación.
- Eliminación de reglas CSS de la antigua cabecera y pestañas.
- Servidor local con SQLite y emulación limitada de D1 para desarrollo.

### Correcciones

- Una llamada a guardar con cola vacía ya no puede dejar una promesa activa que bloquee escrituras futuras.
- Los conflictos conservan un estado de error explícito y no se ocultan al seguir escribiendo.
- Los snapshots de guardado preservan las ediciones realizadas durante una petición.
- Un cuerpo JSON `null` o un array se rechaza con 400 en lugar de acabar como fallo interno.
- El límite de entrada se aplica en bytes mientras se lee el cuerpo.
- Los importes calculados se limpian también cuando hay entradas inválidas, evitando resultados antiguos visibles.

### Compatibilidad

Se conservan el esquema y migraciones publicadas, el aislamiento por usuario, las fórmulas, los importes manuales originales y la configuración por copia. Los cambios de código de esta entrega no se han desplegado en el sitio existente. Los datos vivos y la lista de invitados siguen gestionados por la plataforma.
