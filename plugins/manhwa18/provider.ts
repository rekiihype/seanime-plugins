/// <reference path="../../typings/manga-provider.d.ts" />
/// <reference path="../../typings/core.d.ts" />

// @ts-ignore
class Provider {
	private base = "https://manhwa18.net";
	private headers = {
		"User-Agent": "Manhwa18 for Seanime/v1.0.0 (github.com/rekiihype/seanime-plugins)",
	};

	getSettings(): Settings {
		return {
			supportsMultiLanguage: false,
			supportsMultiScanlator: false,
		};
	}

	// Laravel/Inertia dumps the whole page state into data-page as HTML-escaped JSON.
	// Entities must be unescaped in this order (&amp; last) so literal "&lt;" survives.
	private props(html: string): any {
		const m = html.match(/data-page="([^"]+)"/);
		if (!m) throw new Error("manhwa18: data-page not found");
		const json = m[1]
			.replace(/&quot;/g, '"')
			.replace(/&#0?39;/g, "'")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&");
		return JSON.parse(json).props;
	}

	async search(opts: QueryOptions): Promise<SearchResult[]> {
		const res = await fetch(`${this.base}/tim-kiem?q=${encodeURIComponent(opts.query.trim())}`, {
			headers: this.headers,
		});
		if (!res.ok) throw new Error(res.statusText);

		const mangas: any[] = this.props(res.text()).mangas?.data ?? [];
		return mangas.map((m) => ({
			id: `${this.base}/manga/${m.slug}`,
			title: m.name,
			image: m.cover_url,
		}));
	}

	// The site returns chapters newest-first; the app expects ascending order.
	async findChapters(mangaId: string): Promise<ChapterDetails[]> {
		const res = await fetch(mangaId, { headers: this.headers });
		if (!res.ok) throw new Error(res.statusText);

		const chapters: any[] = this.props(res.text()).chapters ?? [];
		return chapters
			.slice()
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map((c, index) => ({
				id: `${mangaId}/${c.slug}`,
				url: `${mangaId}/${c.slug}`,
				title: c.name,
				chapter: (String(c.name).match(/\d+(?:\.\d+)?/) ?? [String(index + 1)])[0],
				index,
			}));
	}

	async findChapterPages(chapterId: string): Promise<ChapterPage[]> {
		const res = await fetch(chapterId, { headers: this.headers });
		if (!res.ok) throw new Error(res.statusText);

		const images: any[] = this.props(res.text()).chapterImages ?? [];
		return images.map((img, index) => ({
			url: String(img.src).startsWith("http") ? img.src : this.base + img.src,
			index,
			headers: { Referer: `${this.base}/` },
		}));
	}
}
