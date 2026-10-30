import { test, expect } from '@playwright/test';
test('probe fails', { tag: '@issue-47-ac-1' }, async ({ page }) => { await page.goto('/'); await expect(page.getByRole('heading', { name: 'No such heading' })).toBeVisible({ timeout: 2000 }); });
