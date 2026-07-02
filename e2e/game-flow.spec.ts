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

// Attacks open the v0.8 power-strike gauge; lock it if it appears. The gauge
// self-resolves under prefers-reduced-motion, so its absence is also valid.
async function lockStrikeIfShown(page: Page) {
  const lock = page.getByRole('button', { name: 'STRIKE' });
  const shown = await lock.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
  if (shown) {
    await lock.click();
    await page.locator('.strike-backdrop').waitFor({ state: 'hidden' });
  }
}

async function attackOnce(page: Page) {
  await page.getByRole('button', { name: /Attack/ }).click();
  await lockStrikeIfShown(page);
}

async function finishBattle(page: Page) {
  for (let turn = 0; turn < 60; turn += 1) {
    const result = page.getByRole('heading', { name: /^(Victory!|Defeat)$/ });
    if (await result.isVisible()) return;
    await attackOnce(page);
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
  test.setTimeout(120_000); // strike gauge adds ~1s per battle turn
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

  // v0.8: attacking opens the power-strike timing gauge.
  await page.getByRole('button', { name: /Attack/ }).click();
  await expect(page.locator('.strike-panel')).toBeVisible();
  await expect(page.locator('.strike-marker')).toBeVisible();
  await page.getByRole('button', { name: 'STRIKE' }).click();
  await expect(page.locator('.strike-backdrop')).toBeHidden();
  await expect(page.getByText(/dealt|dodged|CRITICAL/)).toBeVisible();

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

  await page.getByRole('button', { name: 'Player profile for Returning Player' }).click();
  await expect(page.getByRole('dialog', { name: 'Player Profile' })).toBeVisible();
  await expect(page.getByText('Garden Rookie')).toBeVisible();
  await expect(page.getByText(/hard rival · 7 turns/)).toBeVisible();
  await expectViewportFit(page);
  await page.getByLabel('Player name').fill('Updated Player');
  await page.getByRole('button', { name: 'Save Name' }).click();
  await expect(page.evaluate(() => localStorage.getItem('fca-username'))).resolves.toBe('Updated Player');
  await page.getByRole('button', { name: 'Replay Tutorial' }).click();
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.getByRole('button', { name: 'Ready to battle' }).click();

  await page.getByRole('button', { name: 'hard' }).click();
  await page.getByRole('button', { name: 'Exhibition' }).click();
  await expect(page.getByText('Exhibition · hard')).toBeVisible();
  await expectViewportFit(page);

  await page.getByRole('button', { name: 'Inspect Dragon-Fruit' }).click();
  await expect(page.getByRole('dialog', { name: 'Dragon-Fruit card details' })).toBeVisible();
  await page.getByRole('button', { name: 'Close card details' }).click();
  await attackOnce(page);
  await expect(page.getByText(/dealt|dodged|CRITICAL/)).toBeVisible();
});

test('player can reset saved progress without losing their name', async ({ page }) => {
  await page.addInitScript((team) => {
    localStorage.setItem('fca-username', 'Reset Player');
    localStorage.setItem('fca-tutorial-seen', 'yes');
    localStorage.setItem('fca-team', JSON.stringify(team));
    localStorage.setItem('fca-tournament-progress', '3');
    localStorage.setItem('fca-record', JSON.stringify({ wins: 4, losses: 2, battles: 6, arenaPoints: 475, history: [] }));
  }, selectedTeam);

  await page.goto('/');
  await page.getByRole('button', { name: 'Player profile for Reset Player' }).click();
  await expect(page.getByRole('dialog', { name: 'Player Profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset Progress' }).click();
  await expect(page.getByRole('button', { name: 'Confirm Reset' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Reset' }).click();

  await expect(page.getByRole('dialog', { name: 'Player Profile' })).toBeHidden();
  await expect(page.getByText('0/3 selected')).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem('fca-username'))).resolves.toBe('Reset Player');
  await expect(page.evaluate(() => localStorage.getItem('fca-record'))).resolves.toBeNull();
  await expect(page.evaluate(() => localStorage.getItem('fca-team'))).resolves.toBeNull();
  await expect(page.evaluate(() => localStorage.getItem('fca-tournament-progress'))).resolves.toBeNull();
  await expectViewportFit(page);
});
