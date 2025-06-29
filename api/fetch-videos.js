const API_KEY = process.env.YT_API_KEY;

const PLAYLISTS = {
  anim3: "PLbTlJpronU8_-c2M_G7P4VwtBJTn1S0wk",
  donghua: "PLbTlJpronU8_GMDGyQlawguePVZVNnxNO",
  news: "PLbTlJpronU89p4fsTtmbW_bNgcJonX2ae"
};

const DONGHUA_TITLES = [
  "Unusual News from the City of sky", "Heaven swallow", "Wukong", "Against the sky supreme",
  "Supreme god emperor", "Swallowed star", "Stellar transformations", "My senior brother is too strong",
  "Ten thousand worlds", "One hundred thousand years of Qi Training", "Martial master",
  "Spirit sword sovereign", "A will eternal", "Shrouding The Heavens", "immortal Doctor in Modern City",
  "Throne of seal", "Jade dynasty", "Embers", "The all devouring whale", "Perfect worlds",
  "Soul land 2", "Laid off demon", "Strongest upgrade", "Immortal ascension",
  "Battle through the heavens", "Tales of herding gods", "Renegade immortal", "Peerless soul"
];

function titleMatches(title, keyword) {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export default async function handler(req, res) {
  const { type = "donghua" } = req.query;
  const playlistId = PLAYLISTS[type];
  if (!playlistId) return res.status(400).json({ error: 'Invalid type.' });

  let items = [], pgToken = "";
  try {
    do {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pgToken}&key=${API_KEY}`
      );
      const json = await resp.json();
      if (!json.items) break;
      items.push(...json.items);
      pgToken = json.nextPageToken || "";
    } while (pgToken);

    const added = new Set();
    const grouped = {};
    const mixed = [];
    const latest = [];

    for (const kw of DONGHUA_TITLES) grouped[kw] = [];

    for (const v of items) {
      const t = v.snippet?.title || "";
      const id = v.snippet?.resourceId?.videoId;
      if (!t || !id || /deleted|private/i.test(t) || added.has(id)) continue;

      let matched = false;
      if (type === "donghua") {
        for (const kw of DONGHUA_TITLES) {
          if (titleMatches(t, kw)) {
            grouped[kw].push(v);
            matched = true;
            break;
          }
        }
      }
      if (!matched) mixed.push(v);
      added.add(id);
    }

    if (type !== "news") {
      latest.push(...items
        .filter(v => v.snippet?.publishedAt)
        .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt))
        .slice(0, 20)
      );
    }

    return res.status(200).json({ grouped, mixed, latest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
