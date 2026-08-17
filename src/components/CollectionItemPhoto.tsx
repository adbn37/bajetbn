import { useEffect, useState } from 'react';
import { getCollectionItemPhotoUrl } from '../repositories/collectionRepository';
import type { CollectionItemPhoto as CollectionPhoto } from '../types/models';

export function CollectionItemPhoto({ photo, alt, className = '' }: {
  photo?: CollectionPhoto | null;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!photo) return () => { active = false; };
    void getCollectionItemPhotoUrl(photo.storagePath)
      .then((value) => { if (active) setUrl(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [photo]);

  if (!photo || failed) return <div className={`collection-photo-placeholder ${className}`} aria-label={`${alt} has no available photo`}>No photo</div>;
  if (!url) return <div className={`collection-photo-placeholder ${className}`} aria-label={`Loading ${alt} photo`}>Loading photo...</div>;
  return <img className={className} src={url} alt={alt} loading="lazy" />;
}
