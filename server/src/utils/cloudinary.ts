import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { ApiError } from './ApiError';

let configured = false;

function ensureConfigured() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw ApiError.badRequest(
      'ATTACHMENTS_NOT_CONFIGURED',
      'File attachments are not available: Cloudinary is not configured'
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
    });
    configured = true;
  }
}

export function uploadBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; publicId: string }> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'orbitpm/attachments',
        resource_type: 'auto', // handles images, PDFs, docs, etc.
        filename_override: filename,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteByPublicId(publicId: string) {
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
  } catch (err) {
    console.error('[cloudinary] Failed to delete asset:', err);
  }
}
