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
  await page.getByRole('button', { name: 'Add task' }).click();
}

async function moveTask(page: Page, from: Status, title: string, to: Status, index = 0) {
  await taskIn(page, from, title).nth(index).getByRole('button', { name: `Move to ${to}` }).click();
}

async function expectCounts(page: Page, counts: Record<Status, number>) {
  for (const s of STATUSES) await expect(tasksIn(page, s)).toHaveCount(counts[s]);
}

test('AC-1: with no stored tasks, three empty swimlanes Todo, Doing and Done are shown', async ({ page }) => {
  for (const s of STATUSES) await expect(lane(page, s)).toBeVisible();
  await expect(page.getByRole('region')).toHaveCount(3);
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 0 });
});

test('AC-2: all three swimlanes stay shown when some contain no tasks', async ({ page }) => {
  await addTask(page, 'Only task');
  await expect(taskIn(page, 'Todo', 'Only task')).toHaveCount(1);
  for (const s of STATUSES) await expect(lane(page, s)).toBeVisible();
  await moveTask(page, 'Todo', 'Only task', 'Done');
  await expect(taskIn(page, 'Done', 'Only task')).toHaveCount(1);
  for (const s of STATUSES) await expect(lane(page, s)).toBeVisible();
});

test('AC-3: an added task appears in the Todo swimlane and in no other', async ({ page }) => {
  await addTask(page, 'Write report');
  await expect(taskIn(page, 'Todo', 'Write report')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Write report')).toHaveCount(0);
  await expect(taskIn(page, 'Done', 'Write report')).toHaveCount(0);
});

test('AC-4: adding a task leaves the tasks already shown in their swimlanes', async ({ page }) => {
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

test('AC-5: an empty or whitespace-only title adds no task and changes nothing', async ({ page }) => {
  await addTask(page, 'Existing');
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 0 });
  await addTask(page, '');
  await addTask(page, '   ');
  await addTask(page, ' \t ');
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 0 });
  await expect(taskIn(page, 'Todo', 'Existing')).toHaveCount(1);
});

test('AC-5: an empty title on an empty view adds no task', async ({ page }) => {
  await addTask(page, '   ');
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 0 });
});

test('AC-6: leading and trailing whitespace is not part of the shown title', async ({ page }) => {
  await addTask(page, '  Buy milk  ');
  const task = tasksIn(page, 'Todo');
  await expect(task).toHaveCount(1);
  await expect(task.first()).toHaveText('Buy milk', { useInnerText: true });
  await expect(lane(page, 'Todo').getByText('Buy milk', { exact: true })).toHaveCount(1);
  await page.reload();
  await expect(tasksIn(page, 'Todo')).toHaveCount(1);
  await expect(lane(page, 'Todo').getByText('Buy milk', { exact: true })).toHaveCount(1);
});

test('AC-7: two tasks with the same title are both added as separate tasks', async ({ page }) => {
  await addTask(page, 'Same');
  await addTask(page, 'Same');
  await expect(taskIn(page, 'Todo', 'Same')).toHaveCount(2);
  await expectCounts(page, { Todo: 2, Doing: 0, Done: 0 });
});

for (const from of STATUSES) {
  for (const to of STATUSES.filter((s) => s !== from)) {
    test(`AC-8: a task in ${from} can be moved to ${to} and leaves ${from}`, async ({ page }) => {
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

test('AC-8: a task is not offered a move to the status it already has', async ({ page }) => {
  await addTask(page, 'Stay');
  const task = taskIn(page, 'Todo', 'Stay');
  await expect(task.getByRole('button', { name: 'Move to Doing' })).toBeVisible();
  await expect(task.getByRole('button', { name: 'Move to Done' })).toBeVisible();
  await expect(task.getByRole('button', { name: 'Move to Todo' })).toHaveCount(0);
});

test('AC-9: moving one task does not change any other task, including one with the same title', async ({ page }) => {
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

test('AC-10: a task can be moved repeatedly forward and backward', async ({ page }) => {
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

test('AC-11: after a reload every task is shown with its title and latest status', async ({ page }) => {
  await addTask(page, 'A');
  await addTask(page, 'B');
  await addTask(page, 'C');
  await moveTask(page, 'Todo', 'B', 'Doing');
  await moveTask(page, 'Todo', 'C', 'Done');
  await moveTask(page, 'Done', 'C', 'Doing');
  await expectCounts(page, { Todo: 1, Doing: 2, Done: 0 });
  await page.reload();
  await expect(taskIn(page, 'Todo', 'A')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'B')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'C')).toHaveCount(1);
});

test('AC-12: after a reload no extra task appears and none appears twice', async ({ page }) => {
  await addTask(page, 'Solo');
  await addTask(page, 'Solo');
  await addTask(page, 'Other');
  await moveTask(page, 'Todo', 'Other', 'Done');
  await page.reload();
  await expectCounts(page, { Todo: 2, Doing: 0, Done: 1 });
  await page.reload();
  await expectCounts(page, { Todo: 2, Doing: 0, Done: 1 });
});

test('AC-12: after a reload with nothing added, no task appears', async ({ page }) => {
  await page.reload();
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 0 });
});
