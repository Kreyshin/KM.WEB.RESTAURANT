# Quién hace qué

Cada persona entra con su cuenta y ve solo su parte. Los roles vienen del ERP; lo que ese rol puede hacer **dentro del restaurante** se decide aquí.

## Los cuatro roles

### Administrador

Lo ve todo. Carta, precios, recetas, costos, compras, configuración y usuarios.

### Cajero

Reportes, cierre de caja y facturación electrónica. Ve la sala, pero no toca la carta ni el inventario.

### Mesero

La sala. Mesas y su estado; el resto del back office no le corresponde porque su herramienta es la app de pedidos.

### Cocinero

Cocina: recetas, producción e insumos.

## Dos cosas que no se deciden aquí

**El acceso a locales** viene del ERP. El selector de local solo muestra los que esa persona tiene concedidos, y esta pantalla no puede ampliarlos.

**El acceso a almacenes** también. Lo que sí es de la vertical es el **acceso por zona**: que el bartender gestione la barra y no la cámara de frío.

## Permisos y excepciones

Dos niveles, y conviene no confundirlos:

|                             | Qué hace                                               | Cuándo usarlo   |
| --------------------------- | ------------------------------------------------------ | --------------- |
| **Permisos por rol**        | Define qué puede hacer _todo_ cajero en el restaurante | Es la regla     |
| **Excepciones por usuario** | Ajusta los permisos de _una_ persona                   | Es la excepción |

Si una excepción se repite en varias personas, deja de ser excepción: toca revisar el permiso del rol.
