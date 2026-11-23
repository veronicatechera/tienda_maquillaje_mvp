# Tienda de maquillaje — prototipo MVP

## Cómo probar
1. Descomprimí el ZIP.
2. Abrí `index.html` en Chrome, Edge o Firefox.
3. Entrá en **Administrar**.
4. Clave de demostración: `demo2026`.
5. En **Tienda**, configurá el nombre y el WhatsApp internacional (solo números; Uruguay: 598 + número, sin `+` ni espacios).
6. En **Productos**, agregá, editá o eliminá productos.

## Incluye
- Catálogo responsive.
- Búsqueda y filtros por categoría y modalidad.
- Productos en stock y por encargo.
- Carrito y mensaje de pedido por WhatsApp.
- Retiro coordinado y envío a coordinar.
- Panel de productos, costos privados, precios y stock.
- Registro local de pedidos de prueba.
- Exportación e importación de respaldo JSON.

## Importante: alcance del prototipo
Esta primera entrega guarda los datos en el almacenamiento local del navegador (`localStorage`). Eso significa que:
- Los cambios solo aparecen en ese navegador/dispositivo.
- No existe sincronización entre varios dispositivos.
- La clave `demo2026` está escrita en el código y NO protege información en producción.
- Los pedidos enviados a WhatsApp no se reciben automáticamente dentro del panel.
- No hay pagos online ni control de stock transaccional.

**No publiques esta versión como tienda operativa con datos privados.** Antes del lanzamiento real hay que conectar una base de datos y autenticación segura (por ejemplo Supabase), proteger el panel y configurar las reglas de acceso. También conviene reemplazar las imágenes de referencia por fotografías reales de cada producto y revisar precios/costos.

## Publicar más adelante
La versión final puede desplegarse en Vercel. Este prototipo es un HTML autónomo y se puede subir como sitio estático para una demostración, pero no debe utilizarse como panel privado de producción.
