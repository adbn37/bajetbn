import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
const requireText = (text, expected, label) => {
  if (!text.includes(expected)) throw new Error(`Missing ${label}: ${expected}`);
};
const rejectText = (text, forbidden, label) => {
  if (text.includes(forbidden)) throw new Error(`Old ${label} still present: ${forbidden}`);
};

const collaboration = read('src/features/collaboration/CollaborationPage.tsx');
const join = read('src/features/collaboration/JoinSpacePage.tsx');
const repo = read('src/repositories/collaborationRepository.ts');
const models = read('src/types/models.ts');
const functions = read('functions/src/index.ts');
const settings = read('src/features/sme-pos/SmePosSettingsPage.tsx');
const marketplace = read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx');

requireText(collaboration, 'export function InviteForm', 'shared invite form');
requireText(collaboration, 'What is their role in this business?', 'SME business role prompt');
requireText(collaboration, "manager: 'admin'", 'Manager Space-role mapping');
requireText(collaboration, "cashier: 'viewer'", 'Cashier safe Space-role mapping');
requireText(collaboration, "stock_staff: 'viewer'", 'Stock Staff safe Space-role mapping');
requireText(collaboration, "seller: 'viewer'", 'Seller safe Space-role mapping');
requireText(collaboration, 'posRole: businessInvite ? posRole : null', 'POS role invitation payload');
requireText(collaboration, 'WhatsApp-first Business invite', 'WhatsApp-first SME guidance');
requireText(collaboration, 'WhatsApp-first invitations', 'WhatsApp-first normal Space guidance');
requireText(collaboration, "email: email.trim() || null", 'optional invitation email payload');
requireText(collaboration, 'Email address <span className="optional-label">Optional</span>', 'optional email UI');
requireText(collaboration, 'Send invite on WhatsApp', 'primary WhatsApp invite action');
requireText(collaboration, 'WhatsApp / secure link invite', 'email-less pending invitation label');
requireText(collaboration, 'Advanced financial access', 'collapsed advanced access');
requireText(collaboration, 'smePosRoleLabel[invitation.posRole]', 'pending invite role label');
requireText(collaboration, 'listSmePosAccess', 'SME team role display');
rejectText(collaboration, 'type="email" required value={email}', 'required invitation email');

requireText(repo, 'email?: string | null;', 'optional invitation email repository type');
requireText(models, 'email?: string | null;', 'optional invitation email model');

requireText(functions, 'function optionalNormalizedEmail', 'optional email validator');
requireText(functions, 'const email = optionalNormalizedEmail(request.data?.email);', 'optional email creation');
requireText(functions, "email\n      ? db.collection('spaceInvitations')", 'email-only duplicate lookup');
requireText(functions, 'const invitationEmail = typeof invitation.email ===', 'conditional email lock');
requireText(functions, 'transaction.get(invitationRef)', 'one-time token transaction read');
requireText(functions, 'This invitation is locked to an email address.', 'optional email lock enforcement');

requireText(join, 'Sign in to BajetBN, then use this secure invite link.', 'link-first join guidance');

requireText(settings, "import { InviteForm } from '../collaboration/CollaborationPage';", 'shared invite import');
requireText(settings, '>+ Invite person</button>', 'unified POS team invite entry');
requireText(settings, '<InviteForm space={space} canAssignPosRole defaultPosRole="cashier"', 'shared POS invite usage');
rejectText(settings, 'PosTeamInviteForm', 'separate POS invite form');
rejectText(settings, 'Add POS team member', 'separate POS invite modal');
rejectText(settings, 'Create team invite', 'separate POS invite button');

requireText(marketplace, 'Add seller profile', 'seller profile wording');
requireText(marketplace, 'A seller profile does not automatically give the person BajetBN login access.', 'seller/login distinction');
requireText(marketplace, 'invite them from Members and choose Seller', 'seller access guidance');
rejectText(marketplace, 'First invite the person to the SME Space and assign the Seller POS role in POS Settings.', 'old seller two-step guidance');

console.log('Unified WhatsApp-first SME invitation verifier: PASS');
