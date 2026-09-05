import test from 'node:test';
import assert from 'node:assert/strict';
import { getSiteOrigin, pageMetadata, sitePages, privateRoutes } from '../src/lib/site-metadata.ts';

test('origin rejects malformed or credential-bearing URLs and only accepts a root URL', () => {
  for(const value of ['', 'abc', 'javascript:alert(1)', 'https://user:pass@example.org', 'https://example.org/app', 'https://example.org/?a=1', 'https://example.org/#frag']) assert.equal(getSiteOrigin(value), null);
  assert.equal(getSiteOrigin('https://example.org').origin, 'https://example.org');
});

test('route metadata uses unique titles, canonical public pages and non-indexed personal tools', () => {
  const previous=process.env.NEXT_PUBLIC_SITE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(pageMetadata('/', ...sitePages['/']).alternates, undefined);
    process.env.NEXT_PUBLIC_SITE_URL='https://example.org';
    const titles=new Set();
    for(const [path,copy] of Object.entries(sitePages)) {
      const metadata=pageMetadata(path,...copy);
      titles.add(metadata.title);
      assert.equal(metadata.robots.index,!privateRoutes.has(path));
      if(!privateRoutes.has(path))assert.equal(metadata.alternates.canonical,new URL(path,'https://example.org').href);
      assert.match(metadata.openGraph.images[0].url, /^https:\/\/example\.org\//);
    }
    assert.equal(titles.size,Object.keys(sitePages).length);
  } finally { if(previous === undefined)delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL=previous; }
});
