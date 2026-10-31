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

// Puts a task with the title into the status, using the existing move control.
async function addTaskIn(page: Page, title: string, status: Status) {
  await addTask(page, title);
  if (status !== 'Todo') {
    await taskIn(page, 'Todo', title).last().getByRole('button', { name: `Move to ${status}` }).click();
  }
  await expect(taskIn(page, status, title)).not.toHaveCount(0);
}

async function expectCounts(page: Page, counts: Record<Status, number>) {
  for (const s of STATUSES) await expect(tasksIn(page, s)).toHaveCount(counts[s]);
}

type Point = { x: number; y: number };

async function centerOf(locator: Locator): Promise<Point> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Where a task can be grabbed: its title, not its buttons.
const grabPoint = (page: Page, status: Status, title: string, index = 0) =>
  centerOf(taskIn(page, status, title).nth(index).getByText(title, { exact: true }));

// Presses the mouse on the point and starts dragging; the button stays down.
async function pickUp(page: Page, from: Point) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y + 8, { steps: 3 });
}

async function dragOver(page: Page, to: Point) {
  await page.mouse.move(to.x, to.y, { steps: 8 });
}

async function release(page: Page) {
  await page.mouse.up();
}

async function drag(page: Page, from: Point, to: Point) {
  await pickUp(page, from);
  await dragOver(page, to);
  await release(page);
}

const headingPoint = (page: Page, status: Status) => centerOf(lane(page, status).getByRole('heading', { name: status }));

// A point on the swimlane's own area, low in it, away from the heading and from tasks.
async function emptyPartPoint(page: Page, status: Status): Promise<Point> {
  const box = await lane(page, status).boundingBox();
  if (!box) throw new Error('swimlane has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height - 6 };
}

// A place outside every swimlane: the page's main heading.
const outsidePoint = (page: Page) => centerOf(page.getByRole('heading', { level: 1 }));

// What a swimlane looks like: the visual properties a drop mark can change.
async function look(page: Page, status: Status): Promise<string> {
  return lane(page, status).evaluate((el) => {
    const props = [
      'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset',
      'backgroundColor', 'backgroundImage', 'boxShadow',
      'borderTopStyle', 'borderTopWidth', 'borderTopColor',
      'borderLeftStyle', 'borderLeftWidth', 'borderLeftColor',
    ] as const;
    const describe = (e: Element) => {
      const cs = getComputedStyle(e);
      return props.map((p) => cs[p]).join('|');
    };
    return [el, ...Array.from(el.children)].map(describe).join('||');
  });
}

async function looks(page: Page): Promise<Record<Status, string>> {
  return { Todo: await look(page, 'Todo'), Doing: await look(page, 'Doing'), Done: await look(page, 'Done') };
}

for (const from of STATUSES) {
  for (const to of STATUSES.filter((s) => s !== from)) {
    test(`a task dragged from ${from} and dropped on ${to} moves there and leaves ${from}`, { tag: '@issue-82-ac-1' }, async ({ page }) => {
      await addTaskIn(page, 'Dragged', from);
      await drag(page, await grabPoint(page, from, 'Dragged'), await centerOf(lane(page, to)));
      await expect(taskIn(page, to, 'Dragged')).toHaveCount(1);
      await expect(taskIn(page, from, 'Dragged')).toHaveCount(0);
      const other = STATUSES.find((s) => s !== from && s !== to)!;
      await expect(taskIn(page, other, 'Dragged')).toHaveCount(0);
    });
  }
}

test('a drop on the heading of a swimlane counts as a drop on that swimlane', { tag: '@issue-82-ac-2' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  await drag(page, await grabPoint(page, 'Todo', 'Dragged'), await headingPoint(page, 'Doing'));
  await expect(taskIn(page, 'Doing', 'Dragged')).toHaveCount(1);
  await expectCounts(page, { Todo: 0, Doing: 1, Done: 0 });
});

test('a drop on an empty part of a swimlane counts as a drop on that swimlane', { tag: '@issue-82-ac-2' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  await addTaskIn(page, 'Resident', 'Done');
  await drag(page, await grabPoint(page, 'Todo', 'Dragged'), await emptyPartPoint(page, 'Done'));
  await expect(taskIn(page, 'Done', 'Dragged')).toHaveCount(1);
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 2 });
});

test('a drop on top of another task in a swimlane counts as a drop on that swimlane', { tag: '@issue-82-ac-2' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  await addTaskIn(page, 'Resident', 'Doing');
  await drag(page, await grabPoint(page, 'Todo', 'Dragged'), await grabPoint(page, 'Doing', 'Resident'));
  await expect(taskIn(page, 'Doing', 'Dragged')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Resident')).toHaveCount(1);
  await expectCounts(page, { Todo: 0, Doing: 2, Done: 0 });
});

test('a task can be dropped on a swimlane that has no tasks', { tag: '@issue-82-ac-3' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  await expect(tasksIn(page, 'Done')).toHaveCount(0);
  await drag(page, await grabPoint(page, 'Todo', 'Dragged'), await centerOf(lane(page, 'Done')));
  await expect(taskIn(page, 'Done', 'Dragged')).toHaveCount(1);
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 1 });
});

test('dragging a task leaves every other task unchanged, including one with the same title', { tag: '@issue-82-ac-4' }, async ({ page }) => {
  await addTask(page, 'Twin');
  await addTask(page, 'Twin');
  await addTaskIn(page, 'Bystander', 'Doing');
  await addTaskIn(page, 'Finished', 'Done');
  await expectCounts(page, { Todo: 2, Doing: 1, Done: 1 });
  await drag(page, await grabPoint(page, 'Todo', 'Twin', 0), await centerOf(lane(page, 'Doing')));
  await expectCounts(page, { Todo: 1, Doing: 2, Done: 1 });
  await expect(taskIn(page, 'Todo', 'Twin')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Twin')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Bystander')).toHaveCount(1);
  await expect(taskIn(page, 'Done', 'Finished')).toHaveCount(1);
});

test('a task dropped on its own swimlane stays where it is and nothing else changes', { tag: '@issue-82-ac-5' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Doing');
  await addTaskIn(page, 'Neighbour', 'Doing');
  await addTaskIn(page, 'Elsewhere', 'Todo');
  await drag(page, await grabPoint(page, 'Doing', 'Dragged'), await headingPoint(page, 'Doing'));
  await expectCounts(page, { Todo: 1, Doing: 2, Done: 0 });
  await expect(taskIn(page, 'Doing', 'Dragged')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Neighbour')).toHaveCount(1);
  await expect(taskIn(page, 'Todo', 'Elsewhere')).toHaveCount(1);
});

test('a task released outside every swimlane stays where it is and nothing else changes', { tag: '@issue-82-ac-5' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Doing');
  await addTaskIn(page, 'Elsewhere', 'Done');
  await drag(page, await grabPoint(page, 'Doing', 'Dragged'), await outsidePoint(page));
  await expectCounts(page, { Todo: 0, Doing: 1, Done: 1 });
  await expect(taskIn(page, 'Doing', 'Dragged')).toHaveCount(1);
  await expect(taskIn(page, 'Done', 'Elsewhere')).toHaveCount(1);
});

test('while a task is dragged, the two other swimlanes are marked and its own is not', { tag: '@issue-82-ac-6' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Doing');
  const before = await looks(page);
  await pickUp(page, await grabPoint(page, 'Doing', 'Dragged'));
  // The pointer is over no swimlane, so only the drop marks can change how a swimlane looks.
  await dragOver(page, await outsidePoint(page));
  await expect.poll(() => look(page, 'Todo')).not.toBe(before.Todo);
  await expect.poll(() => look(page, 'Done')).not.toBe(before.Done);
  expect(await look(page, 'Doing')).toBe(before.Doing);
  await release(page);
});

test('every task can be dragged and marks the two other swimlanes as drop places', { tag: '@issue-82-ac-6' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  const before = await looks(page);
  await pickUp(page, await grabPoint(page, 'Todo', 'Dragged'));
  await dragOver(page, await outsidePoint(page));
  await expect.poll(() => look(page, 'Doing')).not.toBe(before.Doing);
  await expect.poll(() => look(page, 'Done')).not.toBe(before.Done);
  expect(await look(page, 'Todo')).toBe(before.Todo);
  await release(page);
});

test('the swimlane under the dragged task looks different from the other possible drop place', { tag: '@issue-82-ac-7' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  await pickUp(page, await grabPoint(page, 'Todo', 'Dragged'));
  await dragOver(page, await headingPoint(page, 'Doing'));
  await expect.poll(async () => (await look(page, 'Doing')) !== (await look(page, 'Done'))).toBe(true);
  const doingHovered = await look(page, 'Doing');
  const doneIdle = await look(page, 'Done');

  await dragOver(page, await headingPoint(page, 'Done'));
  await expect.poll(async () => (await look(page, 'Done')) !== (await look(page, 'Doing'))).toBe(true);
  // The marks follow the pointer: the two swimlanes have swapped looks.
  await expect.poll(() => look(page, 'Done')).toBe(doingHovered);
  await expect.poll(() => look(page, 'Doing')).toBe(doneIdle);
  await release(page);
});

test('when no task is dragged, no swimlane shows drop marks', { tag: '@issue-82-ac-8' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  await addTaskIn(page, 'Other', 'Done');
  const before = await looks(page);
  expect(before.Doing).toBe((await looks(page)).Doing);

  // While dragging the looks change; after a drop on another swimlane they are back.
  await pickUp(page, await grabPoint(page, 'Todo', 'Dragged'));
  await dragOver(page, await outsidePoint(page));
  await expect.poll(() => look(page, 'Doing')).not.toBe(before.Doing);
  await dragOver(page, await centerOf(lane(page, 'Doing')));
  await release(page);
  await expect(taskIn(page, 'Doing', 'Dragged')).toHaveCount(1);
  await page.mouse.move(1, 1);
  await expect.poll(() => look(page, 'Doing')).toBe(before.Doing);
  await expect.poll(() => look(page, 'Todo')).toBe(before.Todo);
  await expect.poll(() => look(page, 'Done')).toBe(before.Done);
});

test('the drop marks are gone after a release that does not move the task', { tag: '@issue-82-ac-8' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Doing');
  const before = await looks(page);

  // Released outside every swimlane.
  await pickUp(page, await grabPoint(page, 'Doing', 'Dragged'));
  await dragOver(page, await outsidePoint(page));
  await expect.poll(() => look(page, 'Todo')).not.toBe(before.Todo);
  await release(page);
  await expect(taskIn(page, 'Doing', 'Dragged')).toHaveCount(1);
  for (const s of STATUSES) await expect.poll(() => look(page, s)).toBe(before[s]);

  // Released on its own swimlane.
  await pickUp(page, await grabPoint(page, 'Doing', 'Dragged'));
  await dragOver(page, await outsidePoint(page));
  await expect.poll(() => look(page, 'Todo')).not.toBe(before.Todo);
  await dragOver(page, await headingPoint(page, 'Doing'));
  await release(page);
  await expect(taskIn(page, 'Doing', 'Dragged')).toHaveCount(1);
  await page.mouse.move(1, 1);
  for (const s of STATUSES) await expect.poll(() => look(page, s)).toBe(before[s]);
});

test('a task moved by drag and drop is shown in its new swimlane after a reload', { tag: '@issue-82-ac-9' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  await addTaskIn(page, 'Stays', 'Doing');
  await drag(page, await grabPoint(page, 'Todo', 'Dragged'), await centerOf(lane(page, 'Done')));
  await expect(taskIn(page, 'Done', 'Dragged')).toHaveCount(1);
  await page.reload();
  await expectCounts(page, { Todo: 0, Doing: 1, Done: 1 });
  await expect(taskIn(page, 'Done', 'Dragged')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Stays')).toHaveCount(1);
});

test('the move buttons still work for tasks before and after drag and drop', { tag: '@issue-82-ac-10' }, async ({ page }) => {
  await addTaskIn(page, 'Dragged', 'Todo');
  await addTaskIn(page, 'Pushed', 'Todo');
  // Before any drag.
  await taskIn(page, 'Todo', 'Pushed').getByRole('button', { name: 'Move to Doing' }).click();
  await expect(taskIn(page, 'Doing', 'Pushed')).toHaveCount(1);
  // A drag, then the buttons on both the dragged and the other task.
  await drag(page, await grabPoint(page, 'Todo', 'Dragged'), await centerOf(lane(page, 'Done')));
  await expect(taskIn(page, 'Done', 'Dragged')).toHaveCount(1);
  await taskIn(page, 'Done', 'Dragged').getByRole('button', { name: 'Move to Todo' }).click();
  await expect(taskIn(page, 'Todo', 'Dragged')).toHaveCount(1);
  await taskIn(page, 'Doing', 'Pushed').getByRole('button', { name: 'Move to Done' }).click();
  await expect(taskIn(page, 'Done', 'Pushed')).toHaveCount(1);
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 1 });
});
