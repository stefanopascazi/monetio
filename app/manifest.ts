import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MonetIO",
    short_name: "MonetIO",
    description: "Le finanze di famiglia, condivise.",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbfcfb",
    theme_color: "#fbfcfb",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
