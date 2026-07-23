import React, { useEffect, useState } from 'react';

interface EvidenceImageProps {
  logId: string;
  evidenceId?: string;
  alt: string;
  className?: string;
}

/** Fetches protected image evidence with the user's JWT instead of exposing a public media URL. */
const EvidenceImage: React.FC<EvidenceImageProps> = ({ logId, evidenceId, alt, className = '' }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    import('../services/api').then(({ logService }) => logService.getEvidence(Number(logId), evidenceId))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setImageUrl(objectUrl);
      })
      .catch(() => active && setImageUrl(null));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logId, evidenceId]);

  if (!imageUrl) return <div className={`animate-pulse bg-slate-100 ${className}`} aria-label="Loading evidence image" />;
  return <img src={imageUrl} className={className} alt={alt} />;
};

export default EvidenceImage;
