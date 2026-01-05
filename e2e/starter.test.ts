import { device, expect, element, by } from 'detox';

describe('App Launch', () => {
  beforeAll(async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'en-US',
        calendar: 'gregorian',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show the home screen with English text after launch', async () => {
    await expect(element(by.text('Home'))).toBeVisible();
    await expect(element(by.text('Gagyo'))).toBeVisible();
    await expect(element(by.text('Confirm'))).toBeVisible();
  });

  it('should show Korean text when device locale is Korean', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    await expect(element(by.text('홈'))).toBeVisible();
    await expect(element(by.text('가교'))).toBeVisible();
    await expect(element(by.text('확인'))).toBeVisible();
  });

  it('should have accessible button labels', async () => {
    const button = element(by.text('Confirm'));
    await expect(button).toBeVisible();
    await expect(button).toHaveLabel('Confirm');
  });
});
