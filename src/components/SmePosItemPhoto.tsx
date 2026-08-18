import { useEffect, useMemo, useState } from 'react';
import { getSmePosItemPhotoUrl } from '../repositories/smePosRepository';

interface ItemPhotoProps {
  photoPath?: string | null;
  name: string;
  className?: string;
}

export function SmePosItemPhoto({ photoPath, name, className = '' }: ItemPhotoProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    setUrl('');
    if (!photoPath) return () => { active = false; };
    void getSmePosItemPhotoUrl(photoPath)
      .then((nextUrl) => { if (active) setUrl(nextUrl); })
      .catch(() => { if (active) setUrl(''); });
    return () => { active = false; };
  }, [photoPath]);

  if (!photoPath || !url) return null;
  return <img className={`sme-pos-item-photo ${className}`.trim()} src={url} alt={name} loading="lazy" />;
}

interface ItemPhotoFieldProps {
  currentPhotoPath?: string | null;
  file: File | null;
  removeExisting: boolean;
  onFileChange: (file: File | null) => void;
  onRemoveExisting: (value: boolean) => void;
  disabled?: boolean;
}

export function SmePosItemPhotoField({
  currentPhotoPath,
  file,
  removeExisting,
  onFileChange,
  onRemoveExisting,
  disabled = false,
}: ItemPhotoFieldProps) {
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : '', [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return <div className="sme-pos-photo-field">
    <div className="sme-pos-photo-preview">
      {file
        ? <img className="sme-pos-item-photo form-preview" src={previewUrl} alt="Selected item" />
        : currentPhotoPath && !removeExisting
          ? <SmePosItemPhoto photoPath={currentPhotoPath} name="Current item" className="form-preview" />
          : <div className="sme-pos-photo-placeholder"><span>📷</span><strong>No item photo</strong></div>}
    </div>
    <div className="sme-pos-photo-actions">
      <label className="button secondary small">
        Take photo
        <input
          className="sme-pos-photo-input"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled}
          onChange={(event) => {
            const nextFile = event.target.files?.[0] || null;
            if (nextFile) {
              onRemoveExisting(false);
              onFileChange(nextFile);
            }
            event.currentTarget.value = '';
          }}
        />
      </label>
      <label className="button secondary small">
        Upload photo
        <input
          className="sme-pos-photo-input"
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(event) => {
            const nextFile = event.target.files?.[0] || null;
            if (nextFile) {
              onRemoveExisting(false);
              onFileChange(nextFile);
            }
            event.currentTarget.value = '';
          }}
        />
      </label>
      {file && <button className="button ghost small" type="button" disabled={disabled} onClick={() => onFileChange(null)}>Clear selected</button>}
      {!file && currentPhotoPath && !removeExisting && <button className="button ghost small" type="button" disabled={disabled} onClick={() => onRemoveExisting(true)}>Remove photo</button>}
      {!file && currentPhotoPath && removeExisting && <button className="button ghost small" type="button" disabled={disabled} onClick={() => onRemoveExisting(false)}>Keep current photo</button>}
    </div>
    <small>One photo only · camera or upload · image under 5 MB.</small>
  </div>;
}
