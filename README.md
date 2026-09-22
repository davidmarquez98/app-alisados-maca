# Alisados Maca

Primera versión de la web pública y experiencia de reservas de Alisados Maca. Está construida con Next.js, TypeScript y Tailwind CSS, con una interfaz mobile-first. El catálogo, la disponibilidad pública y las reservas públicas se leen/escriben en Supabase. El admin en desarrollo también lee reservas y bloqueos reales.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Comandos

- `npm run dev`: entorno de desarrollo.
- `npm run build`: build de producción.
- `npm run start`: servidor de producción.
- `npm run lint`: análisis estático.

## Estructura

- `src/app`: rutas públicas, reserva, confirmación y admin.
- `src/components`: componentes reutilizables y wizard de reserva.
- `src/config`: negocio, servicios y reglas de turnos centralizados.
- `src/lib`: helpers de formato y fechas, repositorio mock y clientes Supabase.
- `src/repositories`: consultas server-side de catálogo, agenda y reservas.
- `src/app/api`: disponibilidad y creación de reservas públicas.
- `src/services/service-service.ts`: adaptación de filas SQL al modelo de la UI pública.
- `src/types`: tipos compartidos de UI y filas de base de datos.
- `supabase/migrations`: esquema SQL versionado.
- `supabase/seed.sql`: catálogo inicial de Alisados Maca.

## Base de datos Supabase

La primera migración es [`supabase/migrations/20260921000100_initial_schema.sql`](supabase/migrations/20260921000100_initial_schema.sql). Crea diez tablas: `businesses`, `professionals`, `business_members`, `services`, `service_prices`, `clients`, `bookings`, `schedule_blocks`, `payments` y `booking_events`. Incluye claves foráneas, validaciones de estados y montos, integridad entre negocios, triggers de `updated_at` e índices de consulta. Un índice único parcial impide que un profesional tenga dos turnos `pending` o `confirmed` con el mismo `starts_at`. Este índice no comprueba solapamientos arbitrarios entre intervalos; la disponibilidad seguirá necesitando lógica de agenda cuando se conecte el frontend.

RLS está habilitado en las diez tablas. `anon` solo puede consultar servicios activos y sus precios; no tiene acceso a reservas, clientas, pagos ni miembros. La migración incremental del catálogo permite leer únicamente `businesses.id`, `businesses.slug` y `businesses.active` de negocios activos; `private_address` y las demás columnas no tienen permiso de lectura anónima. Los miembros autenticados con rol `admin` pueden operar sobre las filas de su negocio; la comprobación de pertenencia vive en una función interna `private.is_business_admin` que consulta `business_members` sin recursión de RLS. Los profesionales no se exponen públicamente por ahora. La migración no crea ningún miembro: hasta configurar Auth y asociar a Maca, las policies de administración no concederán acceso desde la app.

### Aplicar migración y seed

En un proyecto Supabase nuevo, ejecutá primero el contenido de `supabase/migrations/20260921000100_initial_schema.sql` en el SQL Editor del proyecto y después `supabase/seed.sql`. Ambos archivos son SQL, pero **solo el seed es idempotente**: no vuelvas a ejecutar la migración inicial sobre una base donde ya fue aplicada. También podés usar Supabase CLI para vincular el proyecto con `supabase link --project-ref <ref>`, revisar con `supabase db push --dry-run` y aplicar con `supabase db push`; luego ejecutá `supabase/seed.sql` en el SQL Editor. Elegí un solo método para aplicar la migración: ejecutarla manualmente en SQL Editor no la registra automáticamente en el historial del CLI, por lo que un `db push` posterior intentaría repetirla. No guardes contraseñas ni tokens en el repositorio.

El seed crea el negocio, la profesional Maca, los cuatro servicios y sus 16 precios. Usa `ON CONFLICT` para poder repetirse sin duplicarlos. No crea usuarios de `auth.users`, `business_members`, reservas ni pagos.

Para habilitar administración en producción faltan: configurar Supabase Auth, crear la cuenta de Maca y asociarla mediante `business_members` con rol `admin`. Las reservas públicas usan endpoints server-side; **no** se habilitó escritura anónima directa. Mercado Pago sigue sin integrar. Los tipos de filas están en [`src/types/database.ts`](src/types/database.ts), separados de los modelos mock actuales.

### Catálogo público conectado

Home, páginas `/servicios/[slug]` y selección del wizard consultan `services` y `service_prices` desde el servidor. El repositorio resuelve `BUSINESS_SLUG` (`alisados-maca`) a `businesses.id` y filtra cada consulta de servicios por ese ID, además de `active = true` y, en el detalle, el slug del servicio. No se hardcodea ningún UUID. Los precios se ordenan por `sort_order`; nombre, descripción, duración y precios salen de Supabase. Si falta una descripción o falla Supabase, se muestra un mensaje de error en lugar de recurrir al mock. Los colores y encabezados breves siguen siendo presentación local.

La migración incremental [`supabase/migrations/20260921000200_catalog_descriptions_and_business_scope.sql`](supabase/migrations/20260921000200_catalog_descriptions_and_business_scope.sql) carga las cuatro descripciones que ya existían en el frontend y habilita la lectura pública **solo** de `businesses.id`, `businesses.slug` y `businesses.active`, necesaria para resolver el negocio. No modifica la migración inicial ya aplicada. También se actualizaron las descripciones en `supabase/seed.sql` para instalaciones nuevas. Antes de desplegar el frontend actualizado, aplicá la migración incremental al remoto. Si la migración inicial figura como aplicada en el historial del CLI, ejecutá `supabase db push --dry-run` y luego `supabase db push`. Si la inicial se ejecutó manualmente en SQL Editor, verificá el historial con `supabase migration list`; tras confirmar que el esquema inicial existe, podés registrar solo su historial con `supabase migration repair 20260921000100 --status applied` y luego usar `db push`. Alternativamente ejecutá únicamente el SQL de la migración incremental en SQL Editor y mantené ese método de aplicación; no intentes reaplicar la inicial.

### Reservas públicas reales

Aplicá [`supabase/migrations/20260921000300_public_booking_server_access.sql`](supabase/migrations/20260921000300_public_booking_server_access.sql) antes de usar los endpoints. La migración concede a `service_role` los permisos de tabla mínimos que la migración inicial no concedía y crea `create_public_booking`, una función transaccional invocable solo con la clave secreta server-side. Podés aplicarla mediante `supabase db push` si el historial de migraciones anteriores está sincronizado, o ejecutando **solo ese archivo** en SQL Editor si las anteriores se aplicaron manualmente. Nunca incluyas `SUPABASE_SECRET_KEY` en el navegador ni en git.

`GET /api/availability?date=YYYY-MM-DD` consulta reservas `pending`/`confirmed` y bloqueos reales para Maca, en horario de Argentina. `POST /api/bookings` vuelve a validar fecha, hora y disponibilidad, normaliza WhatsApp y crea/reutiliza la clienta, una reserva `pending` y un evento `created` en una sola transacción. El índice único parcial impide dos reservas activas para el mismo inicio. La pantalla final muestra un identificador opaco de la reserva creada y la seña pendiente, sin consultar ni exponer reservas ajenas.

### Admin real en desarrollo

Aplicá [`supabase/migrations/20260921000400_admin_agenda.sql`](supabase/migrations/20260921000400_admin_agenda.sql) después de la migración pública anterior. Agrega permisos solo a `service_role` y una función transaccional `admin_apply_booking_action`: reprogramar, cancelar, completar, marcar no-show y reactivar siempre actualizan el booking junto con su `booking_event`. Las reservas se muestran con datos de clienta, servicio y profesional; los bloqueos se crean y eliminan en `schedule_blocks`. El panel no usa `localStorage` para estas entidades. La creación y edición general de turnos desde admin quedan fuera de esta iteración; los turnos nuevos se crean desde `/reservar`.

Para pruebas end-to-end con reservas de prueba eliminables, aplicá temporalmente [`supabase/testing/temporary_fixture_permissions.sql`](supabase/testing/temporary_fixture_permissions.sql) y, una vez comprobada la limpieza de todos los fixtures, [`supabase/testing/revoke_fixture_permissions.sql`](supabase/testing/revoke_fixture_permissions.sql). Estos permisos de borrado no forman parte de la migración de producción ni se exponen en las APIs del admin.

**Sin Auth, el admin no es seguro para producción.** `/admin` y `/api/admin/*` están deshabilitados cuando `NODE_ENV` no es `development`. En desarrollo local siguen sin autenticación; no expongas el servidor de desarrollo a una red no confiable. Antes de desplegar el admin habrá que integrar Auth, verificar la membresía del negocio en cada petición y habilitar las rutas protegidas. No hay contraseña hardcodeada ni protección falsa del lado cliente.

Al reactivar una reserva cancelada, una seña `paid` conserva el pago y la reserva pasa a `confirmed`; una seña `pending` sigue pendiente; una seña `forfeited` o `refunded` vuelve a `pending` porque se requiere una nueva seña. El evento registra el estado anterior.
Si el horario original está ocupado o ya pasó, el turno cancelado puede reprogramarse primero (permanece `cancelled`) y luego reactivarse en el nuevo horario.

## Integraciones pendientes

El código mock sigue en el repositorio como legado, pero el panel admin no lo importa para bookings ni bloqueos. No hay sección nueva de clientas: se leen las clientas relacionadas con cada turno real. La seña no se cobra online todavía; queda `pending` hasta integrar el flujo de pago.
