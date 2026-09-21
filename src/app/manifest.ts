import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jornada40 · Cumple la jornada de 40 horas sin cambiar contratos",
    short_name: "Jornada40",
    description:
      "Reacomoda los turnos de tu sucursal con los mismos contratos y cumple la reforma de la jornada de 40 horas.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "es-MX",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
