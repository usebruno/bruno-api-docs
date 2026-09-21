// The one thing the vendored converter takes from bruno-converters' shared module. Ids only
// tag the Bruno-side tree on the way through, so the browser's own generator does.
export const uuid = () => crypto.randomUUID();
