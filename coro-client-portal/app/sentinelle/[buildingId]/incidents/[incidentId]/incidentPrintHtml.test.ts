import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeIncidentPrintHtml } from './incidentPrintHtml.ts';

test('neutralizes markup, event handlers and script delimiters', () => {
  assert.equal(
    escapeIncidentPrintHtml(`<img src=x onerror="alert('x')"><script>x</script>&`),
    '&lt;img src=x onerror=&quot;alert(&#039;x&#039;)&quot;&gt;&lt;script&gt;x&lt;/script&gt;&amp;',
  );
});

test('does not turn nullish values into executable markup', () => {
  assert.equal(escapeIncidentPrintHtml(undefined), '');
  assert.equal(escapeIncidentPrintHtml(null), '');
});
