import "server-only";

import { put } from "@vercel/blob";

export type BlobUploadResult = {
  url: string;
};

export async function uploadRunFile(
  name: string,
  data: Buffer,
  contentType: string
): Promise<BlobUploadResult> {
  const blob = await put(name, data, {
    access: "public",
    contentType
  });
  return { url: blob.url };
}
