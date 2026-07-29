import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { getByTestId } from '../../test-utils/dom';
import { InheritedSourceLink } from './InheritedSourceLink';
import type { InheritedSource } from '../../utils/request';

const folderSource: InheritedSource = { level: 'folder', name: 'Folder A', uuid: 'folder-uid' };
const collectionSource: InheritedSource = { level: 'collection', name: 'My Collection', uuid: '__collection_root__' };

describe('InheritedSourceLink', () => {
  it('renders a clickable button with a goto icon and a level-qualified tooltip when navigable', () => {
    const root = useRenderToDom(<InheritedSourceLink source={folderSource} onNavigate={() => {}} />);
    const trigger = getByTestId(root, 'inherited-source');
    expect(trigger.rawTagName).toBe('button');
    expect(trigger.getAttribute('aria-label')).toBe('Inherited from folder: Folder A');
    expect(trigger.querySelector('svg')).not.toBeNull(); // the GoToIcon
  });

  it('qualifies the tooltip with "collection" for a collection source', () => {
    const root = useRenderToDom(<InheritedSourceLink source={collectionSource} onNavigate={() => {}} />);
    expect(getByTestId(root, 'inherited-source').getAttribute('aria-label')).toBe('Inherited from collection: My Collection');
  });

  it('degrades to a non-clickable span when there is no navigate handler', () => {
    const root = useRenderToDom(<InheritedSourceLink source={folderSource} />);
    const trigger = getByTestId(root, 'inherited-source');
    expect(trigger.rawTagName).toBe('span');
    expect(trigger.classNames).toContain('inherited-source--static');
  });

  it('degrades to a non-clickable span when the source has no uuid', () => {
    const root = useRenderToDom(<InheritedSourceLink source={{ ...folderSource, uuid: '' }} onNavigate={() => {}} />);
    expect(getByTestId(root, 'inherited-source').rawTagName).toBe('span');
  });

  it('honours a custom testId', () => {
    const root = useRenderToDom(<InheritedSourceLink source={folderSource} onNavigate={() => {}} testId="my-goto" />);
    expect(getByTestId(root, 'my-goto').getAttribute('aria-label')).toBe('Inherited from folder: Folder A');
  });

  it('qualifies the accessible name with the row it belongs to when given an itemName', () => {
    const root = useRenderToDom(
      <InheritedSourceLink source={folderSource} itemName="X-Api-Version" onNavigate={() => {}} />
    );
    expect(getByTestId(root, 'inherited-source').getAttribute('aria-label')).toBe(
      'X-Api-Version: Inherited from folder: Folder A'
    );
  });
});
