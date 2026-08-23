import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const models = read('src/types/models.ts');
const repo = read('src/repositories/spaceAvatarRepository.ts');
const avatar = read('src/features/spaces/SpaceAvatar.tsx');
const settings = read('src/features/spaces/SpaceAvatarSettings.tsx');
const spaces = read('src/features/spaces/SpacesPage.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const header = read('src/components/PageHeader.tsx');
const storage = read('storage.rules');
const functions = read('functions/src/index.ts');
const css = read('src/styles/global.css');

const checks = [
  [models, 'avatarPath?: string | null;', 'Space avatar model'],

  [repo, 'prepareSpaceAvatar', 'image preparation'],
  [repo, 'AVATAR_SIZE = 512', '512px output'],
  [repo, "canvas.toBlob(resolve, 'image/jpeg', 0.82)", 'JPEG compression'],
  [repo, 'uploadSpaceAvatar', 'avatar upload'],
  [repo, 'removeSpaceAvatar', 'avatar remove'],

  [avatar, 'space.avatarPath', 'avatar renderer'],
  [avatar, 'fallback', 'letter fallback'],

  [settings, 'Replace icon', 'replace control'],
    [settings, 'onClick={() => void remove()}', 'remove handler'],
  [settings, 'Remove', 'remove control'],
  [settings, 'capture="environment"', 'mobile camera'],

  [spaces, '<SpaceAvatar space={space} size="large" />', 'Space cards'],

  [details, 'leading={<SpaceAvatar space={space} size="large" />}', 'Space header'],
  [details, '<SpaceAvatarSettings', 'Space settings'],

  [header, 'leading?: ReactNode;', 'PageHeader leading support'],

  [storage, 'match /spaces/{spaceId}/avatar/{fileName}', 'avatar Storage rule'],
  [storage, 'isSpaceOwner(spaceId)', 'owner-only Storage'],

  [functions, 'export const setSpaceAvatar = onCall', 'set callable'],
  [functions, 'export const removeSpaceAvatar = onCall', 'remove callable'],
  [functions, 'space.ownerId !== uid', 'server owner guard'],
  [functions, "metadata.contentType !== 'image/jpeg'", 'server JPEG guard'],

  [css, '/* v1.9.0 Slice 6 - Space icon / avatar */', 'avatar CSS'],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);

  if (!ok) failed += 1;
}

if (
  spaces.includes(
    'space.name.charAt(0).toUpperCase()</span>',
  )
) {
  console.error(
    'FAIL old inline Space card letter avatar remains.',
  );

  failed += 1;
}

if (failed) {
  console.error(
    `Space avatar verifier failed: ${failed}`,
  );

  process.exit(1);
}

console.log('Space avatar Slice 6 verifier: PASS');
