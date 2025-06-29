const API_KEY = process.env.YT_API_KEY;

const PLAYLISTS = {
  donghua: "PLbTlJpronU8_GMDGyQlawguePVZVNnxNO",
  news: "PLbTlJpronU89p4fsTtmbW_bNgcJonX2ae",
  anim3: "PLbTlJpronU8_-c2M_G7P4VwtBJTn1S0wk"
};

const DONGHUA_TITLES = [
  "Unusual News from the City of sky", "Heaven swallow", "Wukong", "Against the sky supreme",
  "Supreme god emperor", "Swallowed star", "Stellar transformations", "My senior brother is too strong",
  "Ten thousand worlds", "One hundred thousand years of Qi Training", "Martial master",
  "Spirit sword sovereign", "A will eternal", "Shrouding The Heavens", "immortal Doctor in Modern City",
  "Throne of seal", "Jade dynasty", "Embers", "The all devouring whale", "Perfect world",
  "Soul land 2", "Laid off demon", "Strongest upgrade", "Immortal ascension",
  "Battle through the heavens", "Tales of herding gods", "Renegade immortal", "Peerless soul",
  "mo-tian records", "lord of mysteries", "above the kingdom of god", "the all-devouring whale"
];

function titleMatches(title, keyword) {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export default async function handler(req, res) {
  const type = req.query.type;
  const playlistId = PLAYLISTS[type];
  if (!playlistId) return res.status(400).json({ error: "Invalid type." });

  let items = [], pageToken = "";
  try {
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}&key=${API_KEY}`;
      const data = await fetch(url).then(r => r.json());
      if (!data.items) break;
      items.push(...data.items);
      pageToken = data.nextPageToken || "";
    } while (pageToken);

    const added = new Set();
    const grouped = {};
    const mixed = [];
    const latest = items
      .filter(v => v.snippet?.resourceId?.videoId && v.snippet.publishedAt)
      .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt))
      .slice(0, 20);

    if (type === "donghua") {
      DONGHUA_TITLES.forEach(t => grouped[t] = []);
    }

    for (const v of items) {
      const title = v.snippet.title;
      const vid = v.snippet.resourceId.videoId;
      if (!title || !vid || added.has(vid)) continue;
      added.add(vid);

      if (type === "donghua") {
        let matched = false;
        for (const kw of DONGHUA_TITLES) {
          if (titleMatches(title, kw)) {
            grouped[kw].push(v);
            matched = true;
            break;
          }
        }
        if (!matched) mixed.push(v);
      } else {
        mixed.push(v);
      }
    }

    return res.status(200).json({
      latest,
      grouped: type === "donghua" ? grouped : {},
      mixed
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.toString() });
  }
}
