import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Run with: node --env-file=.env <script>`);
  }
  return value;
}

export const s3Bucket = requireEnv("S3_BUCKET");
export const s3PublicBaseUrl = requireEnv("S3_PUBLIC_BASE_URL");

function withScheme(url) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

export const s3Client = new S3Client({
  endpoint: withScheme(requireEnv("S3_ENDPOINT")),
  region: requireEnv("S3_REGION"),
  credentials: {
    accessKeyId: requireEnv("S3_ACCESS_KEY"),
    secretAccessKey: requireEnv("S3_SECRET_KEY"),
  },
  forcePathStyle: true,
});

export async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
