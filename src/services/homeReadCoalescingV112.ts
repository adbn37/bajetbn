/** Home-only read coalescing. No persisted or post-resolution cache. */
import { listAllCustomCategories } from '../repositories/categoryRepository';
import { listSpaces } from '../repositories/spaceRepository';
import { singleFlightByOwnerV112 } from './singleFlightByOwnerV112';

export const readHomeSpacesV112 = singleFlightByOwnerV112(listSpaces);
export const readHomeCategoriesV112 = singleFlightByOwnerV112(listAllCustomCategories);
