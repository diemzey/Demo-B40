import { COOKIE_SEMANA, COOKIE_SUCURSAL } from "@/lib/datos/tipos";

/**
 * Cookies con las que el panel (servidor) sabe qué sucursal y semana mostrar.
 * Sólo en el navegador: las escriben los selectores del shell, el botón "Ver"
 * de Semanas y la carga del CSV; las lee `src/lib/datos/dashboard.ts`.
 */

const UN_ANIO_S = 31536000;

/** Guarda la sucursal elegida (por `id`) para que el panel la muestre. */
export function guardarSucursal(id: string) {
  document.cookie = `${COOKIE_SUCURSAL}=${encodeURIComponent(id)}; path=/; max-age=${UN_ANIO_S}; samesite=lax`;
}

/** Guarda la semana elegida (lunes `YYYY-MM-DD`) para que el panel la muestre. */
export function guardarSemana(inicio: string) {
  document.cookie = `${COOKIE_SEMANA}=${encodeURIComponent(inicio)}; path=/; max-age=${UN_ANIO_S}; samesite=lax`;
}
