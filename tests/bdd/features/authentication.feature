# language: es
Característica: Autenticacion con hacker_handle
  Como visitante de KripChat
  Quiero entrar o registrarme con hacker_handle y password
  Para mantener una identidad publica simple sin exponer email en la interfaz

  Escenario: La raiz publica redirige al login
    Dado que abro la ruta "/"
    Entonces debo estar en la ruta "/login"
    Y debo ver el texto "Sign in to access encrypted channels."

  Escenario: El login muestra los campos criticos
    Dado que abro la ruta "/login"
    Entonces debo ver estos campos:
      | hacker_handle |
      | password      |
    Y debo ver el texto "Sign in to access encrypted channels."
    Y debo ver el texto "Enter"

  Escenario: El login bloquea la autenticacion cuando falta Supabase
    Dado que abro la ruta "/login"
    Cuando escribo "aa" en el campo "hacker_handle"
    Y pulso el texto "Enter"
    Entonces debo ver estos textos:
      | Supabase required |
      | Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment. |
    Y debo estar en la ruta "/login"

  Escenario: El login normaliza el hacker_handle mientras se escribe
    Dado que abro la ruta "/login"
    Cuando escribo "Bad Handle!!_01" en el campo "hacker_handle"
    Entonces el campo "hacker_handle" debe tener el valor "badhandle_01"

  Escenario: El registro muestra onboarding solo con handle y password
    Dado que abro la ruta "/register"
    Entonces debo ver estos campos:
      | hacker_handle |
      | password      |
    Y debo ver el texto "Register"
    Y debo ver el texto "Usa solo tu hacker_handle y password para entrar."

  Escenario: El registro normaliza handles y mantiene envios invalidos en el formulario
    Dado que abro la ruta "/register"
    Cuando escribo " New Operative!! " en el campo "hacker_handle"
    Entonces el campo "hacker_handle" debe tener el valor "newoperative"
    Cuando escribo "short" en el campo "password"
    Y pulso el texto "Register"
    Entonces debo estar en la ruta "/register"
    Y debo ver el texto "Create Secure Account"

  Escenario: Las pantallas de auth estan enlazadas entre si
    Dado que abro la ruta "/login"
    Cuando pulso el texto "Create Secure Account"
    Entonces debo estar en la ruta "/register"
    Cuando pulso el texto "Already cleared? Log in"
    Entonces debo estar en la ruta "/login"
