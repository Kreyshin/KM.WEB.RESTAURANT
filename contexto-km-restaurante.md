# Contexto — KM.Restaurante

Subsistema de gestión operativa de restaurantes, dentro de **Karma Corp Platform** (ERP modular).

## Punto de partida

Estamos comenzando por el **back office / panel administrativo**, con el frontend en **Vue.js**. El resto de los módulos (apps de mesero, KDS, delivery, cliente) se definirán y reestructurarán más adelante en el camino; por ahora el foco es este panel.

## Módulos del sistema

### Back office / Panel administrativo (en construcción — Vue.js)
Panel central donde el dueño o encargado gestiona todo el negocio:
- Configuración de mesas y salones
- Carta/menú con precios y variantes
- Control de inventario e insumos
- Reportes de ventas y cierre de caja
- Gestión de usuarios y roles (mesero, cocinero, cajero, admin)
- Integración con SUNAT para facturación electrónica

### Gestión de mesas
Controla el estado de cada mesa (libre, ocupada, reservada, en limpieza), asignación de mesero por zona, y el ciclo completo desde que se sienta un cliente hasta que se libera la mesa.

### Comandas
El corazón operativo del sistema: registra los pedidos por mesa, sus modificaciones (extras, sin cebolla, etc.), y el estado de cada ítem hasta que llega a cocina.

### Cocina (KDS — Kitchen Display System)
Recibe las comandas en tiempo real, permite marcar platos como "en preparación" o "listo", eliminando el uso de comandas de papel.

### Delivery (pendiente de definir)
Cobertura de pedidos a domicilio: asignación de pedidos, ruta, estado de entrega.

### Pedido por QR en mesa (opcional, pendiente de definir)
Los clientes piden y pagan desde la mesa escaneando un QR, reduciendo la carga del mesero.

## Notas de arquitectura general (a reestructurar)

El sistema se apoya en microservicios independientes por módulo (mesas, comandas, cocina, inventario, facturación, delivery), un API Gateway como punto de entrada único, y un canal en tiempo real (WebSockets) para sincronizar mesero ↔ cocina ↔ caja sin necesidad de polling. Este diseño se irá ajustando a medida que avancemos con el back office.
