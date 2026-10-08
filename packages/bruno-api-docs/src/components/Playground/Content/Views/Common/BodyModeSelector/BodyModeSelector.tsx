import React from 'react';
import type { HttpRequest } from '@opencollection/types/requests/http';
import {
  IconCaretDown,
  IconForms,
  IconBraces,
  IconCode,
  IconFileText,
  IconDatabase,
  IconFile,
  IconWand,
  IconX
} from '@tabler/icons';
import MenuDropdown from '@/ui/MenuDropdown';
import type { MenuDropdownGroup } from '@/ui/MenuDropdown';
import { prettifyJsonString, prettifyXmlString } from '@/utils/dataFormatter';
import type { RequestBody } from '@/utils/schemaHelpers';
import { BodyActionButton } from './StyledWrapper';

interface BodyModeSelectorProps {
  body: RequestBody;
  onItemChange: (item: HttpRequest) => void;
  item: HttpRequest;
}

const BODY_TYPE_GROUPS = [
  {
    name: 'Form',
    options: [
      { value: 'multipart-form', label: 'Multipart Form', icon: IconForms },
      { value: 'form-urlencoded', label: 'Form URL Encoded', icon: IconForms }
    ]
  },
  {
    name: 'Raw',
    options: [
      { value: 'json', label: 'JSON', icon: IconBraces },
      { value: 'xml', label: 'XML', icon: IconCode },
      { value: 'text', label: 'TEXT', icon: IconFileText },
      { value: 'sparql', label: 'SPARQL', icon: IconDatabase }
    ]
  },
  {
    name: 'Other',
    options: [
      { value: 'file', label: 'File / Binary', icon: IconFile },
      { value: 'none', label: 'No Body', icon: IconX }
    ]
  }
];

const ALL_BODY_TYPE_OPTIONS = BODY_TYPE_GROUPS.flatMap((group) => group.options);

/** Resolves the current body-type id and its display label from the body shape. */
export const resolveBodyMode = (body: RequestBody): { type: string; label: string } => {
  const type = !body ? 'none' : 'type' in body ? body.type : Array.isArray(body) ? 'form-urlencoded' : 'none';
  const label = ALL_BODY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'No Body';
  return { type, label };
};

export const BodyModeSelector: React.FC<BodyModeSelectorProps> = ({ body, onItemChange, item }) => {
  const { type: currentBodyType, label: currentBodyLabel } = resolveBodyMode(body);
  const CurrentBodyIcon = ALL_BODY_TYPE_OPTIONS.find((option) => option.value === currentBodyType)?.icon;

  const handleBodyTypeChange = (bodyType: string) => {
    // getHttpBody falls back to a legacy root-level body, so clearing only
    // http.body lets the old body resurface — drop the root shadow too.
    const applyBody = (body: unknown) => {
      const next = { ...item, http: { ...item.http, body } } as any;
      delete next.body;
      onItemChange(next as HttpRequest);
    };
    if (bodyType === 'none') applyBody(undefined);
    else if (['json', 'text', 'xml', 'sparql'].includes(bodyType)) applyBody({ type: bodyType, data: '' });
    else if (bodyType === 'form-urlencoded') applyBody([]);
    else if (bodyType === 'multipart-form' || bodyType === 'file') applyBody({ type: bodyType, data: [] });
  };

  const prettifiableData
    = (currentBodyType === 'json' || currentBodyType === 'xml')
      && body
      && 'data' in body
      && typeof body.data === 'string'
      ? body.data
      : null;

  const handlePrettify = () => {
    if (prettifiableData === null) return;
    const formatted
      = currentBodyType === 'json' ? prettifyJsonString(prettifiableData) : prettifyXmlString(prettifiableData);
    if (formatted === prettifiableData) return;
    onItemChange({
      ...item,
      http: { ...item.http, body: { ...body, data: formatted } as typeof body }
    } as HttpRequest);
  };

  const bodyMenuItems: MenuDropdownGroup[] = BODY_TYPE_GROUPS.map((group) => ({
    name: group.name,
    options: group.options.map((option) => ({
      id: option.value,
      label: option.label,
      leftSection: option.icon,
      onClick: () => handleBodyTypeChange(option.value)
    }))
  }));

  return (
    <>
      <MenuDropdown
        selectedItemId={currentBodyType}
        placement="bottom-end"
        role="listbox"
        testId="body-type-select"
        items={bodyMenuItems}
        groupStyle="select"
        showGroupDividers={false}
        sticky="reference"
      >
        <BodyActionButton type="button" aria-label="Body Type">
          {CurrentBodyIcon && <CurrentBodyIcon size={14} strokeWidth={2} aria-hidden />}
          {currentBodyLabel}
          <IconCaretDown className="body-mode-caret" size={14} strokeWidth={2} aria-hidden />
        </BodyActionButton>
      </MenuDropdown>
      {prettifiableData !== null && (
        <BodyActionButton type="button" onClick={handlePrettify} data-testid="body-prettify">
          <IconWand size={14} strokeWidth={2} aria-hidden />
          Prettify
        </BodyActionButton>
      )}
    </>
  );
};

export default BodyModeSelector;
