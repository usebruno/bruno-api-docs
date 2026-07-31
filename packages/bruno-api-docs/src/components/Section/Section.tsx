import React, { useId } from 'react';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import { ChevronArrow } from '../ChevronArrow/ChevronArrow';
import { Collapse } from '../../ui/Collapse/Collapse';
import { useSessionStorage } from '../../hooks';
import { cx } from '../../utils/cx';
import { StyledWrapper } from './StyledWrapper';

type HeadingLevel = 'h2' | 'h3' | 'h4';

interface SectionProps {
  label: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  storageKey?: string;
  as?: HeadingLevel;
  hideFromNav?: boolean;
  navLevel?: number;
  navGroup?: string;
}

export const Section: React.FC<SectionProps> = ({
  label,
  badge,
  children,
  testId = 'section',
  className,
  collapsible = false,
  defaultOpen = true,
  storageKey,
  as = 'h2',
  hideFromNav = false,
  navLevel: navLevelProp,
  navGroup
}) => {
  const [open, setOpen] = useSessionStorage(storageKey ? `section-${storageKey}` : '', defaultOpen);
  const panelId = useId();
  const labelId = useId();

  const navLabel = hideFromNav || typeof label !== 'string' ? undefined : label;
  const navLevel = navLevelProp ?? (as === 'h4' ? 3 : as === 'h3' ? 2 : 1);

  if (collapsible) {
    return (
      <StyledWrapper
        className={cx('section--collapsible', className)}
        data-testid={testId}
        data-nav-section={navLabel}
        data-nav-level={navLevel}
        data-nav-group={navGroup}
      >
        <div className="section-head">
          <SectionLabel as={as} className="section-head-label">
            <button
              type="button"
              id={labelId}
              className="section-toggle"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
            >
              <ChevronArrow open={open} className="section-chevron" />
              <span className="section-toggle-text">{label}</span>
            </button>
          </SectionLabel>
          {badge}
        </div>
        <Collapse open={open} id={panelId} role="region" aria-labelledby={labelId}>
          {children}
        </Collapse>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper
      className={className}
      data-testid={testId}
      data-nav-section={navLabel}
      data-nav-level={navLevel}
      data-nav-group={navGroup}
    >
      {badge ? (
        <div className="section-head">
          <SectionLabel as={as} className="section-head-label">{label}</SectionLabel>
          {badge}
        </div>
      ) : (
        <SectionLabel as={as}>{label}</SectionLabel>
      )}
      {children}
    </StyledWrapper>
  );
};

export default Section;
