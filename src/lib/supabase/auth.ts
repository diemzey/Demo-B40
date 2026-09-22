/**
 * Utilidades compartidas por los formularios de acceso (`login-form.tsx`,
 * `register-form.tsx`) y los route handlers de `src/app/auth/**`.
 *
 * No importa ningún cliente de Supabase: son funciones puras que se pueden
 * usar tanto en el navegador como en el servidor.
 */

/**
 * Valida un destino de redirección que llega por query string (`?next=`).
 *
 * Solo se aceptan rutas relativas al mismo origen: deben empezar con `/`,
 * no con `//` (que el navegador interpreta como otro host) ni contener
 * caracteres de control o barras invertidas. Todo lo demás cae al `fallback`.
 */
export function rutaSegura(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  const valor = next.trim();
  if (!valor.startsWith("/")) return fallback;
  if (valor.startsWith("//") || valor.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(valor)) return fallback;
  if (valor.includes("\\")) return fallback;
  // Evita bucles: entrar y volver a la propia pantalla de acceso no tiene sentido.
  if (/^\/(login|registro)(\/|\?|#|$)/.test(valor)) return fallback;
  return valor;
}

/** Forma mínima de un error de Supabase Auth que necesitamos para traducirlo. */
export type ErrorAuth = { message?: string; code?: string; status?: number } | null | undefined;

const MENSAJES_POR_CODIGO: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu correo antes de entrar.",
  user_already_exists: "Ya existe una cuenta con ese correo. Entra o recupera tu contraseña.",
  email_exists: "Ya existe una cuenta con ese correo. Entra o recupera tu contraseña.",
  weak_password:
    "Usa al menos 8 caracteres con letras y números.",
  email_address_invalid: "Ese correo no parece válido.",
  email_address_not_authorized: "Ese correo no está autorizado para registrarse.",
  signup_disabled: "Por ahora no se aceptan registros nuevos.",
  over_request_rate_limit: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  over_email_send_rate_limit:
    "Demasiados correos enviados. Espera unos minutos e inténtalo de nuevo.",
  user_banned: "Esta cuenta está suspendida. Escríbenos si crees que es un error.",
  otp_expired: "El enlace caducó. Pide uno nuevo desde la pantalla de acceso.",
  validation_failed: "Revisa los datos e inténtalo de nuevo.",
};

const MENSAJES_POR_TEXTO: Array<[RegExp, string]> = [
  [/invalid login credentials/i, MENSAJES_POR_CODIGO.invalid_credentials],
  [/email not confirmed/i, MENSAJES_POR_CODIGO.email_not_confirmed],
  [/already registered|already exists/i, MENSAJES_POR_CODIGO.user_already_exists],
  [/password should be at least|weak password/i, MENSAJES_POR_CODIGO.weak_password],
  [/rate limit/i, MENSAJES_POR_CODIGO.over_request_rate_limit],
  [/unable to validate email|invalid email/i, MENSAJES_POR_CODIGO.email_address_invalid],
  [
    /network|fetch/i,
    "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  ],
];

export const MENSAJE_AUTH_GENERICO = "Ocurrió un problema. Inténtalo de nuevo en un momento.";

/**
 * Traduce un error de Supabase Auth a un mensaje corto en español.
 * Primero intenta por `code` (estable), luego por el texto y por último
 * devuelve un mensaje genérico para no filtrar detalles internos.
 */
export function mensajeDeErrorAuth(error: ErrorAuth): string {
  if (!error) return MENSAJE_AUTH_GENERICO;
  if (error.code && MENSAJES_POR_CODIGO[error.code]) return MENSAJES_POR_CODIGO[error.code];
  const texto = error.message ?? "";
  for (const [re, mensaje] of MENSAJES_POR_TEXTO) {
    if (re.test(texto)) return mensaje;
  }
  return MENSAJE_AUTH_GENERICO;
}

/**
 * Cuando la confirmación por correo está activa, Supabase responde a un
 * `signUp` con un correo ya registrado devolviendo un usuario "falso" sin
 * identidades (para no revelar qué correos existen). Lo detectamos aquí.
 */
export function esUsuarioYaRegistrado(
  user: { identities?: unknown[] | null } | null | undefined,
): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}
