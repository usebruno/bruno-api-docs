import styled from '@emotion/styled';

/**
 * Matches bruno-app's response format selector: the trigger reads as plain text and only reveals
 * its border on hover or while open, instead of carrying a permanent border like the shared
 * MenuDropdown trigger. Scoped here so other default triggers (method / environment pickers) keep
 * their standing border.
 */
export const StyledWrapper = styled.div`
  .menu-dropdown-trigger {
    &:hover {
      border-color: var(--oc-colors-text-subtext2);
    }
  }
`;
