/** Unique-enough id for records created on this device (orders, harvests). */
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;
