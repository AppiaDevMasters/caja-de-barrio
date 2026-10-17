# Caja de Barrio · Design System (Master)

> Generado con **UI UX Pro Max** (`.cursor/skills/ui-ux-pro-max`) y ajustado al panel de operación.
> Consulta base: `compliance admin dashboard fintech operations kyc trust Medellín cash-out dense readable`
>
> Si existe `design-system/pages/<pagina>.md`, sus reglas tienen prioridad sobre este archivo.
> Producto: `z3312/panel-de-control-caja-de-barrio.md`

## Patrón

- **Data-Dense Operations Console** (no landing): KPI strip → filtros → tabla/cola → ficha o drawer.
- Descartado del resultado automático: *Hero + Testimonials + CTA* (es patrón de marketing; este producto es consola interna).
- Cada módulo = una tarea (revisar, aprobar, vigilar, alertar). Sin carouseles ni social proof.

## Estilo

- **Data-Dense Dashboard**: tablas, KPIs, filtros, padding contenido, máxima legibilidad de datos.
- Superficies planas; bordes sutiles. Sin glassmorphism en tablas ni en colas.
- Descartado: diseño ornamentado, looks “crypto purple”, hero marketing.

## Color

Paleta **confianza operativa**: ámbar/oro como marca, neutros slate, peligro claro para acciones irreversibles. Sin púrpura (descartado `#8B5CF6` del auto-suggest).

| Rol | Claro | Oscuro | Token |
|-----|-------|--------|-------|
| Primario (marca / trust) | `#D97706` ámbar | `#FBBF24` | `--c-primary` |
| Texto sobre primario | `#FFFFFF` | `#1C1917` | `--c-on-primary` |
| Secundario | `#0F766E` teal | `#2DD4BF` | `--c-secondary` |
| CTA / acción principal | `#B45309` | `#F59E0B` | `--c-cta` |
| Peligro (bloquear, emergencia) | `#B91C1C` | `#F87171` | `--c-danger` |
| Éxito (aprobado) | `#15803D` | `#4ADE80` | `--c-success` |
| Advertencia (revisión) | `#CA8A04` | `#FACC15` | `--c-warning` |
| Fondo | `#F8FAFC` | `#0F172A` | `--c-bg` |
| Superficie | `#FFFFFF` | `#1E293B` | `--c-surface` |
| Texto | `#0F172A` | `#F8FAFC` | `--c-text` |
| Texto secundario | `#475569` | `#94A3B8` | `--c-muted` |
| Borde | `#E2E8F0` | `#334155` | `--c-border` |

- Modo claro por defecto (turnos largos de cumplimiento). Oscuro opcional.
- Acciones peligrosas usan `--c-danger`, nunca el color de marca.
- Datos enmascarados (cédula/teléfono) usan `--c-muted` + monoespaciado.

## Tipografía

- **UI / títulos / cuerpo:** Fira Sans (300–700) — legible en tablas y español.
- **IDs, montos, refs Open Payments, cédulas enmascaradas:** Fira Code (400–600).
- Descartado: Fira Code como tipografía de headings de pantalla (baja legibilidad en copy largo).

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

## Movimiento (librería `motion`)

- Paquete: `motion` · import: `motion/react`
- Duraciones: micro 150 ms · estándar 250 ms · entrada de vista 350–450 ms
- Easing: `ease-out` al entrar (`[0.22, 1, 0.36, 1]`), `ease-in` al salir
- Máximo 1–2 animaciones protagonistas por vista; tablas/colas solo row-highlight / opacity
- Solo `transform` y `opacity`
- `MotionConfig reducedMotion="user"` + `@media (prefers-reduced-motion: reduce)`

## Layout del panel

- Shell: sidebar (módulos) + topbar (rol, emergencia) + contenido
- Densidad: filas de tabla ~40–48 px; targets táctiles ≥ 44 px en acciones
- Filtros sticky bajo el título del módulo
- Ficha de persona/tienda: panel lateral o ruta detalle, no modal enorme para datos críticos
- Motivo obligatorio en acciones: campo visible antes de confirmar

## Reglas

- Sin emojis como íconos: `lucide-react` (o Heroicons), 24×24, trazo consistente
- `cursor: pointer` en todo lo clicable; hover con color/fondo, sin scale que mueva layout
- Foco visible (`:focus-visible`) con anillo 3 px `--c-primary`
- Contraste ≥ 4.5:1; cédulas/teléfonos enmascarados por defecto
- Skeletons en carga de listas; spinners solo en botones de acción
- Toda acción sensible exige motivo escrito (UI) y queda en auditoría (dominio)

## Anti-patrones

- Landing hero / testimonials / CTA marketing
- Púrpura / glow / glass en tablas
- Botón “marcar como pagado” o “entregar sin face match”
- Mostrar selfie o documento completo en el panel
- Diseño ornamentado; listas sin filtros

## Checklist antes de entregar

- [ ] Sin emojis como íconos
- [ ] Hover y foco visibles, transiciones 150–300 ms
- [ ] Claro (y oscuro si aplica) con contraste OK
- [ ] `prefers-reduced-motion` respetado
- [ ] Responsive 375 / 768 / 1024 / 1440, sin scroll horizontal
- [ ] Datos sensibles enmascarados; revelar es acción explícita
- [ ] Acciones con motivo + confirmación cuando sean irreversibles
- [ ] Roles: no mostrar controles que el rol no puede ejecutar
