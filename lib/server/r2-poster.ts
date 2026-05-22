import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Upload a PNG buffer to Cloudflare R2.
 * Returns the public URL, or null if R2 is not configured.
 * Throws if R2 is configured but the upload fails.
 */
export async function uploadPosterToR2(
  buffer: Buffer,
  userId: string
): Promise<string | null> {
  const bucketName = process.env.STORAGE_BUCKET_NAME;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const endpoint = process.env.STORAGE_ENDPOINT;
  const publicUrl = process.env.STORAGE_PUBLIC_URL;

  // Graceful degradation: if R2 is not configured, skip upload
  if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint || !publicUrl) {
    return null;
  }

  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  const key = `posters/${userId}/${timestamp}-${randomId}.png`;

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    })
  );

  return `${publicUrl}/${key}`;
}
