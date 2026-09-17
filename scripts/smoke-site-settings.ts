import { validatePublicSiteSetting } from '../src/modules/site-settings/validation';

const validAnalytics = validatePublicSiteSetting('analytics', {
  gaId: 'G-ABC123XYZ',
  clarityId: 'abc123',
});
if (validAnalytics) throw new Error(validAnalytics);

const invalidAnalytics = validatePublicSiteSetting('analytics', {
  gaId: '<script>alert(1)</script>',
});
if (!invalidAnalytics) throw new Error('Expected invalid GA id to be rejected');

const validAds = validatePublicSiteSetting('ads', {
  enabled: true,
  adsenseClient: 'ca-pub-1234567890123456',
  slots: {
    gameTop: '1234567890',
    gameBottom: '0987654321',
  },
});
if (validAds) throw new Error(validAds);

const invalidAds = validatePublicSiteSetting('ads', {
  enabled: true,
  adsenseClient: 'javascript:alert(1)',
});
if (!invalidAds) throw new Error('Expected invalid AdSense client to be rejected');

const validSocial = validatePublicSiteSetting('social_links', [
  { name: 'YouTube', url: 'https://youtube.com/example' },
]);
if (validSocial) throw new Error(validSocial);

const invalidSocial = validatePublicSiteSetting('social_links', [
  { name: 'Bad', url: 'javascript:alert(1)' },
]);
if (!invalidSocial) throw new Error('Expected unsafe social URL to be rejected');

const validNavigation = validatePublicSiteSetting('navigation', [
  { label: 'Guides', href: '/guides' },
]);
if (validNavigation) throw new Error(validNavigation);

const invalidNavigation = validatePublicSiteSetting('navigation', [
  { label: 'Bad', href: 'javascript:alert(1)' },
]);
if (!invalidNavigation) {
  throw new Error('Expected unsafe navigation href to be rejected');
}

const protocolRelativeNavigation = validatePublicSiteSetting('navigation', [
  { label: 'Bad', href: '//evil.example.com' },
]);
if (!protocolRelativeNavigation) {
  throw new Error('Expected protocol-relative navigation href to be rejected');
}

console.log('Public site settings validation smoke passed');
