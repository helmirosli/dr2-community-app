import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// WhatsApp / social preview card (spec §6.7): A5 art with the title drawn over its empty left half.
export const alt = "JR2 Desa Restu: yuran pondok pengawal, semak status & hantar bukti bayaran";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const background = await readFile(join(process.cwd(), "public/art/a5-og.jpg"));
  const src = `data:image/jpeg;base64,${background.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#050a1a" }}>
        <img src={src} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px", width: 560, color: "white" }}>
          <div style={{ fontSize: 30, color: "#8ee53f", fontWeight: 600 }}>JR2 · Desa Restu</div>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, marginTop: 12 }}>Yuran pondok pengawal</div>
          <div style={{ fontSize: 30, color: "#a1a1a6", marginTop: 20 }}>Semak status rumah anda & hantar bukti bayaran.</div>
        </div>
      </div>
    ),
    size,
  );
}
