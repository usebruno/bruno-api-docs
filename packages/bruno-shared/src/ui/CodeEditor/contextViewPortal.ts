const CONTEXT_VIEW_CLASS = 'context-view';

// Moves Monaco's tooltip layer out of the editor container into `host`, a fixed layer aligned with
// the container, so its container-relative position stays right while no ancestor can clip it.
export const adoptContextView = (container: HTMLElement, host: HTMLElement): (() => void) => {
  const alignHost = () => {
    const rect = container.getBoundingClientRect();
    host.style.top = `${rect.top}px`;
    host.style.left = `${rect.left}px`;
  };

  const viewObserver = new MutationObserver(alignHost);

  const adopt = (node: Node) => {
    if (!(node instanceof HTMLElement) || !node.classList.contains(CONTEXT_VIEW_CLASS)) return;
    alignHost();
    host.appendChild(node);
    viewObserver.observe(node, { attributes: true, attributeFilter: ['style'] });
  };

  const containerObserver = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach(adopt));
  });
  containerObserver.observe(container, { childList: true });
  Array.from(container.children).forEach(adopt);

  return () => {
    containerObserver.disconnect();
    viewObserver.disconnect();
  };
};
