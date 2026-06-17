import { readFile } from "node:fs/promises";
import path from "node:path";
import { getUploadRoot } from "@/lib/uploads";

type RouteParams = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  if (!filePath) {
    return new Response("File not found", { status: 404 });
  }

  try {
    const uploadRoot = getUploadRoot();

    // Handle both absolute and relative paths for backward compatibility
    let fullPath: string;

    // Check if the filePath contains uploads directory (indicating old absolute path format)
    if (filePath.includes("/uploads/")) {
      // Old format: extract the uploads relative part
      const uploadsIndex = filePath.indexOf("/uploads/");
      const relativePart = filePath.substring(uploadsIndex + 1); // Skip the leading "/"
      fullPath = path.resolve(uploadRoot, relativePart);
    } else {
      // New format: relative path
      fullPath = path.resolve(uploadRoot, filePath);
    }

    if (!fullPath.startsWith(uploadRoot)) {
      return new Response("Unauthorized", { status: 403 });
    }

    const content = await readFile(fullPath);

    const ext = path.extname(filePath).toLowerCase();
    let mimeType = "application/octet-stream";

    if (ext === ".pdf") {
      mimeType = "application/pdf";
    } else if ([".jpg", ".jpeg"].includes(ext)) {
      mimeType = "image/jpeg";
    } else if (ext === ".png") {
      mimeType = "image/png";
    } else if (ext === ".webp") {
      mimeType = "image/webp";
    }

    const filename = path.basename(filePath);

    return new Response(content, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": content.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
