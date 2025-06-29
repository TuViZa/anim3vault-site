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
  "Spirit sword sovereign", "A will eternal", "Shrouding The Heavens", "The immortal Doctor in Modern City",
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
  if (!playlistId) return res.status(400).json({ error: 'Invalid playlist type.' });

  let items = [], pageToken = '';
  try {
    do {
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}&key=${API_KEY}`);
      const data = await ytRes.json();
      if (!data.items) break;
      items.push(...data.items);
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    const addedIds = new Set();
    const grouped = {};
    const mixed = [];
    const latest = [];

    for (let keyword of DONGHUA_TITLES) {
      grouped[keyword] = [];
    }

    for (let v of items) {
      const snippet = v.snippet;
      const title = snippet?.title || "";
      const id = snippet?.resourceId?.videoId;
      if (!title || !id || title.toLowerCase().includes("deleted") || title.toLowerCase().includes("private") || addedIds.has(id)) continue;

      let matched = false;
      if (type === "donghua") {
        for (let keyword of DONGHUA_TITLES) {
          if (titleMatches(title, keyword)) {
            grouped[keyword].push(v);
            matched = true;
            break;
          }
        }
      }

      if (!matched) mixed.push(v);
      addedIds.add(id);
    }

    if (type === "anim3" || type === "donghua") {
      latest.push(...[...items]
        .filter(v => v.snippet?.publishedAt && v.snippet?.resourceId?.videoId)
        .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt))
        .slice(0, 20));
    }

    return res.status(200).json({ latest, grouped, mixed });

  } catch (e) {
    console.error("Fetch error:", e);
    return res.status(500).json({ error: e.message });
  }
}
