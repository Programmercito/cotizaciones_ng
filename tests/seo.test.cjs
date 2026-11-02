const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const origin = 'https://dolarbolivia.org';
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('sitemap lists each indexable page once with its canonical URL', () => {
  const sitemap = read('public', 'sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const pages = fs.readdirSync(path.join(root, 'public'), { recursive: true })
    .filter((name) => name.endsWith('.html'))
    .map((name) => `${origin}/${name.split(path.sep).join('/')}`);

  assert.deepEqual(new Set(urls), new Set([`${origin}/`, ...pages]));
  assert.equal(urls.length, new Set(urls).size);
  assert.match(read('public', 'robots.txt'), /Sitemap: https:\/\/dolarbolivia\.org\/sitemap\.xml/);

  for (const url of urls) {
    const relative = new URL(url).pathname.slice(1);
    const html = relative ? read('public', ...relative.split('/')) : read('src', 'index.html');
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), url);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description"\s+content="[^"]+">/);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i);
  }
});

test('home page provides crawlable content and valid site structured data', () => {
  const html = read('src', 'index.html');
  const fallback = html.match(/<app-root>([\s\S]*?)<\/app-root>/)[1];
  assert.match(fallback, /<h1>Cotizaciones Bolivia<\/h1>/);
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  assert.ok(title.includes('Cotizaciones Bolivia'));
  assert.ok(html.includes(`<meta property="og:title" content="${title}">`));
  assert.ok(html.includes(`<meta name="twitter:title" content="${title}">`));
  assert.match(fallback, /dólar oficial/i);
  assert.match(fallback, /USDT/);
  assert.match(fallback, /bolivianos \(BOB\)/);
  assert.match(fallback, /href="\/guias\.html"/);
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const graph = JSON.parse(json)['@graph'];
  assert.ok(graph.some((item) => item['@type'] === 'WebSite' && item.url === `${origin}/`));
  assert.ok(graph.some((item) => item['@type'] === 'WebApplication' && item.url === `${origin}/`));
});

test('guides have a share image and a large social card', () => {
  for (const name of fs.readdirSync(path.join(root, 'public', 'guias'))) {
    if (!name.endsWith('.html')) continue;
    const html = read('public', 'guias', name);
    assert.ok(html.includes(`<meta property="og:image" content="${origin}/og-image.png">`), name);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  }
  const image = fs.readFileSync(path.join(root, 'public', 'og-image.png'));
  const home = read('src', 'index.html');
  assert.ok(home.includes(`<meta property="og:image:width" content="${image.readUInt32BE(16)}">`));
  assert.ok(home.includes(`<meta property="og:image:height" content="${image.readUInt32BE(20)}">`));
});

test('guide structured data matches the visible article and navigation', () => {
  for (const name of fs.readdirSync(path.join(root, 'public', 'guias'))) {
    if (!name.endsWith('.html')) continue;
    const html = read('public', 'guias', name);
    const title = html.match(/<h1>([^<]+)<\/h1>/)[1];
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    const graph = JSON.parse(json)['@graph'];
    const article = graph.find((item) => item['@type'] === 'Article');
    const breadcrumb = graph.find((item) => item['@type'] === 'BreadcrumbList');

    assert.equal(article.headline, title, name);
    assert.equal(article.mainEntityOfPage, `${origin}/guias/${name}`, name);
    assert.ok(html.includes(`Por el ${article.author.name}`), name);
    assert.equal(article.author.url, `${origin}/about.html`, name);
    assert.deepEqual(breadcrumb.itemListElement.map((item) => item.position), [1, 2, 3], name);
    assert.deepEqual(breadcrumb.itemListElement.map((item) => item.name), ['Inicio', 'Guías', title], name);
    assert.equal(breadcrumb.itemListElement[0].item, `${origin}/`, name);
    assert.equal(breadcrumb.itemListElement[1].item, `${origin}/guias.html`, name);
    assert.match(html, /<nav class="breadcrumbs"><a href="\/">Inicio<\/a> · <a href="\/guias\.html">Guías<\/a><\/nav>/);
  }
});

test('published SEO files match their sources and the home bundle exists', () => {
  assert.equal(read('docs', 'sitemap.xml'), read('public', 'sitemap.xml'));
  const pages = fs.readdirSync(path.join(root, 'public'), { recursive: true })
    .filter((name) => name.endsWith('.html'));
  for (const page of pages) {
    assert.equal(read('docs', page), read('public', page), page);
  }
  const source = read('src', 'index.html');
  const published = read('docs', 'index.html');
  assert.equal(published.match(/<title>([^<]+)<\/title>/)[1], source.match(/<title>([^<]+)<\/title>/)[1]);
  assert.match(published, /<base href="\/">/);
  assert.match(published, /<app-root>[\s\S]*?<h1>Cotizaciones Bolivia<\/h1>/);
  const bundle = published.match(/src="(main-[^"]+\.js)"/)[1];
  assert.ok(fs.existsSync(path.join(root, 'docs', bundle)), bundle);
});
