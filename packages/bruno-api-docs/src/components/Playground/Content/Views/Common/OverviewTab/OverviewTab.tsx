import { useMemo } from 'react';
import { BookIcon } from '@/assets/icons';
import { useMarkdownRenderer } from '@/hooks';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import NoContentText from '@/ui/NoContentText/NoContentText';
import { StyledWrapper } from './StyledWrapper';

interface OverviewTabProps {
  docs?: string;
  emptyStateSubheading: string;
  displayEmptyStateBox?: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  docs,
  emptyStateSubheading,
  displayEmptyStateBox = true
}) => {
  const md = useMarkdownRenderer();
  const docsHtml = useMemo(() => {
    return docs ? md.render(docs) : undefined;
  }, [md, docs]);

  if (!docsHtml) {
    return displayEmptyStateBox ? (
      <EmptyState
        testId="overview-empty"
        icon={<BookIcon />}
        heading="No overview content yet"
        subheading={emptyStateSubheading}
      />
    ) : (
      <NoContentText text="No overview content yet" />
    );
  }

  return (
    <StyledWrapper
      className="markdown-documentation"
      data-testid="overview-markdown-documentation"
      dangerouslySetInnerHTML={{ __html: docsHtml }}
    />
  );
};

export default OverviewTab;
