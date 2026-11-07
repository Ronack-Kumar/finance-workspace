import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const password='browser test password 123';
async function demo(page: Page){await page.goto('/');await page.getByRole('button',{name:/Explore the live demo/}).click();await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();}
async function register(page: Page,email=`${randomUUID()}@example.com`){
  await page.goto('/#sign-up');await page.getByLabel('Full name',{exact:true}).fill('Browser tester');await page.getByLabel('Email address',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);await page.getByLabel('Workspace name',{exact:true}).fill('Browser workspace');
  await page.getByRole('button',{name:'Create workspace',exact:true}).click();await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();return email;
}
async function navigate(page: Page,name: string){if(await page.getByRole('button',{name:'Open navigation'}).isVisible())await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('link',{name,exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();}
test('demo has continuous guidance, fixed data, theme persistence and working exports',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await demo(page);
  await expect(page.locator('.demo-banner')).toContainText('Synthetic data');
  const balance=await page.locator('[data-metric=balance]').innerText();
  const initial=await page.locator('.live-income-dot').getAttribute('cx');
  await expect.poll(()=>page.locator('.live-income-dot').getAttribute('cx')).not.toBe(initial);
  const category=await page.locator('.category-panel').getAttribute('data-active-category');
  await expect.poll(()=>page.locator('.category-panel').getAttribute('data-active-category'),{timeout:8000}).not.toBe(category);
  await expect(page.locator('[data-metric=balance]')).toHaveText(balance);
  await page.getByRole('button',{name:'Pause insights',exact:true}).click();await expect(page.locator('.chart')).toHaveAttribute('data-live-running','false');
  await page.getByRole('button',{name:'Resume insights',exact:true}).click();await expect(page.locator('.chart')).toHaveAttribute('data-live-running','true');
  await page.getByRole('button',{name:'Switch theme',exact:true}).click();const theme=await page.locator('html').getAttribute('data-theme');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme',theme!);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();expect((await download).suggestedFilename()).toBe('finance-transactions.csv');
  await navigate(page,'Reports');await expect(page.getByRole('heading',{name:'Period summary'})).toBeVisible();expect(errors).toEqual([]);
});
test('a real account can create, edit, search, delete, restore and persist records',async({page})=>{
  await register(page);await expect(page.locator('[data-metric=balance]')).toHaveText('₹0.00');
  await page.getByRole('button',{name:'Add transaction',exact:true}).first().click();
  await page.getByLabel('Type',{exact:true}).selectOption('INCOME');await page.getByLabel('Amount in INR',{exact:true}).fill('1250.50');await page.getByLabel('Description',{exact:true}).fill('Design retainer');await page.getByLabel('Category',{exact:true}).fill('Consulting');
  await page.getByRole('dialog').getByRole('button',{name:'Add transaction',exact:true}).click();await expect(page.locator('[data-metric=balance]')).toHaveText('₹1,250.50');
  await page.getByRole('button',{name:'Edit Design retainer',exact:true}).click();await page.getByLabel('Amount in INR',{exact:true}).fill('1300.75');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('[data-metric=balance]')).toHaveText('₹1,300.75');
  await navigate(page,'Transactions');await page.getByRole('textbox',{name:'Search transactions',exact:true}).fill('no matching record');await expect(page.getByRole('heading',{name:'No transactions here'})).toBeVisible();
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.getByText('Design retainer',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Edit Design retainer',exact:true}).click();await page.getByRole('button',{name:'Delete transaction',exact:true}).click();await expect(page.getByRole('heading',{name:'No transactions here'})).toBeVisible();
  await page.getByLabel('Deleted',{exact:true}).check();await page.getByRole('button',{name:'Restore Design retainer',exact:true}).click();await page.getByLabel('Deleted',{exact:true}).uncheck();await expect(page.getByText('Design retainer',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('Design retainer',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
});
test('an invitation joins a real teammate with viewer-only access',async({page,browser})=>{
  await register(page);await navigate(page,'Team');const email=`${randomUUID()}@example.com`;
  await page.getByRole('button',{name:'Invite member',exact:true}).click();await page.getByRole('dialog').getByLabel('Email address',{exact:true}).fill(email);await page.getByRole('button',{name:'Create invitation link',exact:true}).click();
  const link=await page.getByLabel('Invitation link',{exact:true}).inputValue();const context=await browser.newContext();const invited=await context.newPage();
  await invited.goto(link);await invited.getByLabel('Full name',{exact:true}).fill('Invited viewer');await invited.getByLabel('Password',{exact:true}).fill(password);await invited.getByRole('button',{name:'Create account and join',exact:true}).click();
  await expect(invited.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();await expect(invited.getByRole('navigation',{name:'Main',exact:true}).getByRole('link',{name:'Transactions'})).toHaveCount(0);
  await expect(invited.getByRole('button',{name:'Add transaction',exact:true})).toHaveCount(0);await expect(invited.locator('.role-note')).toContainText('Viewer access');
  await invited.goto(link);await expect(invited.getByText(/invitation has expired or has already been used/)).toBeVisible();await context.close();
});
test('mobile navigation and entry work without page overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await demo(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.getByRole('button',{name:'Add transaction',exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await navigate(page,'Transactions');expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText(/Page 2 of 3/)).toBeVisible();
  await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('reduced motion keeps insights visible and keyboard search reaches records',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await demo(page);await expect(page.locator('.chart')).toHaveAttribute('data-live-running','false');await expect(page.getByRole('button',{name:'Resume insights',exact:true})).toBeDisabled();
  await page.keyboard.press('Control+k');await expect(page.getByRole('textbox',{name:'Search transactions',exact:true})).toBeFocused();
});
