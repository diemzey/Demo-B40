# Evaluación 3 · Consistencia, copy, estados, accesibilidad y móvil

Revisión de solo lectura (build de producción en `localhost:3123`, cuentas `prueba`, `vacio`, `retail`, `ninguna`; capturas a 1280 y 390 px). Lente: ¿se ve y se lee como un solo producto?, ¿cada pantalla dice lo justo?, ¿qué pasa mientras carga, falla o está vacío?, ¿se puede usar con teclado y desde un teléfono?

Diagnóstico corto: la portada y el panel son dos productos distintos (dos escalas tipográficas, dos sistemas de botones, dos de badges, tres implementaciones de tabla, dos eyebrows). El panel repite la misma cifra cuatro veces y entierra el "antes vs. después" bajo una gráfica de 72 filas. Hay botones muertos en la portada y un menú en inglés. En 390 px la tabla insignia (la de la portada y la del diagnóstico) rompe el pie de totales. El principio "la propuesta se genera sola al importar" hoy no se cumple: hace falta un clic manual y un aviso ámbar lo explica.

## a) Inventario de inconsistencias

### Tipografía y escalas
| Elemento | Portada | Auth | Onboarding / panel |
|---|---|---|---|
| H1/H2 | `text-3xl md:text-5xl` (hero), `3xl/4xl` (secciones) | `2xl` en tarjeta + `4xl/5xl` en panel amarillo | `2xl/3xl` (onboarding), `xl/2xl` (TabHeader) |
| Eyebrow | `font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground` (comparison-03, faq, contact) | — | `text-[11px] font-semibold uppercase tracking-wider text-amber-400` (tabs/ui.tsx, onboarding, page.tsx) |
| Cuerpo | `text-sm/base` | `text-sm` | `text-[13px]`, `text-[11px]`, `text-xs` mezclados |
| Título de tarjeta | `text-sm uppercase tracking-wider` (artefacto "ANTES") | — | `text-[13px] font-semibold` (PanelHeader y CardTitle) |

Censo de tamaños arbitrarios en `src/components`: 35 × `text-[11px]`, 30 × `text-[13px]`, 11 × `text-[10px]`. Conviven con `text-xs` (12 px) y `text-sm` (14 px): cinco tamaños entre 10 y 14 px sin regla. Propuesta: tres pasos (11 / 13 / 15) definidos como utilidades en `globals.css` y prohibir `text-[Npx]` fuera de ellas.

### Espaciado y tarjetas
- Cuatro radios de tarjeta: `rounded-2xl` (hero, artefacto, tarjetas de auth), `rounded-xl` (CommandSearch), `rounded-lg` (Panel, StatCard, Card, pasos de onboarding), `rounded-md` (drop zone, avisos). El artefacto (`jornada-artefacto.tsx`) es `rounded-2xl p-5 shadow-lg` en la portada y aparece igual dentro del panel, donde todo lo demás es `rounded-lg p-4 shadow-lg shadow-black/5`.
- Dos componentes para lo mismo: `Panel`/`PanelHeader` (`tabs/ui.tsx`) y shadcn `Card`/`CardHeader` con overrides (`app/dashboard/page.tsx`). Misma apariencia, dos APIs.
- Padding de página: `p-4 md:p-6` en el panel; `px-4 py-16 md:py-24` en portada; `p-6` en auth. Bien, pero el TabHeader usa `mb-5` y los grids `gap-3` o `gap-4` según la pestaña (page.tsx: `gap-3` en KPIs, `gap-4` en gráficas).

### Botones
- Tres primarios amarillos distintos: `Button` shadcn con `bg-yellow-400` encima (h-10, con acabado degradado + hairline, portada y auth), `Button size="sm"` (h-9, page.tsx y `programar-semana.tsx`), y la cadena `botonPrimario` (h-8, sin acabado, sin `focus-visible`, `tabs/ui.tsx`). En el diagnóstico conviven el select h-9, "Reprogramar" h-9 y, en las pestañas, botones h-8. En el hero, h-12.
- Outline igual: `Button variant="outline"` (con sombra interior) vs `botonOutline` (plano). Están lado a lado en `onboarding.tsx` (Plantilla mínima / Ejemplo completo) con iconos a `strokeWidth={2}` y `1.5` respectivamente.
- Ghost: solo en el header de portada ("Agendar diagnóstico") y en los enlaces-botón de `register-form` (`linkClass`).
- Iconos de botón: `mr-2 size-4` (Button) vs `gap-2 size-3.5` (botonPrimario) vs `size-4` (Save/Plus en tabs).

### Pills, badges y estados
- Cuatro cápsulas: `Pill` (`rounded-full text-[11px] font-semibold`, tabs/ui), `EstadoBadge` (`rounded-md border text-xs font-medium`, artefacto), el delta de `StatCard` (`rounded-full text-[11px]` con `tabular-nums`) y `Badge` shadcn (`badge.tsx`, sin uso). En el diagnóstico se ven a la vez `Excede` (rectangular) y `−400.0 h` (redonda).
- Semántica de color no uniforme: en `Pill` "warn" y "amber" son la misma clase; el ámbar significa "atención" en `tonoCobertura`, "actual" en Semanas, "marca" en eyebrows y "tope" en la gráfica.
- `Sin diagnóstico` (neutral), `En norma` (good), `N fuera de norma` (warn/bad por proporción): el umbral 25 % no se explica en ningún lado.

### Tablas
Tres implementaciones: (1) `JornadaTabla` sobre `cnippet-table` (celdas `p-2.5`, `TableHead h-10`, cabecera sticky, degradado inferior, avatares); (2) `<table>` a mano en `semanas.tsx` y `onboarding.tsx` (`th h-9 px-4/px-2.5`, `text-[13px]`); (3) `Tabla` de `reportes.tsx` (`th h-9`, `td h-10`, `first:px-4 last:px-4`). Cambian padding, altura de fila, alineación de números (Semanas alinea a la derecha, artefacto centra la barra), y el tratamiento de "más filas" (degradado vs. scroll horizontal vs. nada).

### Iconografía
- `strokeWidth` 1.5 en casi todo el panel, 2 en `Download`, `Plus`, `Save`, `Sparkles`, `Upload` (page.tsx). En `onboarding.tsx` los dos botones contiguos usan 2 y 1.5.
- El mismo concepto con iconos distintos: sucursal = `Building2` (sidebar, tarjetas, DestinoCsv) pero avatar con inicial en el WorkspaceSwitcher; subir = `Upload` en el drop zone y en el botón, `FileSpreadsheet` en "Ejemplo completo", `FileText` en la vista previa.
- Hero usa `Clock`; auth usa `CalendarClock`; timeline usa `Clock` + `CalendarDays`. Elegir uno de marca.

### Terminología (misma cosa, cinco nombres)
| Concepto | Variantes encontradas | Propuesta |
|---|---|---|
| El resultado del motor | "reacomodada" (portada, leyendas de `charts.tsx`, StatCard sin propuesta), "propuesta" (con propuesta), "escenario publicado" (Reportes vacío), "optimiza"/"Optimizando turnos" (hint de Tope y `PASOS`), "Programar semana"/"Reprogramar" (botón), "cuadrante" (Alcance) | **Propuesta** como sustantivo; **Programar** como verbo del botón; eliminar "reacomodo", "escenario", "optimizar", "cuadrante" de la UI |
| Límite semanal | "tope" (todo el panel), "jornada" (footer, `jornada_contratada`, FAQ), "umbral" (Calendario), "hora 47" (hero) | **Tope semanal** en UI; "jornada contratada" solo para el dato del CSV |
| Semana | "S30" (Semanas, Reportes, KPI "vs. S30"), "semana 30" (títulos), "20 jul – 26 jul", "del 20 de julio al 26 de julio", "2026-07-27" (CSV), "semana ISO" (Reportes) | Título: "Semana 30 · 20–26 jul"; tablas: "S30 · 20–26 jul"; nunca "ISO" |
| Persona | "colaboradores" (todo), "personas" (subtítulo Colaboradores, leyenda de gráfica), "plantilla", "empleados" (`Exito`: `empleados`) | **Colaboradores** |
| Sucursal | "sucursal" (todo), "tienda"/"tienda-semana" (Reportes), "workspace" (sidebar) | **Sucursal** |
| Plantilla | "Descargar plantilla" (archivo CSV) y "Plantilla · 72" (nómina) en la misma cuenta | Archivo = **formato CSV**; gente = **plantilla** |
| Costo | "Costo extra semanal" (CostoKpi), "Costo laboral semanal" (con propuesta), "Al doble · semana" (pie del artefacto), "baseline" (Reportes), "Sobrestaffing", "h-persona", "subdotación" | "Costo de horas al doble", "Costo actual" / "Costo con la propuesta"; nada de baseline/sobrestaffing |

### Formatos de números y fechas
- Horas: `toFixed(1)` sin locale en `jornada-artefacto.tsx` (`fmt`) vs `Intl es-MX` en el resto; "400.0 h" (artefacto y StatCard) vs "400 h" en hero (`toFixed(0)`) vs "2,928.0 h" (Reportes).
- Porcentajes: tres estilos: `"13.5 %"` (manual con espacio), `Intl percent` que produce `"-14%"` sin espacio (`costo-kpi.tsx`, verificado), y `"+51.4 pts"`. Además el hero usa "84 %" con espacio.
- Dinero: "$225,957 MXN" (hero con sufijo), "$205,680" (panel sin sufijo), "−$2,610" en gráfica de Reportes.
- Signos: `conSigno` pone "−" tipográfico; `Intl` pone "-" ASCII; los deltas de "Horas al doble" sin propuesta usan `fmtH.format(negativo)` → guion ASCII.
- Fecha de publicación: `fechaPublicacion` hace `.replace(".", "")` una sola vez y el resultado real es **"21 sep, 08:01 pm."** (queda el punto final y el cero a la izquierda; captura del diagnóstico). Usar `hour12`+`hour: "numeric"` y quitar todos los puntos.
- La misma semana se etiqueta con `etiquetaSemana` (`lib/importacion/parse.ts`: "27–2 ago 2026") en la importación y con `rangoCorto` (`lib/datos/semana.ts`: "27 jul – 2 ago") en el panel: dos funciones para el mismo texto.

### Cifras que se contradicen en una misma pantalla
En Diagnóstico (cuenta `prueba`): la tarjeta dice costo actual **$205,680** y ahorro **$27,840** (motor, Postgres), la gráfica "Costo extra por semana" dice **$48,000** (400 h × $60 de `localStorage` × 2) y el pie del artefacto dice **$52,144 / $47,904** según la cuenta. Tres fuentes de verdad para "cuánto cuesta". Y `configuracion.tsx` ofrece "Sucursal principal: Coapa / Polanco / Satélite" (semilla demo) a una cuenta real cuya única sucursal es Celaya.

## b) Copy: revisión y reescritura

Criterio: corto, concreto, segunda persona, español de México, sin jerga de motor. Formato: **dónde** · texto actual → propuesta.

### Portada
- `header.tsx` menú "Home / Product / Company / Book a call today / Reports / Statistics…" → está en inglés y enlaza a rutas inexistentes. Sustituir por "Cómo funciona · Calendario · Preguntas · Contacto" o quitar el menú.
- `costo-extra.tsx` "Sin Jornada40, en 2030 pagarías al mes" → "Hoy, con tope de 40 h, pagarías al mes". (La marca no es la causa; y "en 2030" contradice el hero, que habla de enero/hora 47.)
- `costo-extra.tsx` nota de 4 líneas en `text-neutral-500` → una línea: "400 h al doble por semana · 50 de 72 colaboradores arriba del tope".
- `jornada-hero.tsx` "Mira cómo cambia la semana." → "Así queda tu semana con la misma gente." (y el botón "Diagnosticar ahora" debe llevar a `/registro` o `#contacto`; hoy no hace nada).
- `reduccion-timeline-demo.tsx` párrafo 2 ("Para la nómina eso no se siente como menos horas…", 5 líneas, metáforas "umbral", "piso") → "No trabajas menos horas: pagas más por las mismas. Cada hora arriba del tope se paga al doble y, más arriba, al triple."
- `alcance-demo.tsx` NO-4 "Hoy lee CSV, no Excel directo…" → "Sube un CSV. Desde Excel: Guardar como → CSV."
- `faq-demo.tsx` respuesta 8 (8 líneas sobre Coapa/Solmar) → "De una sucursal de ejemplo de 30 personas, calculada por el mismo motor. No es un cliente real."
- `contact-demo.tsx` descripción (4 líneas) → "20 minutos por videollamada: te mandamos el formato, subes una semana y ves tu diagnóstico en la llamada."
- `footer-section.tsx` "Reacomoda los turnos de tu sucursal con los mismos contratos y cumple la jornada de 40 horas." → "Tus turnos, con la misma gente, dentro del tope de 40 h."

### Auth
- `login/page.tsx` headline "Tu semana, con el tope encima." → "Tu semana, antes y después del tope." · subtítulo "Usa el correo con el que registraste tu sucursal." → "Usa tu correo de trabajo."
- `recuperar/page.tsx` "Recupera el acceso a tu semana." → "Recupera tu contraseña."
- `restablecer/page.tsx` "Úsala la próxima vez que entres a Jornada40." → sobra; borrar.
- `login-form.tsx` `AVISOS_ERROR.confirmacion` (2 líneas) → "El enlace caducó. Pide uno nuevo desde tu correo de registro."
- `register-form.tsx` estado verificar: "Al abrirlo entrarás directo a tu panel; no hace falta volver a iniciar sesión." → "Al abrirlo entras directo a tu panel."
- `lib/supabase/auth.ts` `weak_password`: "…Usa al menos 8 caracteres y mezcla letras y números." → "Usa al menos 8 caracteres con letras y números."

### Onboarding e importación
- `onboarding.tsx` párrafo "Jornada40 no usa datos de ejemplo: el diagnóstico sale de tus turnos reales. Sube un CSV…" (3 líneas, empieza en negativo) → "Sube los turnos de una semana y en segundos ves quién pasa del tope y cuánto cuesta."
- Botones "Plantilla mínima (12 filas)" / "Ejemplo completo: una tienda, una semana (72 personas)" → "Descargar formato CSV" / "Ver ejemplo lleno".
- `importar-csv.tsx` título "Subir semana (CSV)" → "Sube tu semana"; descripción "Una fila por segmento de turno; un turno partido son dos filas." → "Una fila por turno. Turno partido = dos filas." (Y no repetir la lista de encabezados dentro del drop zone: ya está en la tabla de arriba.)
- Error "Solo se aceptan archivos .csv." → "Ese archivo no es CSV. En Excel: Guardar como → CSV."
- Error "No se pudieron cargar las sucursales (Invalid JWT…)" → nunca mostrar `error.message`; "No pudimos cargar tus sucursales. Recarga la página."
- Vista previa "Turnos: 214 de 220" → "214 turnos válidos · 6 con error".
- Éxito "Importación completada" → "Semana 30 guardada · 72 colaboradores · 214 turnos"; la nota "quedaron registradas en la bitácora de la importación; corrígelas y vuelve a subir…" → "6 filas no se guardaron. Corrígelas y vuelve a subir el archivo; no se duplican."
- Modo demo "Configura NEXT_PUBLIC_SUPABASE_URL y la llave pública para importar." → texto de desarrollador en pantalla de usuario; ocultar tras `process.env.NODE_ENV !== "production"`.

### Panel
- `page.tsx` aviso ámbar "Esta semana aún no está programada: presiona Programar semana para generar la propuesta a 40 h." → si se automatiza sobra; si no: "Falta tu propuesta. Genérala en un clic." con el botón dentro del aviso.
- Hints de StatCard: "Hoy, arriba de la hora 40 · con la propuesta: 0 h" → "Con la propuesta: 0 h" (el título ya dice "Horas al doble"; el delta ya dice −400).
- "Máximo legal este año · el panel optimiza a 40 h" → "Máximo legal 2026. Tu propuesta usa 40 h."
- Gráfica "línea ámbar = tope de la propuesta 40 h" → "Tope 40 h" (la leyenda ya lo dice).
- `programar-semana.tsx` `PASOS`: "Leyendo catálogo / Calculando demanda / Materializando baseline / Optimizando turnos / Guardando propuesta / Resumiendo costos" → "Leyendo tus turnos / Midiendo la demanda / Armando la propuesta / Calculando el ahorro / Listo". Resumen: quitar "Turnos asignados 504 · 3.2 s" (dato de ingeniería); "Propuesta publicada" → "Propuesta lista".
- `semanas.tsx` descripción del historial (3 líneas con comillas y "=") → "Cada semana que subiste. Programada = ya tiene propuesta."
- `sucursales.tsx` "Las sucursales se crean al registrar la empresa; para agregar otra escríbenos y la damos de alta en tu cuenta." → "¿Otra sucursal? Súbela en el CSV con la columna `sucursal` o escríbenos." (La importación ya las crea sola: el texto contradice el flujo.)
- `colaboradores.tsx` "Los colaboradores se cargan desde el CSV de cada semana." aparece dos veces (nota de tabla y panel lateral). Dejar una.
- `reportes.tsx` vacío: "Aún no hay escenarios publicados" + párrafo de 4 líneas + "Trazabilidad · resumen_escenario → v_ahorro_escenario → reporte_ejecutivo()" → "Aquí verás el ahorro de todas tus sucursales. Empieza por programar una semana." + botón. La línea de trazabilidad (también al pie del reporte lleno) es para el equipo, no para el gerente: quitar o mover a un tooltip.
- `reportes.tsx` "Costo propuesta vs. baseline", "Déficit pico 2.0 h-persona", "1 tienda con subdotación en pico", "Sobrestaffing" → "Costo con la propuesta", "Faltan 2 h en horas pico", "1 sucursal con picos sin cubrir", "Personal de más".
- `configuracion.tsx` "Parámetros del diagnóstico. Se guardan en este navegador." → si solo aplica a demo, decirlo: "Ajustes de la demostración. No cambian tu propuesta."
- `command-search.tsx` "Escribe un comando o busca..." → no hay comandos ni resultados; ver estados.

## c) Estados: lo que falta y lo que sobra

### Falta
1. **Carga del panel.** No hay `src/app/dashboard/loading.tsx` ni skeleton alguno (`grep Skeleton|animate-pulse` → solo `timeline.tsx`). `layout.tsx` es `force-dynamic` y espera `obtenerDatosPanel()` + `obtenerReporte()`: entre `/login` y el panel, y en cada `router.refresh()` (tras importar, tras programar, al cambiar de sucursal con la cookie) la pantalla anterior se queda congelada sin indicador. Añadir `loading.tsx` con el esqueleto de 4 KPIs + tabla, y `useTransition` alrededor de los `router.refresh()`.
2. **Narrativa import → propuesta.** Hoy: "Importación completada" (tarjeta verde) → refresh silencioso → panel con aviso ámbar → clic en "Programar semana" → popover con seis pasos técnicos → "Propuesta publicada" → otro refresh. El principio dice que la propuesta se genera sola. Propuesta: al terminar `importarTurnos`, llamar `programarSemana` en el mismo flujo y mostrar un solo estado de progreso a pantalla completa ("Guardando tu semana → Armando la propuesta → Listo: ahorras $27,840"), con el botón "Ver mi semana".
3. **Recuperación de errores.** `ImportarCsv` muestra `e.message` crudo; `ProgramarSemana` también (`Fallo`). No hay `error.tsx` en `/dashboard`: una excepción del servidor da la pantalla genérica de Next. Falta un estado "sin conexión" en auth (solo se traduce por regex `network|fetch`).
4. **Éxito.** Configuración muestra "Guardado" 2.5 s en la esquina (`opacity` sobre `role=status`, bien) pero el formulario no refleja que el tope elegido no afecta al diagnóstico real. Tras importar en la pestaña Semanas, la fila nueva aparece sin resaltar.
5. **Vacíos.** Reportes vacío existe; Semanas vacío es una fila de tabla ("Importa tu primer CSV…"); Colaboradores vacío es una fila; Sucursales sin sucursales no tiene estado (grid vacío). `empty.tsx` está en el repo y no se usa. Unificar con `Empty` + un solo CTA.
6. **Búsqueda ⌘K.** `CommandSearch` es un cascarón: ningún resultado, ningún comando. Tres accesos (ítem "Buscar" del sidebar, caja del header, atajo) a algo que no hace nada. Quitar hasta que exista, o implementar filtro sobre sucursales/semanas/personas del `PanelProvider`.
7. **Tema claro.** El switch del footer alterna la clase `dark` en `<html>`, pero `layout.tsx` ya pone `dark` y auth/panel lo fuerzan: el control promete un tema que la app no soporta. Quitarlo.
8. **Botones muertos en portada.** `jornada-hero.tsx` "Diagnosticar ahora" (sin `href`/`onClick`), `contact-demo.tsx` "Agendar diagnóstico de una sucursal" (`type="button"` sin handler), footer "Diagnóstico / Calendario / Alcance" (`href="#"`), WorkspaceSwitcher "Crear sucursal" (div sin acción).

### Sobra (ruido)
- Diagnóstico con propuesta: "400.0 h" aparece en la tarjeta, en su delta (−400.0 h), en la mini-gráfica "Antes vs. propuesta" y en el pie del artefacto; "50 de 72" igual. Cuatro lugares para dos números. Dejar KPIs + artefacto; la gráfica "Antes vs. propuesta" es redundante con el toggle Antes/Después.
- La gráfica "Horas por colaborador" con 72 filas mide ~1 000 px y empuja el antes/después (el centro del producto) al tercer scroll. Con una sola semana, "Costo extra por semana" es un punto solo ($48,000 sobre un eje vacío).
- Onboarding: tres botones de descarga para el mismo CSV (dos en el panel de formato, "Descargar plantilla" en el importador) y la lista de encabezados impresa dos veces.
- Sidebar: ítem "Buscar" duplica la caja del header; badge "72" en Colaboradores no aporta.
- KPIs sin propuesta: "Tope 2026 · 48 h" es una constante legal, no un indicador de la semana.
- Reportes con 1 tienda-semana: "Tiendas con menor ahorro", "Mayor ahorro" y "Por semana" muestran la misma fila tres veces.

## d) Accesibilidad y móvil

### Contraste (tema oscuro; fondo card `oklch(0.205)` ≈ #262626)
- `text-muted-foreground` (`oklch(0.708)` ≈ #a3a3a3) da ≈ 5.9:1: pasa. Pero se rebaja con opacidad en muchos sitios: `/50` (encabezados de grupo del sidebar, placeholder de CommandSearch), `/60` (kbd ⌘K, hints de `Campo`), `/70` (placeholder del header, rango de fecha en Reportes), `/80` (nota del drop zone, detalle del progreso). A 11–13 px todo eso cae por debajo de 4.5:1.
- Hero: nota en `text-neutral-500` (#737373) sobre `neutral-950` ≈ 4.0:1 en 12 px: falla AA. Subir a `neutral-400`.
- Ámbar sobre negro (`text-amber-400` en eyebrows, 11 px) pasa; `text-rose-300/80` en `Fallo` no.
- Pie del artefacto: etiquetas `text-xs uppercase tracking-wider text-muted-foreground` sobre `TableFooter` (`bg-muted/50`): revisar, queda en el límite.

### Foco y teclado
- `botonPrimario`/`botonOutline` (`tabs/ui.tsx`) no tienen `focus-visible:*`: Importar, Guardar, Agregar y Reintentar no muestran foco. Único `focus-visible` del archivo está en `inputClass`.
- `dashboard-sidebar.tsx`: cero `focus-visible`; `WorkspaceSwitcher` es un `div onClick` sin `role`, `tabIndex` ni teclado: **no se puede cambiar de sucursal con teclado**. Sus opciones también son `div`. Ítems con hijos usan `div role=button` (bien) pero `Link` de los ítems no anuncia el `shortcut`.
- `diagnostico-tabla.tsx`: `role="tablist"` + `role="tab"` sin `aria-controls`, sin `tabIndex` roving ni flechas ←→; el panel no tiene `role="tabpanel"`. O se completa el patrón o se cambia a un `radiogroup`/segmented control con `aria-pressed`.
- `header.tsx`: el botón hamburguesa no tiene `aria-label`, `aria-expanded` ni `aria-controls`; el cajón móvil no atrapa el foco ni cierra con Esc. El cajón del panel sí tiene `role="dialog" aria-modal` pero no gestiona foco al abrir/cerrar.
- `command-search.tsx`: `kbd` con `onClick` (no es botón); `aria-modal` sin trampa de foco.
- `faq-section.tsx` y `comparison-03.tsx`: sin `focus-visible` propios (dependen del acordeón de Radix, ok).
- Orden de tabulación en portada: menú inglés (3 ítems) → logo → "Agendar" → Entrar → Crear cuenta → hero. El menú fantasma se lleva las primeras tres paradas.
- `aria-live`: bien usado en auth y en `ProgramarSemana`; `JornadaArtefacto` marca `aria-live="polite"` en toda la tarjeta y en la portada cambia cada 3.5 s: un lector de pantalla recibe 72 filas nuevas cada ciclo. Quitar el `aria-live` del contenedor y dejarlo solo en `JornadaTotales`.

### Objetivos táctiles (mínimo 44 × 44 recomendado, 24 × 24 obligatorio)
- Quitar archivo `size-6` (24 px), Cerrar popover `p-1` + icono 16 (≈ 24 px), Eliminar sucursal `p-1` (24 px), Cerrar menú móvil `p-1`, botones h-8 (32 px) en todo el panel, tabs Antes/Después `py-1` (≈ 26 px), checkbox nativo 16 px. En móvil todos deberían ser ≥ 40 px.

### 390 px
- **Pie de totales del artefacto se rompe**: `JornadaTotales` es `grid-cols-3` con `[&_p:first-child]:whitespace-nowrap`; a 390 px las etiquetas se solapan ("AL DOBLE · TOPEFUERA DE NORMAL DOBLE · SEM", visible en `home-m-0` y en el diagnóstico). Pasar a `grid-cols-1 sm:grid-cols-3` o apilar etiqueta/valor.
- Tabla del artefacto en portada: la columna "Estado" queda fuera del ancho (solo se ven Colaborador y Horas, sin scroll horizontal). Ocultar "Estado" en `<sm` y colorear las horas, o hacer scroll.
- Gráfica "Horas por colaborador": `YAxis width={128}` recorta los apellidos por la izquierda **también en escritorio** ("autista Castillo Carmen", "npos Gutiérrez Ricardo"). Usar `width` dinámico o truncar con puntos suspensivos al final + tooltip.
- Cabecera del panel: en `<sm` desaparece la sucursal del breadcrumb y el switcher vive dentro del cajón: en móvil no se sabe qué sucursal se ve sin abrir el menú. Mostrar "Celaya · Diagnóstico" siempre.
- Acciones del diagnóstico en móvil: select 40 h + Reprogramar + "Subir semana (CSV)" se apilan en tres líneas antes de cualquier dato. Mover "Subir semana" al menú y dejar un solo botón primario.
- Tablas de Semanas, Reportes y la tabla de columnas del onboarding requieren scroll horizontal (`min-w-[560/640/720px]`) sin indicación visual; en Semanas la columna "Estado" (Programada) queda oculta. Cartas apiladas en `<sm` para Semanas; para el onboarding, lista de definiciones.
- Reportes en móvil: 4 KPIs + 5 paneles = 2 600 px de scroll para una tienda-semana.
- Home: el header fijo `min-h-20` + `pt-20` consume 80 px; el hero en 390 arranca con un icono de 40 px y un H2 de 4 líneas: el "antes/después" (la razón de la página) empieza en el segundo scroll.
- Auth en móvil: correcta (logo + tarjeta). Inputs h-10 con `text-base`: bien para evitar zoom en iOS.

## e) Lista de implementación por impacto

1. **Unificar botón, pill y tarjeta** — `src/components/dashboard/tabs/ui.tsx`: borrar `botonPrimario`/`botonOutline`/`Panel` y exportar wrappers de `Button` (variantes `primary` amarillo con `focus-visible`) y de `Card`; una sola `Pill` (rounded-full, 11 px) que también use `EstadoBadge` en `jornada-artefacto.tsx`; borrar `badge.tsx` o adoptarlo. Actualizar `onboarding.tsx`, `importar-csv.tsx`, `programar-semana.tsx`, las cinco pestañas y `app/dashboard/page.tsx`.
2. **Una sola fuente de costo** — `costo-kpi.tsx` y `CostoSemanalChart` (`charts.tsx`) deben leer el costo del motor cuando `datos.programacion` existe; `configuracion.tsx` solo en demo, y sin las sucursales semilla para cuentas reales (`SUCURSALES_SEMILLA` → `datos.sucursales`).
3. **Propuesta automática tras importar** — `importar-csv.tsx` (`importar()`): encadenar `programarSemana` con `onProgreso` y reutilizar `Progreso`/`Resumen` de `programar-semana.tsx` a pantalla completa en `onboarding.tsx`; quitar el aviso ámbar de `page.tsx`; añadir `src/app/dashboard/loading.tsx` y `error.tsx`.
4. **Móvil del artefacto** — `jornada-artefacto.tsx`: `JornadaTotales` a `grid-cols-1 sm:grid-cols-3`; ocultar columna Estado en `<sm` y teñir la cifra; quitar `aria-live` del contenedor. `charts.tsx`: `YAxis width` calculado y `tick` con elipsis final.
5. **Portada** — `header.tsx`: sustituir `navigationItems` por anclas reales en español o quitar el menú; `aria-label`/`aria-expanded` en la hamburguesa. `jornada-hero.tsx`: `asChild` + `Link href="/registro"`. `contact-demo.tsx`: `type="submit"` + acción o `mailto`. `footer-section.tsx`: anclas reales, quitar el switch de tema. `costo-extra.tsx`: `neutral-500` → `neutral-400`, nota a una línea.
6. **Terminología y formatos** — crear `src/lib/formato.ts` con `fmtH`, `fmtMXN`, `fmtPct` ("13.5 %"), `fmtPts`, `fmtFechaHora` (sin "pm.") y `etiquetaSemana` única; reemplazar los 9 `new Intl.NumberFormat` locales y `toFixed` en `jornada-artefacto.tsx`, `costo-extra.tsx`, `programar-semana.tsx`. Diccionario: propuesta/programar/tope/colaboradores/sucursal/formato CSV; aplicar en `charts.tsx` (leyenda "Reacomodada" → "Propuesta"), `reportes.tsx` (baseline, tienda, sobrestaffing, h-persona), `programar-semana.tsx` (`PASOS`), `semanas.tsx`, `sucursales.tsx`.
7. **Reducir ruido en Diagnóstico** — `page.tsx`: quitar hints redundantes, quitar `AntesDespuesChart`, mover `HorasPorPersonaChart` debajo del artefacto o limitarla a los que exceden (con "ver todos"); ocultar `CostoSemanalChart` con < 2 semanas; KPI "Tope" solo cuando difiere del tope de la propuesta.
8. **Teclado en sidebar y toggle** — `dashboard-sidebar.tsx`: `WorkspaceSwitcher` como `button` + `role="listbox"`/`DropdownMenu` de shadcn; `focus-visible:ring` en `rowClassName`. `diagnostico-tabla.tsx`: `aria-controls`, `tabIndex` roving, flechas, `role="tabpanel"` en el artefacto; `py-1` → `py-2`.
9. **Estados vacíos y búsqueda** — usar `ui/empty.tsx` en Semanas/Colaboradores/Sucursales/Reportes con un CTA; `dashboard-shell.tsx`: quitar el ítem "Buscar" y la caja hasta que `command-search.tsx` filtre datos reales.
10. **Escala tipográfica** — `globals.css`: utilidades `text-ui-xs/sm/md` (11/13/15) y sustituir `text-[10px|11px|13px]`; un solo eyebrow (`tabs/ui.tsx` `Eyebrow`) usado también por `comparison-03.tsx`, `faq-section.tsx`, `contact-demo.tsx`, `reduccion-timeline-demo.tsx`.
11. **Onboarding** — `onboarding.tsx`: drop zone arriba (es la acción), tabla de columnas como acordeón "¿Cómo debe verse el CSV?", un solo botón de descarga; `importar-csv.tsx`: no imprimir la lista de encabezados en el drop zone, no exponer `error.message`, ocultar el texto de `NEXT_PUBLIC_SUPABASE_URL`.
12. **Objetivos táctiles y opacidades** — buscar `text-muted-foreground/(50|60|70|80)` y `size-6|p-1 ` en `src/components` y subir a mínimo `/80` y 40 px en móvil (`min-h-10` con `md:min-h-8`).
