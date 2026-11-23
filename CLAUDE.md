# Simulador de galaxias

Simulador interactivo de choques de galaxias (N-cuerpos restringido) que corre en el navegador. Es la tesina de Licenciatura en Astrofísica de Valentina Cortés Flores (UTFSM), guiada por el profesor Rory Smith. Público: divulgación, sala de clases y ciencia ciudadana.

## Cómo trabajar

- Responde en español, directo y breve.
- **Cada vez que cambies algo, di por qué y explica la física que hay detrás.**
- Mantén lo que ya funciona; cambios incrementales.
- La física correcta va antes que lo visual.
- Si un cambio toca la física, dilo explícitamente y muestra el antes y el después con números.
- Antes de entregar un cambio de interfaz, abre `index.html` en un navegador (Playwright), saca capturas en escritorio y celular y revísalas.
- Corre `node pruebas/fisica.js` después de cualquier cambio en el núcleo físico. Si cambias la física a propósito, actualiza los valores esperados de la prueba y dilo.

## Ramas y publicación

- `main` es la página pública (GitHub Pages: https://vantoniacf-pixel.github.io/galaxy-simulator/) y está incrustada en https://www.universoinmersivo.cl/actividades/simulando-colisiones-de-galaxias. **No hagas push ni merge a `main` sin que Valentina lo pida.**
- El trabajo va en ramas (hoy `fase-2`).

## Archivos

- `index.html`: todo el simulador en un archivo (CSS, HTML, y dos `<script>`).
  - Primer script grande: **núcleo físico** (`PHYS`, `makeICs`, `stepOnce`, `orbitEnergy`). No depende del navegador; las pruebas lo extraen tal cual.
  - Segundo script: interfaz (textos ES/EN en `I18N`, colores en `PALS`, ejemplos en `PRESETS`, guardado en `localStorage`, dibujo en canvas, captura y grabación).
  - Bienvenida: 4 tarjetas (`<dialog id="welcome">`) que se abren solas la primera vez (`localStorage` `galsim.welcome.v1`) y con el botón "¿Qué estoy viendo?". Sus imágenes son WebP en base64, hechas con este mismo núcleo físico (disco aislado, Antena a 250 y 1100 Myr, anillo a 1950 Myr).
- `pruebas/fisica.js`: pruebas de energía, velocidad de escape, orientación del disco, centro de masa, rotación del disco y pericentros de los ejemplos.
- `referencia/`: `galmerg.f` y el generador de condiciones iniciales en Python (los códigos originales de la tesina).
- `squarespace-bloque-de-codigo.html`: el iframe que usa Universo Inmersivo.

## Modelo físico (estado actual)

- N-cuerpos restringido (Toomre y Toomre 1972): dos halos de Plummer se atraen entre sí; las estrellas son partículas de prueba que sienten a los dos halos.
- Unidades con G = 1: masa en M☉, largo en pc, velocidad en 65.8 m/s, tiempo en 14.9 Myr.
- M₁ = 10¹¹ M☉, M₂ = q·M₁. Largo de escala de Plummer de cada halo: a = 15 kpc·√(M/10¹¹ M☉), igual que escala el radio del disco (el borde del disco queda siempre en r = 2a/3). Velocidad circular en el borde: 86 km/s (q = 1), 72 (q = 0.5), 48 (q = 0.1).
- Fuerza sobre las estrellas: cada halo con su propio a. Fuerza entre halos: Plummer con ε² = (a₁² + a₂²)/2, simétrica (acción = reacción); con masas iguales es el a común. Es una aproximación de masa puntual suavizada, no la interacción exacta de dos esferas extendidas.
- Centro de masa: los halos parten con momento total cero y las estrellas no entran en esa cuenta (son partículas de prueba). El centro de masa de los halos no se mueve.
- Disco: exponencial, densidad superficial ∝ exp(−r/R_d) con R_d = R/3, cortado en R = 10 kpc·√(M/10¹¹ M☉) (igual que el perfil `exp` de `finalboss_corregido.py`, pero sin espesor). Plano y frío: órbitas circulares con v_c = √(G M(<r)/r) y M(<r) = M r³/(r²+a²)^{3/2}.
- Orientación del disco: primero se inclina en torno a y (ángulo xz), después se gira en torno a z (ángulo xy). Eje de giro = (sin xz·cos xy, sin xz·sin xy, cos xz). Con xz = 0° o 180° el ángulo xy no tiene efecto y el control se apaga.
- Órbita: velocidades radial y tangencial como fracción de V_escap = √(2GM/√(d²+ε²)), la de escape con el mismo potencial suavizado que usa el integrador para los halos. E ∝ fr² + ft² − 1.
- Integrador: leapfrog kick-drift-kick, halos simultáneos, 3000 pasos de 1 Myr, una imagen cada 10 Myr. Error de energía típico 0.003 %.
- Semilla fija (20260928): los mismos parámetros dan siempre la misma simulación.
- Los ejemplos (Antena, anillo, enana) usan esta misma física; no cambies a ni la semilla solo para que un ejemplo se vea mejor.

## Diferencias con los códigos de referencia

`index.html` ya no coincide con `galmerg.f` ni con el generador en Python. La web cambió cinco cosas que los originales no tienen:

1. Leapfrog KDK con halos simultáneos (el Fortran usa Euler, estrellas con los halos del paso anterior y halos uno después del otro).
2. Velocidad de escape con potencial de Plummer (los originales usan √(2GM/d)).
3. Orden de rotaciones: inclinar (y) y después girar (z) (los originales giran en z y después inclinan).
4. Largo de escala a ∝ √M por halo (el `finalboss_corregido.py` ya tiene esa opción, `escala_a`; el galmerg.f original usa un solo suavizado).
5. Sin corrección de centro de masa con la masa de las estrellas.

Con la versión anterior, web y Fortran coincidían en la posición de los halos a menos de 0.4 pc tras 3 Gyr. Ese número está en el póster y corresponde a la versión anterior.

## Pendiente (fase 2)

Hecho: leapfrog, velocidad de escape suavizada, orden de rotaciones, a ∝ √M, centro de masa solo con los halos, disco exponencial.

1. Llevar los cambios al Fortran y al Python y volver a validar web contra Fortran.
2. Espesor del disco (hoy es plano).
3. Fricción dinámica para que los halos se fusionen. Es lo que más limita el realismo: sin ella los halos pasan 3 o 4 veces y cada pasada dispersa más estrellas (caso por defecto: 1 %, 7 %, 14 % y 20 % de la galaxia 1 a más de 1.5 radios de disco en 0.6, 1.2, 2 y 3 Gyr).
4. Interacción exacta entre dos esferas de Plummer extendidas (hoy es puntual suavizada).
5. Interfaz: compartir configuraciones entre personas, modo guiado.

## Modo incrustado

Dentro de un iframe (o con `?embed=1`) el `<html>` recibe la clase `embed`: se esconden el logo, el menú, el título y la introducción; quedan el selector de idioma y los ejemplos. La página avisa su altura al sitio contenedor con `postMessage({type: "simulador-galaxias:height", height})`. Como el iframe mide lo mismo que el contenido, nada debe depender del alto de la ventana (por eso el cuadro de guardar se ubica junto a su botón).
