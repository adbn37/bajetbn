import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  CONTEXTUAL_HELP_REPLAY_EVENT,
  contextualHelpTipForPath,
  hasSeenContextualHelp,
  markContextualHelpSeen,
} from '../services/contextualHelp';

export function ContextualHelp() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [visible, setVisible] = useState(false);
  const [replayVersion, setReplayVersion] = useState(0);

  const tip = useMemo(
    () => contextualHelpTipForPath(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    const replay = () => {
      setReplayVersion((value) => value + 1);
    };

    window.addEventListener(
      CONTEXTUAL_HELP_REPLAY_EVENT,
      replay,
    );

    return () => {
      window.removeEventListener(
        CONTEXTUAL_HELP_REPLAY_EVENT,
        replay,
      );
    };
  }, []);

  useEffect(() => {
    setVisible(false);

    if (!user || !tip) {
      return;
    }

    const replaying = replayVersion > 0;

    if (
      !replaying
      && hasSeenContextualHelp(user.uid, tip.id)
    ) {
      return;
    }

    const timer = window.setTimeout(
      () => setVisible(true),
      350,
    );

    return () => window.clearTimeout(timer);
  }, [
    user,
    tip,
    location.pathname,
    replayVersion,
  ]);

  if (!visible || !user || !tip) {
    return null;
  }

  const dismiss = () => {
    markContextualHelpSeen(user.uid, tip.id);
    setVisible(false);
  };

  const openAction = () => {
    const target = tip.actionPath;

    markContextualHelpSeen(user.uid, tip.id);
    setVisible(false);

    if (target) {
      navigate(target);
    }
  };

  return (
    <div
      className="contextual-help-layer"
      role="presentation"
    >
      <section
        className="contextual-help-card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="contextual-help-title"
      >
        <div className="contextual-help-top">
          <span className="contextual-help-icon" aria-hidden="true">
            ?
          </span>

          <button
            type="button"
            className="contextual-help-close"
            onClick={dismiss}
            aria-label="Close tip"
          >
            ×
          </button>
        </div>

        <span className="contextual-help-eyebrow">
          {tip.eyebrow}
        </span>

        <h2 id="contextual-help-title">
          {tip.title}
        </h2>

        <p>{tip.body}</p>

        <div className="contextual-help-actions">
          <button
            type="button"
            className="button primary"
            onClick={tip.actionPath ? openAction : dismiss}
          >
            {tip.actionLabel || 'Got it'}
          </button>

          {tip.actionPath && (
            <button
              type="button"
              className="button secondary"
              onClick={dismiss}
            >
              Not now
            </button>
          )}
        </div>

        <small>
          This tip normally appears only once.
          Replay tips anytime from More.
        </small>
      </section>
    </div>
  );
}
