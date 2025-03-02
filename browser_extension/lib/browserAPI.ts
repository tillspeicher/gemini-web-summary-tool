// Define the browser API type
// type BrowserAPI = typeof chrome | typeof browser;
type BrowserAPI = any;

// Use the appropriate browser API
export const browserAPI: BrowserAPI =
  // @ts-ignore
  typeof browser !== "undefined" ? browser : chrome;
