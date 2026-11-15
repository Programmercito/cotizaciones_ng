const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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

test('every page has consistent navigation and sitemap pages are reachable from home', () => {
  const paths = [...read('public', 'sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname);
  const menuPaths = [
    '/', '/guias.html', '/preguntas-frecuentes.html', '/contact.html',
    '/about.html', '/privacy-policy.html', '/terms-of-service.html',
  ];
  const links = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
    .map((match) => new URL(match[1], origin))
    .filter((url) => url.origin === origin)
    .map((url) => url.pathname);
  const home = read('src', 'index.html');
  const homeMenu = read('src', 'app', 'app.component.html')
    .match(/<nav class="footer__legal"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(homeMenu, 'home navigation');
  assert.deepEqual(links(homeMenu[1]), menuPaths);
  const fallbackMenu = home.match(/<nav aria-label="Información del sitio">([\s\S]*?)<\/nav>/);
  assert.ok(fallbackMenu, 'home fallback navigation');
  assert.deepEqual(links(fallbackMenu[1]), menuPaths);

  const pages = new Map([['/', home]]);
  for (const pathname of paths.filter((value) => value !== '/')) {
    const html = read('public', ...pathname.slice(1).split('/'));
    const header = html.match(/<header class="site-header">([\s\S]*?)<\/header>/);
    const footer = html.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/);
    assert.ok(header, `header missing: ${pathname}`);
    assert.ok(footer, `footer missing: ${pathname}`);
    assert.ok(html.indexOf(header[0]) < html.indexOf('<h1>'), pathname);
    assert.ok(html.indexOf(footer[0]) > html.indexOf('<h1>'), pathname);
    assert.ok(links(header[1]).includes('/'), pathname);
    const menu = footer[1].match(/<nav class="site-nav" aria-label="Navegación del sitio">([\s\S]*?)<\/nav>/);
    assert.ok(menu, `footer navigation missing: ${pathname}`);
    assert.deepEqual(links(menu[1]), menuPaths, pathname);
    pages.set(pathname, html);
  }

  const visited = new Set();
  const pending = ['/'];
  while (pending.length) {
    const pathname = pending.shift();
    if (visited.has(pathname)) continue;
    visited.add(pathname);
    for (const target of links(pages.get(pathname))) {
      if (pages.has(target) && !visited.has(target)) pending.push(target);
    }
  }
  assert.deepEqual(new Set(paths.filter((pathname) => !visited.has(pathname))), new Set());
});

test('static pages request the current stylesheet version', () => {
  const stylesheet = fs.readFileSync(path.join(root, 'public', 'assets', 'page.css'));
  const hash = crypto.createHash('sha256').update(stylesheet).digest('hex').slice(0, 12);
  const pages = fs.readdirSync(path.join(root, 'public'), { recursive: true })
    .filter((name) => name.endsWith('.html'));
  for (const page of pages) {
    assert.ok(read('public', page).includes(`href="/assets/page.css?v=${hash}"`), page);
  }
});

test('home page provides crawlable content and valid site structured data', () => {
  const html = read('src', 'index.html');
  const fallback = html.match(/<app-root>([\s\S]*?)<\/app-root>/)[1];
  assert.match(fallback, /<h1>Cotizaciones Bolivia<\/h1>/);
  assert.match(fallback, /<main class="fallback">/);
  assert.match(fallback, /<noscript><p>Activá JavaScript/);
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

test('guide articles do not repeat substantial paragraphs', () => {
  const paragraphs = new Map();
  for (const name of fs.readdirSync(path.join(root, 'public', 'guias'))) {
    if (!name.endsWith('.html')) continue;
    const html = read('public', 'guias', name);
    const article = html.slice(html.indexOf('<h1>'), html.indexOf('<div class="disclaimer">'));
    for (const match of article.matchAll(/<p(?!\s+class="article-meta")[^>]*>([\s\S]*?)<\/p>/g)) {
      const text = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length < 70) continue;
      assert.ok(!paragraphs.has(text), `${name} repeats a paragraph from ${paragraphs.get(text)}`);
      paragraphs.set(text, name);
    }
  }
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
    assert.match(article.dateModified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(html.includes(`<time datetime="${article.dateModified}">`), name);
    assert.ok(read('public', 'sitemap.xml').includes(`<loc>${origin}/guias/${name}</loc><lastmod>${article.dateModified}</lastmod>`), name);
    assert.deepEqual(breadcrumb.itemListElement.map((item) => item.position), [1, 2, 3], name);
    assert.deepEqual(breadcrumb.itemListElement.map((item) => item.name), ['Inicio', 'Guías', title], name);
    assert.equal(breadcrumb.itemListElement[0].item, `${origin}/`, name);
    assert.equal(breadcrumb.itemListElement[1].item, `${origin}/guias.html`, name);
    assert.match(html, /<nav class="breadcrumbs"><a href="\/">Inicio<\/a> · <a href="\/guias\.html">Guías<\/a><\/nav>/);
  }
});

test('FAQ structured data matches the visible questions and answers', () => {
  const html = read('public', 'preguntas-frecuentes.html');
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const faq = JSON.parse(json);
  const text = (value) => value.replace(/<[^>]*>/g, '').replace(/&#64;/g, '@').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const visible = [...html.matchAll(/<div class="faq-item">\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g)];
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal(faq.mainEntity.length, visible.length);
  for (const [index, item] of faq.mainEntity.entries()) {
    assert.equal(item.name, text(visible[index][1]));
    assert.equal(item.acceptedAnswer.text, text(visible[index][2]));
  }
});

test('AdSense publisher matches ads.txt', () => {
  const html = read('src', 'index.html');
  const publisher = html.match(/adsbygoogle\.js\?client=ca-(pub-\d+)/)[1];
  assert.ok(read('public', 'ads.txt').split(/\r?\n/).some((line) =>
    line.trim() === `google.com, ${publisher}, DIRECT, f08c47fec0942fa0`));
  for (const name of fs.readdirSync(path.join(root, 'public', 'guias'))) {
    if (!name.endsWith('.html')) continue;
    const guide = read('public', 'guias', name);
    const scripts = [...guide.matchAll(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-(pub-\d+)" crossorigin="anonymous"><\/script>/g)];
    assert.equal(scripts.length, 1, name);
    assert.equal(scripts[0][1], publisher, name);
  }
});

test('published SEO files match their sources and the home bundle exists', () => {
  assert.equal(read('docs', 'sitemap.xml'), read('public', 'sitemap.xml'));
  assert.equal(read('docs', 'ads.txt'), read('public', 'ads.txt'));
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
