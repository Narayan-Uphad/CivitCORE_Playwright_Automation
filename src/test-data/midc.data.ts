/**
 * MIDC test data.
 *
 * Keeps the same shape as the original `test-data/midc.data.ts` that the
 * Playwright specs imported (`midcTestData.homeUrl`,
 * `midcTestData.credentials.username`, `midcTestData.credentials.password`),
 * but credentials are now read from environment variables instead of being
 * stored in source control.
 */
import { config, getCredentials } from '../support/config';

export const midcTestData = {
  homeUrl: config.homeUrl,
  credentials: {
    get username(): string {
      return getCredentials().username;
    },
    get password(): string {
      return getCredentials().password;
    },
  },
  organizationName: 'MIDC',
  defaultProdCode: 'CIRCLE',
} as const;
