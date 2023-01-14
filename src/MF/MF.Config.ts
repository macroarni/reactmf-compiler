import { I } from './index';

export default (currentPath: string): I.IMFConfig => {
  let siteConfig: I.IMFConfig;

  try {
    siteConfig = require(currentPath);
  } catch (e) {
    throw e;
  }

  return siteConfig;
};
