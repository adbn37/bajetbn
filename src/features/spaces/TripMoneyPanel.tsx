import type { Space, SpaceMember } from '../../types/models';
import { SpaceFundPanel } from './SpaceFundPanel';

// Trip money wrapper kept so older imports and deployed clients remain compatible.
export function TripMoneyPanel(props: {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
  canManage: boolean;
}) {
  return <SpaceFundPanel {...props} />;
}
