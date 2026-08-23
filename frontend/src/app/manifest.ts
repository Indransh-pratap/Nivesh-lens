import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nivesh Lens | Institutional Portfolio Intelligence",
    short_name: "Nivesh Lens",
    description: "AMFI Look-Through, True Company Exposure & Wealth Diagnostics for Indian Investors.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    // NOTE: add real icon files under /public (e.g. icon-192.png, icon-512.png)
    // and reference them here before shipping — omitted for now since this
    // project has no /public folder yet.
    icons: [],
  };
}
