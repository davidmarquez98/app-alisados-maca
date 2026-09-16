# Alisados Maca

Primera versión de la web pública y experiencia de reservas de Alisados Maca. Está construida con Next.js, TypeScript y Tailwind CSS, con una interfaz mobile-first y datos locales.

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
- `src/lib`: helpers de formato y fechas.
- `src/types`: tipos compartidos.

## Integraciones pendientes

La agenda y su disponibilidad, clientes, persistencia de reservas, autenticación del admin y dirección privada están mockeados para una futura integración con Supabase. El pago de la seña es una simulación local preparada para reemplazarse por Mercado Pago.
