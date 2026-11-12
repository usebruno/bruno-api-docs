export const PLAYGROUND_CLOSED = 'playground-closed';

const sending = new Set<string>();
const active = new Map<string, AbortController>();
const latest = new Map<string, AbortController>();

export const playgroundRuns = {
  isSending: (uuid: string) => sending.has(uuid),

  beginSend: (uuid: string) => {
    sending.add(uuid);
  },

  start: (uuid: string, controller: AbortController) => {
    active.set(uuid, controller);
    latest.set(uuid, controller);
  },

  isLatest: (uuid: string, controller: AbortController) => latest.get(uuid) === controller,

  finish: (uuid: string, controller: AbortController | null) => {
    if (!controller) {
      sending.delete(uuid);
      return false;
    }
    if (latest.get(uuid) === controller) latest.delete(uuid);
    if (active.get(uuid) !== controller) return false;
    active.delete(uuid);
    sending.delete(uuid);
    return true;
  },

  cancel: (uuid: string) => {
    const controller = active.get(uuid);
    if (!controller) return false;
    controller.abort();
    active.delete(uuid);
    sending.delete(uuid);
    return true;
  },

  abortAll: (reason: string) => {
    active.forEach((controller) => controller.abort(reason));
    active.clear();
    sending.clear();
    latest.clear();
  }
};
