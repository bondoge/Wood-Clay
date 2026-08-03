// One-off uploader for the corporate PDF catalog — pushes a local PDF to the
// Selectel bucket under documents/catalog.pdf and prints its public URL.
// Re-run whenever the catalog PDF is replaced:
//   node --env-file=.env scripts/upload-catalog-pdf.mjs <path-to-pdf>
import path from "node:path";
import { readFile } from "node:fs/promises";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Bucket, s3Client, s3PublicBaseUrl } from "./s3-client.mjs";

const TARGET_KEY = "documents/catalog.pdf";

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath) {
    throw new Error("Usage: node --env-file=.env scripts/upload-catalog-pdf.mjs <path-to-pdf>");
  }

  const body = await readFile(path.resolve(sourcePath));

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: TARGET_KEY,
      Body: body,
      ContentType: "application/pdf",
    }),
  );

  console.log(`Uploaded -> ${s3PublicBaseUrl.replace(/\/+$/, "")}/${TARGET_KEY}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
