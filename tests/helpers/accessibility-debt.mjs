import { isDeepStrictEqual } from 'node:util';

// Keep rule, target and measured failure data; omit prose/HTML and incidental node order.
// A new violation on an old selector, or worse contrast on both shared views, must fail.
export function accessibilityFindings(violations) {
  return violations.flatMap(issue => issue.nodes.map(node => ({
    id: issue.id,
    impact: node.impact,
    target: node.target,
    ...Object.fromEntries(['any', 'all', 'none'].map(kind => [kind,
      node[kind].map(check => ({ id: check.id, data: check.data }))
    ]))
  })));
}

export function unexpectedAccessibilityFindings(violations, recordedDebt) {
  return accessibilityFindings(violations).filter(finding =>
    !recordedDebt.some(known => isDeepStrictEqual(finding, known)));
}
