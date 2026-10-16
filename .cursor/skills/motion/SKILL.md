---
name: motion
description: >-
  Install and use the Motion animation library (npm package `motion`) for React UI
  in Caja de Barrio. Use when adding animations, page transitions, micro-interactions,
  MotionConfig, or when the user mentions motion, framer-motion, or animaciones.
---

# Motion (React)

Librería oficial de animación para este frontend. Paquete: **`motion`** (sucesor de `framer-motion`).

## Install (cuando aún no esté en package.json)

```bash
npm install motion
```

Importar desde `motion/react` (no desde `framer-motion`):

```js
import { motion, AnimatePresence, MotionConfig } from "motion/react";
```

## Cuándo usarla

- Entradas de página / secciones del panel
- Micro-interacciones (hover, focus, feedback de acciones)
- Transiciones de listas, colas y drawers
- Estados de carga sutiles (no spinners decorativos)

No usarla para tablas densas, mapas H3 ni grids grandes: ahí preferir CSS o sin animación.

## Convenciones del proyecto

Duraciones y easing viven en `design-system/MASTER.md`. Hasta que exista, usar estos defaults:

| Tipo | Duración | Easing |
|------|----------|--------|
| Micro | 150 ms | ease-out |
| Estándar | 250 ms | ease-out `[0.22, 1, 0.36, 1]` |
| Entrada de vista | 350–450 ms | ease-out |
| Salida | más corta | ease-in |

Reglas:

1. Máximo **1–2** animaciones protagonistas por vista; el resto son micro.
2. Solo animar `transform` y `opacity` (evitar layout thrash).
3. Envolver la app (o el layout del panel) con:

```jsx
<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

4. Respetar también `@media (prefers-reduced-motion: reduce)` en CSS.
5. No animar con scale que desplace layout en hovers de filas/tablas del panel.

## Stack de este repo

- React (Create React App / React 19)
- Al implementar UI, combinar este skill con **ui-ux-pro-max** y leer `design-system/MASTER.md` antes de inventar motion tokens.
