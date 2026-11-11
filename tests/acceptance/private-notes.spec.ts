import { test, expect, type Page } from '@playwright/test';

const PASSWORD = 'Str0ng!Passw0rd#';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

const uniqueEmail = () => `user-${crypto.randomUUID()}@example.com`;

const emailField = (page: Page) => page.getByRole('textbox', { name: 'Email', exact: true });
const passwordField = (page: Page) => page.getByLabel('Password', { exact: true });
const signUpButton = (page: Page) => page.getByRole('button', { name: 'Sign up', exact: true });
const signInButton = (page: Page) => page.getByRole('button', { name: 'Sign in', exact: true });
const signOutButton = (page: Page) => page.getByRole('button', { name: 'Sign out', exact: true });
const noteField = (page: Page) => page.getByRole('textbox', { name: 'Note', exact: true });
const addNoteButton = (page: Page) => page.getByRole('button', { name: 'Add note', exact: true });
const notesList = (page: Page) => page.getByRole('list', { name: 'Notes', exact: true });
const noteItems = (page: Page) => notesList(page).getByRole('listitem');
const signedInText = (page: Page, email: string) => page.getByText(`Signed in as ${email}`);

async function fillCredentials(page: Page, email: string, password = PASSWORD) {
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
}

async function signUp(page: Page, email: string) {
  await fillCredentials(page, email);
  await signUpButton(page).click();
  await expect(signedInText(page, email)).toBeVisible();
}

async function signIn(page: Page, email: string, password = PASSWORD) {
  await fillCredentials(page, email, password);
  await signInButton(page).click();
}

async function createUserViaApi(email: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  expect(res.ok).toBe(true);
}

async function accessTokenFor(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  expect(res.ok).toBe(true);
  return (await res.json()).access_token;
}

async function addNote(page: Page, text: string) {
  await noteField(page).fill(text);
  await addNoteButton(page).click();
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A regular expression is matched against the raw text; a string would be trimmed and have its
// white space collapsed first, which would hide missing trimming.
async function expectNotes(page: Page, texts: string[]) {
  await expect(noteItems(page)).toHaveCount(texts.length);
  for (let i = 0; i < texts.length; i++) {
    await expect(noteItems(page).nth(i)).toHaveText(new RegExp(`^${escapeRegExp(texts[i])}$`));
  }
}

async function expectSignedOutView(page: Page) {
  await expect(emailField(page)).toBeVisible();
  await expect(passwordField(page)).toBeVisible();
  await expect(signUpButton(page)).toBeVisible();
  await expect(signInButton(page)).toBeVisible();
  expect(await notesList(page).count()).toBe(0);
  expect(await noteField(page).count()).toBe(0);
  expect(await addNoteButton(page).count()).toBe(0);
}

// A fresh user with notes, created through the API and signed in through the app.
async function signedInUserWithNotes(page: Page, texts: string[]) {
  const email = uniqueEmail();
  await createUserViaApi(email);
  await page.goto('/');
  await signIn(page, email);
  await expect(signedInText(page, email)).toBeVisible();
  for (const t of texts) {
    await addNote(page, t);
    await expect(noteItems(page).filter({ hasText: t })).not.toHaveCount(0);
  }
  return email;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('without a sign-in the page shows the sign-in form, no notes and the three swimlanes', { tag: '@issue-106-ac-1' }, async ({ page }) => {
  await expect(emailField(page)).toBeVisible();
  await expect(passwordField(page)).toBeVisible();
  await expect(signUpButton(page)).toBeVisible();
  await expect(signInButton(page)).toBeVisible();
  expect(await notesList(page).count()).toBe(0);
  expect(await noteField(page).count()).toBe(0);
  expect(await addNoteButton(page).count()).toBe(0);
  for (const s of ['Todo', 'Doing', 'Done']) await expect(page.getByRole('region', { name: s })).toBeVisible();
});

test('signing up with a new email signs the person in with an empty notes list', { tag: '@issue-106-ac-2' }, async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await expect(signOutButton(page)).toBeVisible();
  await expect(noteField(page)).toBeVisible();
  await expect(addNoteButton(page)).toBeVisible();
  await expect(notesList(page)).toBeVisible();
  await expect(noteItems(page)).toHaveCount(0);
  expect(await signUpButton(page).count()).toBe(0);
  expect(await passwordField(page).count()).toBe(0);
});

test('signing up with an email that already has an account shows an error and does not sign in', { tag: '@issue-106-ac-3' }, async ({ page }) => {
  const email = await signedInUserWithNotes(page, ['Existing note']);
  await signOutButton(page).click();
  await expect(signInButton(page)).toBeVisible();
  await fillCredentials(page, email);
  await signUpButton(page).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).not.toBeEmpty();
  await expectSignedOutView(page);
  expect(await signedInText(page, email).count()).toBe(0);
});

test('signing in with an existing account shows its notes', { tag: '@issue-106-ac-4', }, async ({ page }) => {
  const email = await signedInUserWithNotes(page, ['First', 'Second']);
  await signOutButton(page).click();
  await expect(signInButton(page)).toBeVisible();
  await signIn(page, email);
  await expect(signedInText(page, email)).toBeVisible();
  await expect(signOutButton(page)).toBeVisible();
  await expect(noteField(page)).toBeVisible();
  await expect(addNoteButton(page)).toBeVisible();
  await expectNotes(page, ['First', 'Second']);
  expect(await signUpButton(page).count()).toBe(0);
  expect(await passwordField(page).count()).toBe(0);
});

test('signing in with a wrong password shows an error and does not sign in', { tag: '@issue-106-ac-5' }, async ({ page }) => {
  const email = uniqueEmail();
  await createUserViaApi(email);
  await signIn(page, email, 'Wr0ng!Passw0rd#xx');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).not.toBeEmpty();
  await expectSignedOutView(page);
  expect(await signedInText(page, email).count()).toBe(0);
});

test('signing in with an email that has no account shows an error and does not sign in', { tag: '@issue-106-ac-5' }, async ({ page }) => {
  const email = uniqueEmail();
  await signIn(page, email);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).not.toBeEmpty();
  await expectSignedOutView(page);
  expect(await signedInText(page, email).count()).toBe(0);
});

test('a note is added trimmed as the last item and the field is emptied', { tag: '@issue-106-ac-6' }, async ({ page }) => {
  await signUp(page, uniqueEmail());
  await addNote(page, 'First');
  await expectNotes(page, ['First']);
  await addNote(page, '  Buy milk  ');
  await expectNotes(page, ['First', 'Buy milk']);
  await expect(noteField(page)).toHaveValue('');
});

test('pressing Enter in the note field adds the note', { tag: '@issue-106-ac-6' }, async ({ page }) => {
  await signUp(page, uniqueEmail());
  await noteField(page).fill('With Enter');
  await noteField(page).press('Enter');
  await expectNotes(page, ['With Enter']);
  await expect(noteField(page)).toHaveValue('');
});

test('an empty or white-space note adds nothing', { tag: '@issue-106-ac-7' }, async ({ page }) => {
  await signUp(page, uniqueEmail());
  for (const text of ['', '   ']) {
    await noteField(page).fill(text);
    // A disabled button is a valid way to add nothing: click only when enabled.
    if (await addNoteButton(page).isEnabled()) await addNoteButton(page).click();
    await noteField(page).press('Enter');
  }
  // Positive sign that the actions took effect: a real note after them is the only item.
  await addNote(page, 'Real note');
  await expectNotes(page, ['Real note']);
});

test('notes are listed oldest first with their full text', { tag: '@issue-106-ac-8' }, async ({ page }) => {
  const texts = ['Alpha reminder to call the dentist on Monday', 'Beta', 'Gamma with  inner spaces'];
  await signUp(page, uniqueEmail());
  for (const t of texts) await addNote(page, t);
  await expectNotes(page, texts);
});

test('after a reload the person is still signed in with the same notes in the same order', { tag: '@issue-106-ac-9' }, async ({ page }) => {
  const email = await signedInUserWithNotes(page, ['One', 'Two', 'Three']);
  await page.reload();
  await expect(signedInText(page, email)).toBeVisible();
  await expectNotes(page, ['One', 'Two', 'Three']);
});

test('signing out shows the signed-out view with no notes, also after a reload', { tag: '@issue-106-ac-10' }, async ({ page }) => {
  const email = await signedInUserWithNotes(page, ['Private one']);
  await signOutButton(page).click();
  await expect(signInButton(page)).toBeVisible();
  await expectSignedOutView(page);
  expect(await page.getByText('Private one').count()).toBe(0);
  await page.reload();
  await expect(signInButton(page)).toBeVisible();
  // Let the app finish restoring a stored session before the one-shot absence checks.
  await page.waitForLoadState('networkidle');
  await expectSignedOutView(page);
  expect(await page.getByText('Private one').count()).toBe(0);
  expect(await signedInText(page, email).count()).toBe(0);
});

test('after signing out and in again all earlier notes are listed in order', { tag: '@issue-106-ac-11' }, async ({ page }) => {
  const email = await signedInUserWithNotes(page, ['A', 'B', 'C']);
  await signOutButton(page).click();
  await expect(signInButton(page)).toBeVisible();
  await signIn(page, email);
  await expect(signedInText(page, email)).toBeVisible();
  await expectNotes(page, ['A', 'B', 'C']);
});

test('the same account in a different browser shows the same notes in the same order', { tag: '@issue-106-ac-12' }, async ({ page, browser }) => {
  const email = await signedInUserWithNotes(page, ['Cross 1', 'Cross 2']);
  const other = await browser.newContext();
  try {
    const page2 = await other.newPage();
    await page2.goto('/');
    await signIn(page2, email);
    await expect(signedInText(page2, email)).toBeVisible();
    await expectNotes(page2, ['Cross 1', 'Cross 2']);
  } finally {
    await other.close();
  }
});

// Expectation: the app reads the notes from the REST API with a GET under /rest/v1/ (the response
// body holds the marker). A read through an RPC or an Edge Function is not found and the poll fails.
async function ownNotesReadRequests(page: Page, email: string, marker: string) {
  // Reload the signed-in page and record the app's own database reads (GET under /rest/v1/).
  const urls: string[] = [];
  page.on('response', async (res) => {
    const req = res.request();
    if (req.method() === 'GET' && new URL(res.url()).pathname.startsWith('/rest/v1/')) {
      try {
        if ((await res.text()).includes(marker)) urls.push(res.url());
      } catch { /* response body gone */ }
    }
  });
  await page.reload();
  await expect(signedInText(page, email)).toBeVisible();
  await expect.poll(() => urls.length).toBeGreaterThan(0);
  return [...new Set(urls)];
}

test('another account sees only its own notes in the same browser and in another', { tag: '@issue-106-ac-13' }, async ({ page, browser }) => {
  const marker = `secret-${crypto.randomUUID()}`;
  await signedInUserWithNotes(page, [`${marker} one`, `${marker} two`]);
  await signOutButton(page).click();
  await expect(signInButton(page)).toBeVisible();

  const email2 = uniqueEmail();
  await signUp(page, email2);
  await expectNotes(page, []);
  await addNote(page, 'Second account note');
  await expectNotes(page, ['Second account note']);
  expect(await page.getByText(marker).count()).toBe(0);

  const other = await browser.newContext();
  try {
    const page2 = await other.newPage();
    await page2.goto('/');
    await signIn(page2, email2);
    await expect(signedInText(page2, email2)).toBeVisible();
    await expectNotes(page2, ['Second account note']);
    expect(await page2.getByText(marker).count()).toBe(0);
  } finally {
    await other.close();
  }
});

test('the database returns none of the first account\'s notes to another account or to no sign-in', { tag: '@issue-106-ac-13' }, async ({ page }) => {
  const marker = `secret-${crypto.randomUUID()}`;
  const email1 = await signedInUserWithNotes(page, [`${marker} one`, `${marker} two`]);
  const readUrls = await ownNotesReadRequests(page, email1, marker);

  const email2 = uniqueEmail();
  await createUserViaApi(email2);
  const token1 = await accessTokenFor(email1);
  const token2 = await accessTokenFor(email2);

  const read = async (url: string, bearer: string) => {
    const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${bearer}` } });
    return res.text();
  };

  for (const url of readUrls) {
    // Guard: the replayed request does return the notes to their owner.
    expect(await read(url, token1)).toContain(marker);
    // Another account and an anonymous caller get none of them.
    expect(await read(url, token2)).not.toContain(marker);
    expect(await read(url, ANON_KEY)).not.toContain(marker);
  }
});

test('signing up, in and out and adding notes leave the tasks on the board unchanged', { tag: '@issue-106-ac-14' }, async ({ page }) => {
  const lane = (s: string) => page.getByRole('region', { name: s });
  const addTask = async (title: string) => {
    await page.getByRole('textbox', { name: 'Title' }).fill(title);
    await page.getByRole('button', { name: 'Add task' }).click();
  };
  await addTask('Task one');
  await addTask('Task two');
  await addTask('Task four');
  await lane('Todo').getByRole('listitem').filter({ hasText: 'Task one' })
    .getByRole('button', { name: /deadline.*Task one|Task one.*deadline/i }).click();
  await page.getByLabel('Deadline', { exact: true }).fill('2026-12-24');
  await page.getByRole('button', { name: /Save/ }).click();
  await expect(lane('Todo').getByRole('listitem').filter({ hasText: 'Task one' }).getByText(/\bDue\b/)).toHaveCount(1);
  await lane('Todo').getByRole('listitem').filter({ hasText: 'Task two' }).getByRole('button', { name: 'Move to Doing' }).click();
  await expect(lane('Doing').getByRole('listitem').filter({ hasText: 'Task two' })).toHaveCount(1);

  const expectBoard = async () => {
    await expect(lane('Todo').getByRole('listitem')).toHaveCount(2);
    await expect(lane('Todo').getByRole('listitem').first()).toContainText('Task one');
    await expect(lane('Todo').getByRole('listitem').first()).toContainText('Due 24 Dec 2026');
    await expect(lane('Todo').getByRole('listitem').nth(1)).toContainText('Task four');
    await expect(lane('Todo').getByRole('listitem').nth(1).getByText(/\bDue\b/)).toHaveCount(0);
    await expect(lane('Doing').getByRole('listitem')).toHaveCount(1);
    await expect(lane('Doing').getByRole('listitem').first()).toContainText('Task two');
    await expect(lane('Done').getByRole('listitem')).toHaveCount(0);
  };

  const email = uniqueEmail();
  await signUp(page, email);
  await expectBoard();
  await addNote(page, 'A note');
  await expectNotes(page, ['A note']);
  await expectBoard();
  await signOutButton(page).click();
  await expect(signInButton(page)).toBeVisible();
  await expectBoard();
  await signIn(page, email);
  await expect(signedInText(page, email)).toBeVisible();
  await expectBoard();
  // The board still works while signed in.
  await addTask('Task three');
  await expect(lane('Todo').getByRole('listitem').filter({ hasText: 'Task three' })).toHaveCount(1);
});
