# language: es
Característica: Rutas protegidas
  Como usuario no autenticado
  Quiero que las rutas privadas me devuelvan al login
  Para que el contenido de la aplicacion no quede expuesto

  Esquema del escenario: Una ruta privada redirige al login
    Dado que abro la ruta "<ruta>"
    Entonces debo estar en la ruta "/login"
    Y debo ver el campo "hacker_handle"

    Ejemplos:
      | ruta                                        |
      | /profile                                    |
      | /help                                       |
      | /chat/00000000-0000-4000-8000-000000000001 |
