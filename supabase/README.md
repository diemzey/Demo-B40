# Jornada40 · Base de datos (Supabase / Postgres 17)

Esquema para reacomodar turnos semanales y vigilar el cumplimiento de la
reforma de 40 horas en sucursales de retail. Todo vive en el esquema `public`
con nombres en español (`snake_case`).

Topes semanales legales (horas por encima del tope se pagan al doble):

| Año  | Tope |
|------|------|
| 2026 | 48 h |
| 2027 | 46 h |
| 2028 | 44 h |
| 2029 | 42 h |
| 2030 | 40 h |

## Estructura de carpetas

```
supabase/
├── migrations/
│   ├── 0001_extensiones_y_tipos.sql      pgcrypto + enums
│   ├── 0002_esquema_base.sql             tablas, triggers, handle_new_user()
│   ├── 0003_rls.sql                      RLS, funciones auxiliares, políticas
│   ├── 0004_vistas_y_semilla_topes.sql   topes, vistas, RPC resumen_sucursal
│   └── 0005_reacomodo.sql                motor de reacomodo (RPC)
├── seed.sql                              datos demo (Grupo Solmar)
├── plantillas/
│   └── turnos-ejemplo.csv                ejemplo del CSV que importa la app
└── README.md
```

## Orden de aplicación

Aplicar con el MCP de Supabase (`apply_migration`) o con `supabase db push`,
**en este orden** (cada archivo depende del anterior):

1. `0001_extensiones_y_tipos.sql`
2. `0002_esquema_base.sql`
3. `0003_rls.sql`
4. `0004_vistas_y_semilla_topes.sql`
5. `0005_reacomodo.sql`
6. (opcional) `seed.sql` — datos de demostración. Ejecutarlo con el rol
   `postgres`/service role (RLS no aplica). Es idempotente: si ya existe la
   empresa "Grupo Solmar" no inserta nada.

Las migraciones son idempotentes en lo razonable (`create … if not exists`,
`create or replace`, `drop policy if exists`, bloques `do $$ … exception when
duplicate_object`), por lo que re-aplicarlas no rompe.

## Modelo entidad–relación

```
empresas ─1───n─ hubs ─1───n─ sucursales ─1───n─ empleados ─1───n─ horarios
    │                             │                                   │
    └─1───n─ perfiles             └─1───n─ importaciones_csv ─1───n───┘
             (usuarios de la app,          │        (importacion_id, nullable)
              1:1 con auth.users)          └─n───1─ perfiles (usuario que importó)

topes_semanales   catálogo independiente: anio → tope_horas
```

| Tabla | Descripción | Claves / restricciones |
|-------|-------------|------------------------|
| `empresas` | Cliente (razón social). Raíz del multi-tenant. | `rfc` único (nullable) |
| `hubs` | Agrupación regional de sucursales. | `unique (empresa_id, nombre)` |
| `sucursales` | Tienda / punto de venta. `zona_horaria` IANA (`America/Mexico_City`). | `unique (hub_id, nombre)` |
| `perfiles` | Usuarios que inician sesión. `id` = `auth.users.id`. `rol` ∈ `rol_usuario`. | `empresa_id` nullable (usuario sin empresa asignada) |
| `empleados` | Colaboradores; **no inician sesión**. `clave_externa` = id en la nómina/CSV. | índice único parcial `(sucursal_id, clave_externa) where clave_externa is not null` |
| `importaciones_csv` | Bitácora de cada archivo importado (`estado`, conteos, `errores` jsonb). | `usuario_id default auth.uid()` |
| `horarios` | Un renglón por empleado × fecha × segmento de turno. `horas` es columna generada. | `unique (empleado_id, fecha, hora_inicio)` |
| `topes_semanales` | `anio` → `tope_horas`. Sólo lectura desde la API. | pk `anio` |

Todas las tablas principales tienen `created_at` y `updated_at`
(trigger `set_updated_at()`).

### `horarios`: el "arreglo de horas por día"

En vez de un arreglo, cada segmento de turno es una fila:

- `fecha` es el día en que **inicia** el segmento.
- `hora_inicio`, `hora_fin` en `time` (24 h).
- `cruza_medianoche = true` cuando el turno termina al día siguiente
  (p. ej. `22:00 → 07:00`). Con cruce se exige `hora_fin <= hora_inicio`;
  sin cruce, `hora_fin > hora_inicio`.
- `minutos_descanso` se resta de la duración.
- `horas` (generada, `numeric(5,2)`) =
  `(hora_fin − hora_inicio [+ 24 h si cruza]) / 1 h − minutos_descanso / 60`.
- Un turno partido (09:00–13:00 y 15:00–19:00) son dos filas del mismo día.
- `origen` ∈ `csv | manual | motor`; `importacion_id` liga la fila al CSV que
  la produjo (`on delete set null`).

### Alta automática de usuarios (`handle_new_user`)

Trigger `after insert on auth.users`. Lee `raw_user_meta_data`:

| Clave | Uso |
|-------|-----|
| `nombre`, `apellido` | Datos del perfil (si falta `nombre`, se usa la parte local del email). |
| `empresa` | Si viene: crea la empresa, un hub **"Principal"** y hace al usuario `owner`. |
| `sucursal` | Si viene junto con `empresa`: crea esa sucursal dentro del hub Principal. |
| `ciudad` | Opcional; ciudad del hub y de la sucursal. |

Un registro **sin** `empresa` crea un perfil con `empresa_id = null` y rol
`admin`; un owner (o el service role) debe asignarle empresa después. Por
seguridad no se acepta `empresa_id` desde metadata (cualquiera podría unirse a
otra empresa).

## Modelo RLS

RLS está habilitado en todas las tablas. `anon` no tiene privilegios sobre
ninguna tabla ni función; `authenticated` tiene `select/insert/update/delete`
filtrado por políticas.

Funciones auxiliares (`security definer`, `stable`, leen `perfiles` sin recursar
sobre RLS):

| Función | Devuelve |
|---------|----------|
| `empresa_actual()` | `empresa_id` del usuario autenticado (o `null`). |
| `rol_actual()` | Su `rol_usuario`. |
| `es_admin()` | `rol in ('owner','admin')`. |
| `puede_editar()` | `rol in ('owner','admin','gerente')`. |

Reglas por tabla (todas anclan en `hubs.empresa_id = empresa_actual()` mediante
`exists (…)` sobre la cadena hub → sucursal → empleado):

| Tabla | select | insert / update / delete |
|-------|--------|--------------------------|
| `empresas` | miembros de la empresa | update: sólo `owner`. Sin insert/delete desde la API. |
| `hubs` | por `empresa_id` | `es_admin()` |
| `sucursales` | vía hub | `es_admin()` |
| `perfiles` | la propia fila; `owner/admin` ven las de su empresa | update: la propia fila, u `owner` sobre su empresa. Trigger `perfiles_proteger_campos` impide que un no-owner cambie `rol` o `empresa_id`. delete: `owner` (no a sí mismo). Sin insert desde la API. |
| `empleados` | vía sucursal → hub | `puede_editar()` |
| `horarios` | vía empleado → sucursal → hub | `puede_editar()` |
| `importaciones_csv` | vía sucursal → hub | insert/update: `puede_editar()` (y `usuario_id` = el propio); delete: `es_admin()` |
| `topes_semanales` | cualquier autenticado | ninguno (catálogo) |

Las vistas `v_horas_semana` y `v_resumen_sucursal_semana` se crean con
`security_invoker = true`, así que aplican las políticas del usuario que
consulta. El RPC `resumen_sucursal(p_sucursal, p_semana)` es `security invoker`
por el mismo motivo.

> Si se agregan tablas nuevas, recuerda `enable row level security`, crear sus
> políticas y `revoke all on <tabla> from anon` (Supabase otorga privilegios a
> `anon` por defecto).

## Vistas y RPC

- **`v_horas_semana`** `(empleado_id, sucursal_id, semana_iso, horas_semana)`
  — suma de `horarios.horas` por empleado y semana ISO. `semana_iso` es el
  **lunes** de la semana (`date_trunc('week', fecha)::date`).
- **`v_resumen_sucursal_semana`** `(sucursal_id, semana_iso, tope_horas,
  colaboradores, horas_totales, horas_al_doble, fuera_de_norma)` — el tope es
  `tope_semanal(extract(year from semana_iso))`;
  `horas_al_doble = sum(greatest(horas_semana − tope, 0))`;
  `fuera_de_norma = count(*) filter (where horas_semana > tope)`.
- **`tope_semanal(anio int)`** — tope del catálogo; para años fuera del
  catálogo devuelve el valor más cercano conocido (≤2025 → 48, ≥2031 → 40).
- **`resumen_sucursal(p_sucursal uuid, p_semana date)`** — misma forma que la
  vista, para una sucursal y la semana ISO que contiene `p_semana`. Siempre
  devuelve una fila (ceros si no hay horarios).

```ts
const { data } = await supabase.rpc('resumen_sucursal', {
  p_sucursal: sucursalId,
  p_semana: '2026-07-29', // cualquier día de la semana
});
```

## Motor de reacomodo (`0005_reacomodo.sql`)

Principio: **las horas de cobertura de la sucursal no desaparecen.** Un
reacomodo que sólo recorta al tope esconde carga; el motor la reparte y, si no
cabe, la hace visible como vacantes.

1. **Ceden.** Quien tiene `horas > tope` queda en el tope. La *bolsa* es la
   suma de esos excesos.
2. **Reciben, fase 1 (deuda de contrato).** Quien está por debajo de su
   `jornada_contratada_horas` sube primero hasta `min(contrato, tope)`, en
   orden de mayor déficit.
3. **Reciben, fase 2 (nivelación).** La bolsa restante se reparte de 0.5 h en
   0.5 h dando siempre a quien menos horas tiene, hasta su límite: el tope, o
   `min(tope, max(contrato, hoy) + p_margen_contrato)` si se fija un margen
   (para no convertir a un medio tiempo en tiempo completo sin avisar).
4. **Sobra.** Lo que queda en la bolsa son *horas sin cubrir*;
   `vacantes_sugeridas = ⌈sin cubrir / tope⌉`. Si no se contrata, esas horas
   seguirán pagándose al doble.

- **`reacomodar_semana(p_sucursal, p_semana, p_tope default null, p_margen_contrato default null)`**
  → una fila por colaborador activo con horas esa semana:
  `(empleado_id, nombre, apellido, puesto, foto_url, jornada_contratada,
  horas_hoy, horas_reacomodadas, delta, rol ∈ cede|recibe|igual)`.
  `p_tope` nulo usa `tope_semanal(año)`; pásalo explícito (p. ej. 40) para
  proyectar 2030.
- **`resumen_reacomodo(…)`** (mismos parámetros) → una fila:
  `(semana_iso, tope_horas, colaboradores, horas_totales, horas_excedentes,
  horas_absorbidas, horas_sin_cubrir, vacantes_sugeridas,
  fuera_de_norma_antes, fuera_de_norma_despues)`.

Ambas son `security invoker` (respetan RLS). La app replica la misma lógica en
`src/lib/reacomodo/index.ts` para el modo demo; ambas implementaciones deben
dar el mismo resultado (verificado con la semilla: tope 48 → Escobar 25→27 y
Molina 24.5→27, 0 h sin cubrir; tope 40 → 18 h sin cubrir, 1 vacante).

```ts
const { data } = await supabase.rpc('resumen_reacomodo', {
  p_sucursal: sucursalId,
  p_semana: '2026-07-29',
  p_tope: 40, // opcional
});
```

## Contrato del CSV de turnos

Archivo de ejemplo: [`plantillas/turnos-ejemplo.csv`](plantillas/turnos-ejemplo.csv).

- Codificación **UTF-8** (sin BOM de preferencia), separador **coma**, primera
  fila de encabezados exactamente como sigue:

```
clave,nombre,apellido,puesto,jornada_contratada,fecha,hora_inicio,hora_fin,minutos_descanso
```

| Columna | Tipo | Obligatoria | Descripción |
|---------|------|-------------|-------------|
| `clave` | texto | sí | Id del colaborador en la nómina del cliente → `empleados.clave_externa`. Única por sucursal. |
| `nombre` | texto | sí | Nombre(s). |
| `apellido` | texto | sí | Apellido(s). |
| `puesto` | texto | no | Puesto. |
| `jornada_contratada` | decimal | no | Horas semanales pactadas (p. ej. `48`, `24.5`). |
| `fecha` | `YYYY-MM-DD` | sí | Día en que inicia el turno. |
| `hora_inicio` | `HH:MM` 24 h | sí | Inicio del segmento. |
| `hora_fin` | `HH:MM` 24 h | sí | Fin del segmento. Si es menor o igual que `hora_inicio` el turno **cruza medianoche** (`cruza_medianoche = true`). |
| `minutos_descanso` | entero ≥ 0 | no (default 0) | Minutos de descanso a descontar del segmento. |

Reglas:

- **Una fila por segmento de turno.** Un turno partido son dos (o más) filas
  con la misma `fecha` y distinta `hora_inicio`.
- Las filas del mismo `clave` repiten los datos del colaborador; la app hace
  *upsert* de `empleados` por `(sucursal_id, clave_externa)` y luego inserta
  `horarios` con `origen = 'csv'` e `importacion_id` de la carga.
- Cada carga se registra en `importaciones_csv` (`filas_totales`, `filas_ok`,
  `filas_error`, `errores` como `[{"fila": n, "columna": "...", "mensaje": "..."}]`).
- Re-importar la misma fila (`empleado`, `fecha`, `hora_inicio`) choca con la
  restricción única; la app decide si actualiza o reporta el error.

## Datos de demostración (`seed.sql`)

Empresa **Grupo Solmar** → hub **CDMX Sur** → sucursales **Coapa**, **Polanco**,
**Satélite**. Ocho colaboradores en Coapa con la semana ISO 31 de 2026
(2026-07-27 → 2026-08-02, tope 48 h):

| Colaborador | Horas | Estado |
|-------------|-------|--------|
| Ortega Bruno | 49.0 | fuera de norma (1.0 h al doble) |
| Cárdenas Ismael | 49.0 | fuera de norma (1.0 h al doble) |
| Quintero Diego | 49.0 | fuera de norma, turno partido (1.0 h al doble) |
| Téllez Rodrigo | 49.0 | fuera de norma, turno nocturno (1.0 h al doble) |
| Nájera Paola | 48.5 | fuera de norma (0.5 h al doble) |
| Olvera Héctor | 44.0 | en norma |
| Escobar Tomás | 25.0 | en norma (medio tiempo) |
| Molina Rocío | 24.5 | en norma (medio tiempo) |

Resumen esperado de Coapa: 8 colaboradores, 338.0 h totales, 4.5 h al doble,
5 fuera de norma. No se crean usuarios de `auth`; para ver los datos desde la
app, registra un usuario y asigna su `perfiles.empresa_id` a la empresa demo
(con el service role) o consulta con el rol `postgres`.
