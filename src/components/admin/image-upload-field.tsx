import { useState } from 'react';
import { toast } from 'sonner';

import { apiUpload } from '@/lib/api-client';

interface UploadImageResult {
  urls: string[];
  results: Array<{
    url: string;
    key: string;
    filename: string;
    deduped: boolean;
  }>;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    const formData = new FormData();
    formData.append('files', file);

    setUploading(true);
    try {
      const result = await apiUpload<UploadImageResult>(
        '/api/storage/upload-image',
        formData
      );
      const url = result.urls?.[0];
      if (!url) throw new Error('Upload completed without an image URL');
      onChange(url);
      toast.success(
        result.results?.[0]?.deduped ? 'Image already existed' : 'Image uploaded'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="border-border bg-muted/30 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-muted-foreground px-2 text-center text-xs">
              No image
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/games/example.png or https://..."
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = '';
              if (file) void upload(file);
            }}
            className="text-muted-foreground block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-medium file:text-primary-foreground disabled:opacity-60"
          />
          <p className="text-muted-foreground text-xs">
            {uploading
              ? 'Uploading…'
              : help || 'Upload a new asset or paste an existing URL/path.'}
          </p>
        </div>
      </div>
    </div>
  );
}
