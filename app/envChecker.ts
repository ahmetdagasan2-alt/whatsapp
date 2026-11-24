// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Define the type for required environment variables
export type RequiredEnvVars = {
  [key: string]: string | undefined;
};

export type MissingEnvVarInfo = {
  name: string;
  description: string;
};

export const ENV_VAR_DESCRIPTIONS: { [key: string]: string } = {
  // Facebook/Meta Configuration
  FB_APP_ID: 'Facebook App ID for the application',
  FB_APP_SECRET: 'Facebook App Secret (private)',
  FB_GRAPH_API_VERSION: 'Facebook Graph API version to use',
  FB_REG_PIN: 'Facebook Registration PIN (private)',
  FB_VERIFY_TOKEN: 'Facebook Webhook Verify Token (private)',

  // Authentication
  SESSION_SECRET: 'Random string (32+ characters) used to sign login sessions',

  // Database Configuration
  // Auto configured if you use Vercel to connect your DB
  POSTGRES_URL: 'PostgreSQL connection URL',

  // Ably Configuration
  ABLY_KEY: 'Ably API key for real-time messaging',

  // Contact Information
  TP_CONTACT_EMAIL: 'Contact email for the application',
};

// Older deployments configured AUTH0_SECRET; it is still accepted as the session secret.
const ENV_VAR_FALLBACKS: { [key: string]: string } = {
  SESSION_SECRET: 'AUTH0_SECRET',
};

export function getMissingEnvVars(): MissingEnvVarInfo[] {
  return Object.entries(ENV_VAR_DESCRIPTIONS)
    .filter(([key]) => !process.env[key]?.trim() && !process.env[ENV_VAR_FALLBACKS[key] ?? '']?.trim())
    .map(([key]) => ({
      name: key,
      description: ENV_VAR_DESCRIPTIONS[key] || 'No description available',
    }));
}
