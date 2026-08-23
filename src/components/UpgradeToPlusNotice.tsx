import { useNavigate } from 'react-router-dom';
import { upgradeToPlusCopy } from '../services/entitlements';

export function UpgradeToPlusNotice({
  feature,
  detail,
  compact = false,
}: {
  feature: string;
  detail?: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const copy = upgradeToPlusCopy(feature, detail);

  return (
    <div
      className={`plus-upgrade-notice ${
        compact ? 'compact' : ''
      }`}
    >
      <div>
        <span className="eyebrow">BajetBN Plus</span>
        <strong>{copy.title}</strong>
        <p>{copy.message}</p>
      </div>

      <button
        type="button"
        className="button primary"
        onClick={() => navigate(copy.path)}
      >
        {copy.actionLabel}
      </button>
    </div>
  );
}
