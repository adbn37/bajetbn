import {
  useEffect,
  useState,
} from 'react';
import {
  useSearchParams,
} from 'react-router-dom';
import {
  getBusinessProfile,
} from '../../repositories/businessAdvancedRepository';
import {
  getSmePosSettings,
} from '../../repositories/smePosRepository';
import type {
  MarketplaceInventoryProfile,
  SmePosRole,
  SmePosSettings,
  Space,
} from '../../types/models';
import {
  MarketplaceConsignmentPosWorkspace,
  type MarketplaceManagementTab,
} from '../sme-pos/MarketplaceConsignmentPosWorkspace';
import {
  getErrorMessage,
} from '../../utils/errors';

interface Props {
  space: Space;
  role: SmePosRole | null;
  section: string;
  onChanged: () => Promise<void> | void;
}

const sectionTabs:
Record<string, MarketplaceManagementTab> = {
  'marketplace-listings': 'listings',
  'marketplace-sellers': 'sellers',
  'marketplace-payouts': 'payouts',
  'marketplace-customers': 'customers',
  'marketplace-reports': 'reports',
};

export function MarketplaceSpaceManagementSection({
  space,
  role,
  section,
  onChanged,
}: Props) {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [settings, setSettings] =
    useState<SmePosSettings | null>(null);

  const [
    inventoryProfile,
    setInventoryProfile,
  ] =
    useState<MarketplaceInventoryProfile>(
      'general',
    );

  const [isMarketplace, setIsMarketplace] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const tab =
    sectionTabs[section] || null;

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    void Promise.all([
      getSmePosSettings(
        space.id,
      ),
      getBusinessProfile(
        space.id,
      ),
    ])
      .then(
        ([
          nextSettings,
          nextProfile,
        ]) => {
          if (!active) {
            return;
          }

          setSettings(
            nextSettings,
          );

          setIsMarketplace(
            nextProfile?.industry
            === 'marketplace',
          );

          setInventoryProfile(
            nextProfile
              ?.marketplaceInventoryProfile
            || 'general',
          );
        },
      )
      .catch(
        (nextError) => {
          if (active) {
            setError(
              getErrorMessage(
                nextError,
              ),
            );
          }
        },
      )
      .finally(
        () => {
          if (active) {
            setLoading(false);
          }
        },
      );

    return () => {
      active = false;
    };
  }, [space.id]);

  if (!tab) {
    return null;
  }

  if (!role) {
    return (
      <section
        className="panel"
        data-marketplace-space-management
      >
        <div className="notice warning">
          You do not have Marketplace management access.
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div
        className="loading-panel"
        data-marketplace-space-management
      >
        Loading Marketplace management...
      </div>
    );
  }

  if (error) {
    return (
      <section
        className="panel"
        data-marketplace-space-management
      >
        <div className="notice error">
          {error}
        </div>
      </section>
    );
  }

  if (
    !isMarketplace
    || !settings
    || settings.mode
      !== 'marketplace_consignment'
  ) {
    return (
      <section
        className="panel"
        data-marketplace-space-management
      >
        <div className="notice warning">
          Marketplace management is not active for this Business Space.
        </div>
      </section>
    );
  }

  function changeManagementTab(
    nextTab: MarketplaceManagementTab,
  ) {
    const next =
      new URLSearchParams(
        searchParams,
      );

    next.set(
      'section',
      `marketplace-${nextTab}`,
    );

    next.delete(
      'tab',
    );

    setSearchParams(
      next,
    );
  }

  return (
    <section
      className="marketplace-space-management-section"
      data-marketplace-space-management
      data-marketplace-section={tab}
    >
      <MarketplaceConsignmentPosWorkspace
        space={space}
        settings={settings}
        inventoryProfile={
          inventoryProfile
        }
        role={role}
        embeddedManagementTab={
          tab
        }
        onManagementTabChange={
          changeManagementTab
        }
        onChanged={onChanged}
      />
    </section>
  );
}
