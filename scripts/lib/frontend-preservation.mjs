import { createHash } from 'node:crypto';

export function frontendDigest(path, bytes) {
  let value = bytes;
  if (/\.(?:html|css|svg)$/.test(path)) {
    value = bytes.toString('utf8').replace(/\r\n/g, '\n');
    if (path.endsWith('.html')) value = value
      .replace(/(\.(?:css|js))\?v=[a-f0-9]{16}/g, '$1')
      .replace(/(<!-- BUILD-INFO:START -->)[\s\S]*?(<!-- BUILD-INFO:END -->)/g, '$1$2');
  }
  return createHash('sha256').update(value).digest('hex');
}
