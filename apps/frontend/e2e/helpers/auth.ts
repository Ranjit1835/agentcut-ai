import { Page } from '@playwright/test';

/**
 * Mocks Supabase authentication by injecting auth cookies and localStorage state
 * directly into the browser context. This avoids hitting Supabase during E2E tests.
 */

const MOCK_USER = {
  id: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
  email: 'e2e-test@agentcut.ai',
  user_metadata: {
    full_name: 'E2E Test User',
    avatar_url: 'https://ui-avatars.com/api/?name=E2E+Test',
  },
  app_metadata: {
    provider: 'email',
  },
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

const MOCK_SESSION = {
  access_token: 'e2e-mock-access-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  refresh_token: 'e2e-mock-refresh-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: MOCK_USER,
};

const SUPABASE_AUTH_STORAGE_KEY = 'sb-localhost-auth-token';

export async function mockAuthState(page: Page): Promise<void> {
  // Set the Supabase auth cookie before navigating
  await page.context().addCookies([
    {
      name: SUPABASE_AUTH_STORAGE_KEY,
      value: encodeURIComponent(JSON.stringify(MOCK_SESSION)),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'sb-access-token',
      value: MOCK_SESSION.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'sb-refresh-token',
      value: MOCK_SESSION.refresh_token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Also set localStorage for client-side Supabase auth detection
  await page.addInitScript((session) => {
    const storageKey = 'sb-localhost-auth-token';
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }, MOCK_SESSION);
}

export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
}

export { MOCK_USER, MOCK_SESSION };
