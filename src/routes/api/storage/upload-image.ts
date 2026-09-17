import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getAuth } from '@/core/auth';
import { md5 } from '@/lib/hash';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import { getStorage } from '@/modules/storage/service';

const SAFE_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

// Global upload cap, enforced before reading a File into Worker memory. The
// existing config name is retained for backward compatibility.
const IMAGE_MAX_BYTES =
  (Number(envConfigs.inline_image_max_kb) || 10240) * 1024;

function hasExpectedSignature(type: string, body: Uint8Array) {
  if (type === 'image/jpeg' || type === 'image/jpg') {
    return body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  }
  if (type === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((byte, index) => body[index] === byte);
  }
  if (type === 'image/gif') {
    const header = new TextDecoder().decode(body.slice(0, 6));
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (type === 'image/webp') {
    const riff = new TextDecoder().decode(body.slice(0, 4));
    const webp = new TextDecoder().decode(body.slice(8, 12));
    return riff === 'RIFF' && webp === 'WEBP';
  }
  if (type === 'image/avif') {
    const boxType = new TextDecoder().decode(body.slice(4, 8));
    const brand = new TextDecoder().decode(body.slice(8, 12));
    return boxType === 'ftyp' && ['avif', 'avis'].includes(brand);
  }
  return false;
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'upload-image',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    if (!files.length) return respErr('No files provided');

    const storage = await getStorage();
    const uploadResults: Array<{
      url: string;
      key: string;
      filename: string;
      deduped: boolean;
    }> = [];

    for (const file of files) {
      const ext = SAFE_IMAGE_TYPES[file.type];
      if (!ext) {
        return respErr(
          `File ${file.name} must be JPEG, PNG, WebP, GIF, or AVIF. SVG and other active/unsupported image formats are rejected.`
        );
      }

      if (file.size <= 0 || file.size > IMAGE_MAX_BYTES) {
        const limitKb = Math.round(IMAGE_MAX_BYTES / 1024);
        return respErr(
          `Image ${file.name} is too large or empty (${Math.round(file.size / 1024)}KB; max ${limitKb}KB).`
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);
      if (!hasExpectedSignature(file.type, body)) {
        return respErr(`File ${file.name} does not match its declared image type`);
      }

      const digest = md5(body);
      // R2Provider prepends its own uploadPath (default `uploads`), so the object
      // key is the bare filename. The local fallback uses `public/uploads/<file>`.
      const objectKey = `${digest}.${ext}`;

      // No storage configured → persist to public/uploads and return a short
      // local URL. Production Workers should configure R2 because the local
      // filesystem is not durable across deployments/isolates.
      if (!storage) {
        const dir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, objectKey), body);
        uploadResults.push({
          url: `/uploads/${objectKey}`,
          key: `uploads/${objectKey}`,
          filename: file.name,
          deduped: false,
        });
        continue;
      }

      const exists = await storage.exists({ key: objectKey });
      if (exists) {
        const publicUrl = storage.getPublicUrl({ key: objectKey });
        if (publicUrl) {
          uploadResults.push({
            url: publicUrl,
            key: objectKey,
            filename: file.name,
            deduped: true,
          });
          continue;
        }
      }

      const result = await storage.uploadFile({
        body,
        key: objectKey,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success || !result.url) {
        return respErr(result.error || 'Upload failed');
      }

      uploadResults.push({
        url: result.url,
        key: result.key || objectKey,
        filename: file.name,
        deduped: false,
      });
    }

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e: any) {
    console.error('upload image failed:', e);
    return respErr(e?.message || 'upload image failed');
  }
}

export const Route = createFileRoute('/api/storage/upload-image')({
  server: {
    handlers: { POST },
  },
});
