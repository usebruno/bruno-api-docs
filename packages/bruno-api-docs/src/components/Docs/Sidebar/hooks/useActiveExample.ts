import { getItemUuid } from '@usebruno/api-shared/utils/itemUtils';
import { useDocsNavigate } from '@/hooks/useDocsNavigate';
import { useActiveResolution } from '@/routing/hooks';
import { exampleSlugForIndex } from '@usebruno/api-shared/routing/slug';
import type { NavModel } from '@usebruno/api-shared/routing';
import type { HttpRequest } from '@opencollection/types/requests/http';

export function useActiveExample(model: NavModel, onNavigate?: () => void) {
  // The active example is read from the route (<request-slug>/<example-slug>),
  // so it is shareable/deep-linked, survives reload, and back/forward restore it.
  const resolution = useActiveResolution();
  const docsNavigate = useDocsNavigate();
  const activeRequestUuid = resolution?.example ? getItemUuid(resolution.entry.item) : undefined;
  const activeExample
    = resolution?.example && activeRequestUuid !== undefined
      ? { requestUuid: activeRequestUuid, index: resolution.example.index }
      : null;

  const goToExample = (requestUuid: string, index: number) => {
    const slug = model.slugByUuid.get(requestUuid);
    if (slug == null) return;
    const item = model.bySlug.get(slug)?.item as HttpRequest | null;
    const exampleSlug = exampleSlugForIndex(item, index);
    if (!exampleSlug) return;
    docsNavigate(`${slug}/${exampleSlug}`);
    onNavigate?.();
  };

  return {
    goToExample,
    activeExample
  };
}
