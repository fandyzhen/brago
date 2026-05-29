import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || "";
const SECRET = process.env.STORAGE_SECRET_ACCESS_KEY || "";
const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL || "";
const ENDPOINT = process.env.STORAGE_ENDPOINT || "";
const BUCKET = process.env.STORAGE_BUCKET_NAME || "brago";

function resolveEndpoint(): string {
  if (ENDPOINT.includes(".r2.cloudflarestorage.com")) {
    const parts = ENDPOINT.split("/");
    if (parts.length >= 3) {
      return `${parts[0]}//${parts[2]}`;
    }
  }
  return ENDPOINT;
}

const r2Client =
  ACCESS_KEY_ID && SECRET && ENDPOINT
    ? new S3Client({
        region: "auto",
        endpoint: resolveEndpoint(),
        credentials: {
          accessKeyId: ACCESS_KEY_ID,
          secretAccessKey: SECRET,
        },
      })
    : null;

export function isR2Ready(): boolean {
  return Boolean(r2Client && PUBLIC_URL && BUCKET);
}

export type UploadBufferInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export async function uploadBuffer(opts: UploadBufferInput): Promise<string> {
  if (!r2Client) {
    throw new Error("R2 not configured");
  }
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );
  return `${PUBLIC_URL.replace(/\/$/, "")}/${opts.key}`;
}

export type GooglePostKind = "original" | "processed" | "thumbnail" | "final";

export function buildGooglePostKey(
  userId: string,
  postId: string,
  kind: GooglePostKind,
  suffix: string,
): string {
  const ts = Date.now();
  return `brago/google-posts/${userId}/${postId}/${kind}/${ts}_${suffix}`;
}

export function bufferToDataUrl(
  buffer: Buffer,
  contentType: string,
): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
