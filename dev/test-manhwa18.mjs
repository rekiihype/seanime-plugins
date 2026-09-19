// Hits the live site through the actual provider code.
// Run: node dev/test-manhwa18.mjs   (needs Node >= 22.18 for TS type stripping)
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "plugins", "manhwa18", "provider.ts");
const tmp = join(here, ".provider.test.ts");

writeFileSync(tmp, readFileSync(src, "utf8") + "\nglobalThis.__Provider = Provider;\n");
try {
	await import(tmp);
} finally {
	rmSync(tmp);
}

// Seanime's fetch exposes text()/json() synchronously; Node's does not. Shim it.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
	const r = await realFetch(url, opts);
	const body = await r.text();
	return { ok: r.ok, status: r.status, statusText: r.statusText, text: () => body };
};

const p = new globalThis.__Provider();

const results = await p.search({ query: "secret class" });
assert.ok(results.length > 0, "search returned nothing");
assert.ok(results[0].id.startsWith("https://manhwa18.net/manga/"), "search id is not a manga URL");
console.log(`search: ${results.length} results, first = ${results[0].title}`);

const chapters = await p.findChapters(results[0].id);
assert.ok(chapters.length > 50, `only ${chapters.length} chapters`);
assert.ok(chapters[0].index === 0 && chapters.at(-1).index === chapters.length - 1, "indexes not ascending 0..n");
assert.ok(chapters.every((c) => c.chapter), "a chapter has no number");
assert.ok(chapters.at(-1).chapter !== chapters[0].chapter, "chapter numbers look identical");
console.log(`chapters: ${chapters.length}, ${chapters[0].title} -> ${chapters.at(-1).title}`);

const pages = await p.findChapterPages(chapters.at(-1).id);
assert.ok(pages.length > 0, "newest chapter has no pages");
assert.ok(pages.every((pg) => pg.url.startsWith("https://")), "a page URL is not absolute");
console.log(`pages: ${pages.length}, first = ${pages[0].url.slice(0, 60)}`);

console.log("OK");
