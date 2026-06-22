import { expect, test, type Page } from '@playwright/test';

const selectedTeam = ['dragon-fruit', 'peachy', 'orange'];

async function expectViewportFit(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.viewportHeight + 1);
}

async function finishBattle(page: Page) {
  for (let turn = 0; turn < 60; turn += 1) {
    const result = page.getByRole('heading', { name: /^(Victory!|Defeat)$/ });
    if (await result.isVisible()) return;
    await page.getByRole('button', { name: /Attack/ }).click();
  }

  throw new Error('Battle did not reach a result within 60 turns.');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    Math.random = () => 0.5;
  });
});

test('fresh player can reach and complete a tournament battle', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fruit Card Arena' })).toBeVisible();
  await expectViewportFit(page);

  await page.getByPlaceholder('Player name').fill('Test Player');
  await page.getByRole('button', { name: 'Enter Arena' }).click();
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await expectViewportFit(page);
  await page.getByRole('button', { name: 'Ready to battle' }).click();

  for (const [index, cardName] of ['Dragon-Fruit', 'Peachy', 'Orange'].entries()) {
    await page.locator('.fruit-card').filter({ hasText: cardName }).click();
    if (index < 2) await page.getByRole('button', { name: 'Next character' }).click();
  }
  await expect(page.getByText('3/3 selected')).toBeVisible();
  await expectViewportFit(page);

  await page.getByRole('button', { name: 'Tournament' }).click();
  await expect(page.getByRole('heading', { name: 'Tournament' })).toBeVisible();
  await expectViewportFit(page);

  const route = page.locator('.tournament-grid');
  await route.dispatchEvent('touchstart', { touches: [{ identifier: 0, clientX: 260, clientY: 300 }] });
  await route.dispatchEvent('touchend', { changedTouches: [{ identifier: 0, clientX: 160, clientY: 300 }] });
  await expect(page.locator('.route-counter strong')).toHaveText('Juice Market');
  await route.dispatchEvent('touchstart', { touches: [{ identifier: 0, clientX: 160, clientY: 300 }] });
  await route.dispatchEvent('touchend', { changedTouches: [{ identifier: 0, clientX: 260, clientY: 300 }] });
  await expect(page.locator('.route-counter strong')).toHaveText('Garden Gate');

  await page.getByRole('button', { name: 'Fight' }).click();
  await expect(page.getByRole('heading', { name: 'Battle Arena' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+20 Bonus' })).toBeVisible();
  await expectViewportFit(page);

  await page.getByRole('button', { name: 'Inspect Dragon-Fruit' }).click();
  await expect(page.getByRole('dialog', { name: 'Dragon-Fruit card details' })).toBeVisible();
  await expectViewportFit(page);
  await page.getByRole('button', { name: 'Close card details' }).click();

  await finishBattle(page);
  await expect(page.getByText('Battle complete')).toBeVisible();
  await expect(page.getByText(/\d+ turns · normal difficulty/)).toBeVisible();
  await expectViewportFit(page);
});

test('returning player can start an exhibition from saved state', async ({ page }) => {
  await page.addInitScript((team) => {
    localStorage.setItem('fca-username', 'Returning Player');
    localStorage.setItem('fca-tutorial-seen', 'yes');
    localStorage.setItem('fca-team', JSON.stringify(team));
    localStorage.setItem('fca-record', JSON.stringify({ wins: 2, losses: 1, battles: 3, arenaPoints: 100, history: [{ id: 'saved-match', result: 'player', mode: 'tournament', opponent: 'Garden Rookie', points: 100, playedAt: '2026-06-20T12:00:00.000Z', difficulty: 'hard', turns: 7, playerTeam: team, enemyTeam: ['orange', 'yello', 'grape'] }] }));
  }, selectedTeam);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose Three' })).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem('fca-username'))).resolves.toBe('Returning Player');
  await expect(page.evaluate(() => JSON.parse(localStorage.getItem('fca-record') ?? '{}').wins)).resolves.toBe(2);
  await expectViewportFit(page);

  const roster = page.locator('.card-gallery');
  await roster.dispatchEvent('touchstart', { touches: [{ identifier: 0, clientX: 260, clientY: 300 }] });
  await roster.dispatchEvent('touchend', { changedTouches: [{ identifier: 0, clientX: 160, clientY: 300 }] });
  await expect(page.locator('.gallery-counter strong')).toHaveText('Peachy');

  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('dialog', { name: 'Match History' })).toBeVisible();
  await expect(page.getByText('Garden Rookie')).toBeVisible();
  await expect(page.getByText(/hard rival · 7 turns/)).toBeVisible();
  await expectViewportFit(page);
  await page.getByRole('button', { name: 'Close match history' }).click();

  await page.getByRole('button', { name: 'hard' }).click();
  await page.getByRole('button', { name: 'Exhibition' }).click();
  await expect(page.getByText('Exhibition · hard')).toBeVisible();
  await expectViewportFit(page);

  await page.getByRole('button', { name: 'Inspect Dragon-Fruit' }).click();
  await expect(page.getByRole('dialog', { name: 'Dragon-Fruit card details' })).toBeVisible();
  await page.getByRole('button', { name: 'Close card details' }).click();
  await page.getByRole('button', { name: /Attack/ }).click();
  await expect(page.getByText(/dealt|dodged/)).toBeVisible();
});
