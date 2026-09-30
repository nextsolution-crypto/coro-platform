export const ORGANIZATION_360_TABS = Object.freeze([
  ['overview', 'Overview'], ['users', 'Users'], ['clients', 'Clients'], ['sites', 'Sites'],
  ['capabilities', 'Capabilities'], ['commercial', 'Commercial'], ['usage', 'Usage'],
  ['measurement', 'Measurement'],
  ['security', 'Security'], ['audit-events', 'Audit'],
]);

export const renderTabListForContract = () =>
  ORGANIZATION_360_TABS.map(([code, label]) => `<button data-tab="${code}">${label}</button>`).join('');
