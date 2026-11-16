# Simulador de galaxias

Simulador interactivo de choques de galaxias que corre directo en el navegador. Cada galaxia es un halo de Plummer con un disco de estrellas; el usuario elige la razón de masas, las velocidades y la inclinación de los discos, y ve 3 mil millones de años de evolución en menos de un segundo.

Tesina de Licenciatura en Astrofísica de **Valentina Cortés Flores**, guiada por el profesor **Rory Smith** — Universidad Técnica Federico Santa María.
Contacto: valentina.cortesfl@usm.cl

## Uso

- **Página completa:** `https://vantoniacf-pixel.github.io/galaxy-simulator/`
- **Dentro de otro sitio (iframe):** el simulador detecta solo que está incrustado, esconde su encabezado y avisa su altura para que el iframe se ajuste sin barra de desplazamiento.

## Agregarlo a Squarespace (universoinmersivo.cl)

1. En la página donde va el simulador, agregar un **Bloque de código** y dejarlo en modo **HTML**.
2. Pegar el contenido de [`squarespace-bloque-de-codigo.html`](squarespace-bloque-de-codigo.html).
3. Guardar y publicar.

Los iframes y scripts en bloques de código requieren que el sitio esté en el plan **Core, Plus o Advanced** de Squarespace. En planes más básicos, usar un botón o enlace a la página completa.

## Desarrollo

- `main` es la página pública: lo que se sube ahí aparece en GitHub Pages y en Universo Inmersivo. El trabajo se hace en ramas.
- `node pruebas/fisica.js` revisa la física (energía, velocidad de escape, orientación del disco, ejemplos).
- `referencia/` es para `galmerg.f` y el generador de condiciones iniciales.
- `CLAUDE.md` resume el modelo físico, las reglas de trabajo y lo pendiente.

## Actualizar la página pública

Unir la rama de trabajo a `main`. El link no cambia, así que el QR y el sitio siguen funcionando.
