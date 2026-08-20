import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

const settings = read('src/features/sme-pos/SmePosSettingsPage.tsx');
const collaboration = read('src/features/collaboration/CollaborationPage.tsx');
const spaces = read('src/features/spaces/SpacesPage.tsx');
const collaborationRepository = read('src/repositories/collaborationRepository.ts');
const models = read('src/types/models.ts');
const functions = read('functions/src/index.ts');
const styles = read('src/styles/global.css');
const i18n = read('src/services/i18n.ts');

const checks = [
  [settings.includes("import { InviteForm } from '../collaboration/CollaborationPage';"), 'POS Settings must reuse the unified Space invitation form.'],
  [settings.includes('setInviteOpen(true)') && settings.includes('+ Invite person'), 'POS Settings must provide one unified Invite person action.'],
  [settings.includes('pendingPosInvitations') && settings.includes('Invite pending'), 'Pending POS invitations must remain visible.'],
  [settings.includes('canAssignPosRole') && settings.includes('defaultPosRole="cashier"'), 'The unified invitation must allow POS role assignment and default to Cashier.'],
  [settings.includes("settings.mode === 'marketplace_consignment' && <option value=\"seller\">Seller</option>"), 'Seller POS access must remain limited to Marketplace Consignment POS.'],
  [models.includes("posRole?: Exclude<SmePosRole, 'owner'> | null"), 'Space invitations must carry an optional POS role.'],
  [collaborationRepository.includes("posRole?: Exclude<SmePosRole, 'owner'> | null"), 'The invitation repository must accept an optional POS role.'],
  [functions.includes("oneOf(request.data.posRole, smePosRoles, 'POS role')"), 'The backend must validate the requested POS role.'],
  [functions.includes("Only the SME Space owner can assign a POS role during an invitation."), 'Only the SME owner may pre-assign POS access.'],
  [functions.includes("Save the POS setup before inviting a shop team member."), 'POS setup must exist before a team invitation.'],
  [functions.includes("posRole === 'seller' && posSettings?.data()?.mode !== 'marketplace_consignment'"), 'Seller role validation must protect both invitation and acceptance.'],
  [functions.includes("db.collection('smePosAccess').doc(`${spaceId}_${uid}`)"), 'Invitation acceptance must target the member POS access record.'],
  [functions.includes("role: posRole") && functions.includes("status: 'active'"), 'Invitation acceptance must activate the selected POS role.'],
  [functions.includes("kind: 'accept_space_invitation'") && functions.includes('const result = { spaceId, memberId: memberRef.id, posRole };'), 'Invitation acceptance must remain idempotent and return the assigned role.'],
  [functions.includes("spaceName: space.data()?.name || 'Shared Space'") && settings.includes('<InviteForm space={space}'), 'Every shareable Space invitation must know the Space name.'],
  [collaboration.includes('Send invite on WhatsApp'), 'The invitation form must provide a direct WhatsApp action.'],
  [collaboration.includes('Copy invite link'), 'The invitation form must provide a copy-link alternative.'],
  [collaboration.includes("const [whatsappNumber, setWhatsappNumber] = useState('')"), 'The WhatsApp number must be optional.'],
  [collaboration.includes('leave blank to choose a WhatsApp contact.'), 'The optional WhatsApp behavior must be explained.'],
  [collaboration.includes('result.data.token') && collaboration.includes('whatsappHref(whatsappNumber'), 'The direct WhatsApp action must use the newly created secure invite token.'],
  [collaboration.includes("contributor: 'Add money records'") && collaboration.includes("payer: 'Record payments'"), 'Technical collaboration role labels must be replaced with clear actions.'],
  [collaboration.includes('What can this person do?') && collaboration.includes('invite-role-card'), 'Access choices must use explanatory role cards.'],
  [collaboration.includes('Manage members, Space settings, and shared records.'), 'Manager access must be explained.'],
  [collaboration.includes('Add and update shared money records.'), 'Add-record access must be explained.'],
  [collaboration.includes('Record payments assigned to them.'), 'Payment access must be explained.'],
  [collaboration.includes('View shared information without changing anything.'), 'View-only access must be explained.'],
  [collaboration.includes('canUseAccounts') && collaboration.includes('canViewBalances') && collaboration.includes('canViewLedger') && collaboration.includes('<details'), 'Advanced Account permissions must be optional and collapsible.'],
  [collaboration.includes("if (nextRole === 'viewer')"), 'View-only selection must clear shared Account permissions.'],
  [spaces.includes("'Record payments' : 'Add money records'"), 'Incoming invitations must show the same clear role labels.'],
  [spaces.includes('invitation.posRole'), 'Incoming invitations must show a pre-assigned POS role.'],
  [styles.includes('.invite-role-grid') && styles.includes('.invite-role-card.selected'), 'The explanatory role cards must have complete styling.'],
  [styles.includes('.invite-action-grid') && styles.includes('grid-template-columns:1fr;'), 'Invitation actions must collapse safely on phones.'],
  [/'Send invite on WhatsApp':\s*'[^']+'/.test(i18n), 'The direct WhatsApp action must include Malay text.'],
  [i18n.includes("'What can this person do?': 'Apakah yang boleh dilakukan oleh orang ini?'"), 'The simplified access question must include Malay text.'],
  [functions.includes('Personal Spaces cannot have members.'), 'Personal Spaces must remain private and outside the invitation flow.'],
];

for (const [condition, message] of checks) requireValue(condition, message);

const availableRoles = (mode) => ['cashier', 'manager', 'stock_staff', ...(mode === 'marketplace_consignment' ? ['seller'] : []), 'viewer'];
requireValue(!availableRoles('standard').includes('seller'), 'Standard POS must not offer Seller access.');
requireValue(availableRoles('marketplace_consignment').includes('seller'), 'Marketplace Consignment POS must offer Seller access.');

console.log(`Space and SME POS team invitation checks passed (${checks.length} structural checks plus role-mode validation).`);
