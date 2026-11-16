import { escapeIncidentHtml } from './incident-html';

describe('escapeIncidentHtml', () => {
  it('neutralizes hostile HTML used in notification templates', () => {
    expect(escapeIncidentHtml(`<svg onload="alert('x')">&`)).toBe(
      '&lt;svg onload=&quot;alert(&#039;x&#039;)&quot;&gt;&amp;',
    );
  });
});
