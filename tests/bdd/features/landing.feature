# language: es
Característica: Landing publica y membresias
  Como visitante
  Quiero entender el producto, las funcionalidades y las membresias
  Para decidir si entro, me registro o contacto con operaciones

  Escenario: La home presenta la historia publica del producto
    Dado que abro la ruta "/home"
    Entonces debo ver estos textos:
      | KripChat            |
      | FUNCIONALIDADES     |
      | Canales privados    |
      | Crear cuenta segura |

  Escenario: La home expone membresias y CTAs principales
    Dado que abro la ruta "/home"
    Entonces debo ver estos textos:
      | MEMBRESIAS |
      | $0         |
    Y debo ver estos botones:
      | Activar Ghost |
      | Crear Squad   |
      | Hablar de Ops |
    Cuando pulso el texto "Login"
    Entonces debo estar en la ruta "/login"
    Dado que abro la ruta "/home"
    Y pulso el texto "Register"
    Entonces debo estar en la ruta "/register"
