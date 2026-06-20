import { getGcsBucket, getPublicFullUrl } from "@/lib/uploads";

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
    const publicFiles = process.env.GCS_PUBLIC_FILES === "true";

    if (publicFiles) {
      const publicUrl = getPublicFullUrl(filePath);
      return new Response(null, {
        status: 307,
        headers: { Location: publicUrl },
      });
    }

    // Private: generate signed URL
    const { bucket } = getGcsBucket();
    const gcsFile = bucket.file(filePath);

    const [exists] = await gcsFile.exists();
    if (!exists) {
      return new Response("File not found", { status: 404 });
    }

    const [signedUrl] = await gcsFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    return new Response(null, {
      status: 307,
      headers: { Location: signedUrl },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
