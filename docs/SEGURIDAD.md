# Seguridad y límites de confianza

## Identidad

Sites controla el acceso al sitio y proporciona una identidad estable en `oai-authenticated-user-id`. La API devuelve 401 si no recibe esa identidad. Todas las consultas de registros incluyen el `owner` recibido del entorno de confianza. El cliente nunca elige el propietario mediante JSON o parámetros de URL.

Esta separación protege los registros de cada usuario, incluso si ambos conocen un mismo ID como `initial-production`. Invitar a una persona autoriza su acceso al producto, no a los registros de otra persona. La aplicación no tiene roles internos de administrador ni tablas compartidas de explotación.

En una infraestructura diferente, aceptar esa cabecera desde Internet sin validación haría suplantable la identidad. El adaptador local fija su propia identidad y solo escucha en loopback; no debe utilizarse como servidor público.

## Escrituras

Cada escritura exige un encabezado personalizado y rechaza un `Origin` distinto del sitio. El servicio no habilita CORS externo. Estas medidas complementan la autenticación y la política de acceso; no sustituyen el control por propietario.

Los valores de SQL se pasan mediante `bind`. Ningún nombre de tabla ni fragmento SQL se toma del usuario. El Worker valida el JSON antes de persistir, y limita el tamaño del cuerpo mientras lo lee. El bloqueo optimista evita pérdidas por sobrescritura entre dispositivos.

## HTML y archivos

Las vistas escapan los valores interpolados y los resultados textuales se asignan mediante `textContent`. Los assets servidos proceden exclusivamente del directorio `web/`, empaquetado como mapa. No existe un endpoint de subida, ejecución de código, consulta SQL arbitraria o lectura de rutas del servidor.

## Información incluida en la entrega

- Los datos iniciales de los Excel están en `web/data.mjs`; son información de la explotación y deben tratarse como privada al compartir el repositorio.
- El ID de Sites del manifiesto identifica el sitio, pero no concede permisos.
- La lista de invitados, tokens de sesión y datos actuales de la base de datos no están incluidos.
- Las fuentes tipográficas se solicitan a Google Fonts; sin red el navegador utiliza fuentes alternativas.

## Dependencias y revisión

El proyecto fija versiones y entrega el lockfile. Las herramientas de desarrollo tienen dependencias transitivas, algunas con avisos de deprecación. Eso no se ha ocultado ni equivale por sí solo a una vulnerabilidad demostrada. Esta entrega no afirma haber realizado una auditoría completa de dependencias o una prueba de penetración.

El análisis estático comprueba problemas concretos de código, y las pruebas ejercitan autorización e integridad. Una publicación en un proveedor distinto exige revisar de nuevo la frontera de confianza, cookies, cabeceras y política de acceso.
