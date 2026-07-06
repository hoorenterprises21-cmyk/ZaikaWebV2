import { useEffect, useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { adminApi, apiError } from '../lib/api';
import { useToast } from './Toast';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Image' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const toast = useToast();

  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast('File too large (max 5MB)', 'error');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast('Only JPG, PNG, WebP, GIF allowed', 'error');
      return;
    }

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await adminApi.post('/upload.php', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data?.success && data.url) {
        onChange(data.url);
        toast('Image uploaded', 'success');
      } else {
        throw new Error(data?.message || 'Upload failed');
      }
    } catch (err) {
      toast(apiError(err, 'Upload failed'), 'error');
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <>
              <img src={preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(''); setPreview(''); }}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-neutral-400">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            </div>
          )}
        </div>
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary btn-sm"
          >
            {uploading ? 'Uploading...' : 'Choose file'}
          </button>
          <p className="mt-1 text-xs text-neutral-400">JPG, PNG, WebP, GIF — max 5MB</p>
          {value && (
            <input
              type="text"
              value={value}
              onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }}
              className="input mt-1 text-xs"
              placeholder="Or paste URL"
            />
          )}
        </div>
      </div>
    </div>
  );
}
