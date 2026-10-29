import { test, expect, type Page, type Locator } from '@playwright/test';

type Status = 'Todo' | 'Doing' | 'Done';
const STATUSES: Status[] = ['Todo', 'Doing', 'Done'];

// Clear storage once per test, before the first page load only (not on reloads).
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

const lane = (page: Page, status: Status): Locator => page.getByRole('region', { name: status });
const tasksIn = (page: Page, status: Status): Locator => lane(page, status).getByRole('listitem');
const taskIn = (page: Page, status: Status, title: string): Locator =>
  tasksIn(page, status).filter({ hasText: title });

async function addTask(page: Page, title: string) {
  await page.getByRole('textbox', { name: 'Title' }).fill(title);
  // A button disabled for an empty title is a valid way to add nothing: click only when enabled.
  const button = page.getByRole('button', { name: 'Add task' });
  if (await button.isEnabled()) await button.click();
}

async function moveTask(page: Page, from: Status, title: string, to: Status, index = 0) {
  await taskIn(page, from, title).nth(index).getByRole('button', { name: `Move to ${to}` }).click();
}

async function expectCounts(page: Page, counts: Record<Status, number>) {
  for (const s of STATUSES) await expect(tasksIn(page, s)).toHaveCount(counts[s]);
}

test('AC-1: with no stored tasks, three empty swimlanes Todo, Doing and Done are shown', { tag: '@issue-28-ac-1' }, async ({ page }) => {
  for (const s of STATUSES) await expect(lane(page, s)).toBeVisible();
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 0 });
});

test('AC-2: all three swimlanes stay shown when some contain no tasks', { tag: '@issue-28-ac-2' }, async ({ page }) => {
  await addTask(page, 'Only task');
  await expect(taskIn(page, 'Todo', 'Only task')).toHaveCount(1);
  for (const s of STATUSES) await expect(lane(page, s)).toBeVisible();
  await moveTask(page, 'Todo', 'Only task', 'Done');
  await expect(taskIn(page, 'Done', 'Only task')).toHaveCount(1);
  for (const s of STATUSES) await expect(lane(page, s)).toBeVisible();
});

test('AC-3: an added task appears in the Todo swimlane and in no other', { tag: '@issue-28-ac-3' }, async ({ page }) => {
  await addTask(page, 'Write report');
  await expect(taskIn(page, 'Todo', 'Write report')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Write report')).toHaveCount(0);
  await expect(taskIn(page, 'Done', 'Write report')).toHaveCount(0);
});

test('AC-4: adding a task leaves the tasks already shown in their swimlanes', { tag: '@issue-28-ac-4' }, async ({ page }) => {
  await addTask(page, 'First');
  await addTask(page, 'Second');
  await moveTask(page, 'Todo', 'First', 'Doing');
  await moveTask(page, 'Todo', 'Second', 'Done');
  await addTask(page, 'Third');
  await expect(taskIn(page, 'Todo', 'Third')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'First')).toHaveCount(1);
  await expect(taskIn(page, 'Done', 'Second')).toHaveCount(1);
  await expectCounts(page, { Todo: 1, Doing: 1, Done: 1 });
});

test('AC-5: an empty or whitespace-only title adds no task and changes nothing', { tag: '@issue-28-ac-5' }, async ({ page }) => {
  await addTask(page, 'Existing');
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 0 });
  await addTask(page, '');
  await addTask(page, '   ');
  await addTask(page, ' \t ');
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 0 });
  await expect(taskIn(page, 'Todo', 'Existing')).toHaveCount(1);
});

test('AC-5: an empty title on an empty view adds no task', { tag: '@issue-28-ac-5' }, async ({ page }) => {
  await addTask(page, '   ');
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 0 });
});

test('AC-6: leading and trailing whitespace is not part of the shown title', { tag: '@issue-28-ac-6' }, async ({ page }) => {
  await addTask(page, '  Buy milk  ');
  const task = tasksIn(page, 'Todo');
  const expectTrimmed = async () => {
    await expect(task).toHaveCount(1);
    await expect(task.first()).toContainText('Buy milk');
    const title = lane(page, 'Todo').getByText('Buy milk', { exact: true });
    await expect(title).toHaveCount(1);
    // getByText and toHaveText collapse whitespace, so read the raw text.
    expect(await title.first().textContent()).toBe('Buy milk');
  };
  await expectTrimmed();
  await page.reload();
  await expectTrimmed();
});

test('AC-7: two tasks with the same title are both added as separate tasks', { tag: '@issue-28-ac-7' }, async ({ page }) => {
  await addTask(page, 'Same');
  await addTask(page, 'Same');
  await expect(taskIn(page, 'Todo', 'Same')).toHaveCount(2);
  await expectCounts(page, { Todo: 2, Doing: 0, Done: 0 });
});

for (const from of STATUSES) {
  for (const to of STATUSES.filter((s) => s !== from)) {
    test(`AC-8: a task in ${from} can be moved to ${to} and leaves ${from}`, { tag: '@issue-28-ac-8' }, async ({ page }) => {
      await addTask(page, 'Mover');
      if (from !== 'Todo') await moveTask(page, 'Todo', 'Mover', from);
      await expect(taskIn(page, from, 'Mover')).toHaveCount(1);
      await moveTask(page, from, 'Mover', to);
      await expect(taskIn(page, to, 'Mover')).toHaveCount(1);
      await expect(taskIn(page, from, 'Mover')).toHaveCount(0);
      const other = STATUSES.find((s) => s !== from && s !== to)!;
      await expect(taskIn(page, other, 'Mover')).toHaveCount(0);
    });
  }
}

test('AC-9: moving one task does not change any other task, including one with the same title', { tag: '@issue-28-ac-9' }, async ({ page }) => {
  await addTask(page, 'Twin');
  await addTask(page, 'Twin');
  await addTask(page, 'Other');
  await moveTask(page, 'Todo', 'Other', 'Doing');
  await moveTask(page, 'Todo', 'Twin', 'Done');
  await expectCounts(page, { Todo: 1, Doing: 1, Done: 1 });
  await expect(taskIn(page, 'Todo', 'Twin')).toHaveCount(1);
  await expect(taskIn(page, 'Done', 'Twin')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Other')).toHaveCount(1);
});

test('AC-10: a task can be moved repeatedly forward and backward', { tag: '@issue-28-ac-10' }, async ({ page }) => {
  await addTask(page, 'Traveller');
  const path: Array<[Status, Status]> = [
    ['Todo', 'Done'],
    ['Done', 'Doing'],
    ['Doing', 'Todo'],
  ];
  for (const [from, to] of path) {
    await moveTask(page, from, 'Traveller', to);
    for (const s of STATUSES) {
      await expect(taskIn(page, s, 'Traveller')).toHaveCount(s === to ? 1 : 0);
    }
  }
});

test('AC-11: after a reload every task is shown with its title and latest status', { tag: '@issue-28-ac-11' }, async ({ page }) => {
  await addTask(page, 'Alpha plan');
  await addTask(page, 'Bravo plan');
  await addTask(page, 'Charlie plan');
  await moveTask(page, 'Todo', 'Bravo plan', 'Doing');
  await moveTask(page, 'Todo', 'Charlie plan', 'Done');
  await moveTask(page, 'Done', 'Charlie plan', 'Doing');
  await expectCounts(page, { Todo: 1, Doing: 2, Done: 0 });
  await page.reload();
  await expectCounts(page, { Todo: 1, Doing: 2, Done: 0 });
  await expect(taskIn(page, 'Todo', 'Alpha plan')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Bravo plan')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Charlie plan')).toHaveCount(1);
});

test('AC-12: after a reload no extra task appears and none appears twice', { tag: '@issue-28-ac-12' }, async ({ page }) => {
  await addTask(page, 'Solo');
  await addTask(page, 'Solo');
  await addTask(page, 'Other');
  await moveTask(page, 'Todo', 'Other', 'Done');
  await page.reload();
  await expectCounts(page, { Todo: 2, Doing: 0, Done: 1 });
  await page.reload();
  await expectCounts(page, { Todo: 2, Doing: 0, Done: 1 });
});

test('AC-12: after a reload with nothing added, no task appears', { tag: '@issue-28-ac-12' }, async ({ page }) => {
  await page.reload();
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 0 });
});
