import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arrival Atlas",
    short_name: "Arrival Atlas",
    description:
      "Historical US domestic flight reliability from official BTS records.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2e9",
    theme_color: "#071922",
  };
}
