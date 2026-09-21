import type { ReactNode } from "react";

import { PageTransition } from "@/components/motion/page-transition";

/**
 * Plantilla raíz: Next la vuelve a montar con una `key` nueva en cada
 * navegación entre segmentos de primer nivel (/ ⇄ /login ⇄ /registro ⇄
 * /dashboard…). Ese remonte es justo lo que necesita `<ViewTransition>` para
 * formar el par salida/entrada entre la pantalla que se va y la que llega.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
