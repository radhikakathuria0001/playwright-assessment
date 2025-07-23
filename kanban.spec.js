const { test, expect } = require('@playwright/test');


test('edit a Kanban card: complete subtask and move card to first column', async ({ page }) => {
  /*
    1. Navigate to the Kanban app
  */
  await page.goto('https://kanban-566d8.firebaseapp.com/');

  /*
    2. Find all columns using section.min-w-[280px].box-content
  */
  const columns = await page.$$('section.min-w-\\[280px\\].box-content');
  const nonFirstColumns = columns.slice(1);
  let targetCard, targetCardTitle, targetColumnIndex;
  for (let i = 0; i < nonFirstColumns.length; i++) {
    const cards = await nonFirstColumns[i].$$('article.group.flex.flex-col.bg-white.dark\\:bg-dark-grey.p-4.rounded-lg.cursor-pointer.shadow-task.max-w-\\[280px\\]');
    for (const card of cards) {
      // Get card title
      const cardTitleElem = await card.$('h3');
      const cardTitle = (await cardTitleElem.innerText()).trim();
      // Click the card to open details
      await card.click();
      await page.waitForSelector('.flex.flex-col.gap-2', { state: 'visible', timeout: 5000 });
      const popup = await page.$('.p-5.pr-3.flex.flex-col.gap-6.max-h-\\[90vh\\].overflow-y-auto');
      const subtaskList = await popup.$('.flex.flex-col.gap-2');
      if (subtaskList) {
        const subtaskLabels = await subtaskList.$$('label');
        let foundIncomplete = false;
        for (const label of subtaskLabels) {
          const checkbox = await label.$('input[type="checkbox"]');
          const checked = await checkbox.isChecked();
          if (!checked) {
            targetCard = card;
            targetCardTitle = cardTitle;
            targetColumnIndex = i + 1;
            foundIncomplete = true;
            break;
          }
        }
        if (foundIncomplete) break;
        // Close details if not the right card\
        await page.mouse.click(0, 0);
      }
    }
    if (targetCard) break;
  }
  expect(targetCard).toBeTruthy();

  /*
    3. Complete one subtask (click the first incomplete subtask's label)
  */
  const popup = await page.$('.p-5.pr-3.flex.flex-col.gap-6.max-h-\\[90vh\\].overflow-y-auto');
  const subtaskList = await popup.$('.flex.flex-col.gap-2');
  const subtaskLabels = await subtaskList.$$('label');
  let completedLabel;
  for (const label of subtaskLabels) {
    const checkbox = await label.$('input[type="checkbox"]');
    const checked = await checkbox.isChecked();
    // Ensure the checkbox is not hidden
    const isVisible = await checkbox.isVisible();
    expect(isVisible).toBe(true);
    if (!checked) {
      await label.click();
      completedLabel = label;
      break;
    }
  }
  expect(completedLabel).toBeTruthy();
  /*
    3b. Verify the subtask is visually completed (bg-main-purple and checkmark image)
  */
  const boxDiv = await completedLabel.$('div.h-4.w-4');
  const boxClass = await boxDiv.getAttribute('class');
  expect(boxClass).toContain('bg-main-purple');
  const checkImg = await boxDiv.$('img[src*="icon-check"]');
  expect(checkImg).toBeTruthy();

  /*
    4. Move task to the first column by selecting the first column's value in the dropdown
  */
  const dropdowns = await page.$$('div[tabindex="1"].cursor-pointer');
  const dropdown = dropdowns[dropdowns.length - 1]; // Use the last one, which should be the active modal's dropdown
  await dropdown.waitForElementState('visible', { timeout: 5000 });
  expect(dropdown).toBeTruthy();
  await dropdown.click();
  // Get the first column's name from its header
  const firstColumnHeader = await columns[0].$('h2');
  const firstColumnNameComplete = (await firstColumnHeader.innerText()).trim();
  const firstColumnName = firstColumnNameComplete.replace(/ \( \d+ \)$/, '').trim();
  // Select the dropdown option matching the first column's name, scoped to the popup
  const options = await popup.$$('div.p-4.text-medium-grey');
  for (const option of options) {
    const text = (await option.innerText()).trim();
    if (text.toLowerCase() === firstColumnName.toLowerCase()) {
      await option.click();
      break;
    }
  }
  // Click outside to close the popup
  await page.mouse.click(0, 0);


  /*
    5a. Verify the card is not present in its original column after being moved
  */
    const originalColumn = columns[targetColumnIndex];
    const cardsInOriginalColumn = await originalColumn.$$('article.group.flex.flex-col.bg-white.dark\\:bg-dark-grey.p-4.rounded-lg.cursor-pointer.shadow-task.max-w-\\[280px\\]');
    let stillPresent = false;
    for (const card of cardsInOriginalColumn) {
      const cardTitleElem = await card.$('h3');
      const cardTitle = (await cardTitleElem.innerText()).trim();
      if (cardTitle === targetCardTitle) {
        stillPresent = true;
        break;
      }
    }
    expect(stillPresent).toBe(false);

  /*
    5. Wait for the card to move and verify it is now in the first column
  */
  await page.waitForTimeout(1000);
  const cardsInFirstColumn = await columns[0].$$('article.group.flex.flex-col.bg-white.dark\\:bg-dark-grey.p-4.rounded-lg.cursor-pointer.shadow-task.max-w-\\[280px\\]');
  let found = false;
  for (const card of cardsInFirstColumn) {
    const cardTitleElem = await card.$('h3');
    const cardTitle = (await cardTitleElem.innerText()).trim();
    if (cardTitle === targetCardTitle) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
}); 
