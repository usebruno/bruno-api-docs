const cleanJson = (data: any) => {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
};

const cleanCircularJson = (data: any) => {
  try {
    // Handle circular references by keeping track of seen objects
    const seen = new WeakSet();
    
    const replacer = (_key: string, value: any) => {
      // Skip non-objects and null
      if (typeof value !== 'object' || value === null) {
        return value;
      }
      
      // Detect circular reference
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      
      seen.add(value);
      return value;
    };

    return JSON.parse(JSON.stringify(data, replacer));
  } catch {
    return data;
  }
};

export { cleanCircularJson, cleanJson };