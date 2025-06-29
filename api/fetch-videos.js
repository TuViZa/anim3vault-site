const API_KEY = process.env.YT_API_KEY;

const PLAYLISTS = {
  donghua: "PLbTlJpronU8_GMDGyQlawguePVZVNnxNO",
  news: "PLbTlJpronU89p4fsTtmbW_bNgcJonX2ae",
  anim3: "PLbTlJpronU8_-c2M_G7P4VwtBJTn1S0wk"
};

const GROUP_KEYWORDS = {
  donghua: [
    "Unusual News from the City of sky", "Heaven swallow", "Wukong", "Against the sky supreme",
    "Supreme god emperor", "Swallowed star", "Stellar transformations", "My senior brother is too strong",
    "Ten thousand worlds", "One hundred thousand years of Qi Training", "Martial master",
    "Spirit sword sovereign", "A will eternal", "Shrouding The Heavens", "immortal Doctor in Modern City",
    "Throne of seal", "Jade dynasty", "Embers", "The all devouring whale", "Perfect world",
    "Soul land 2", "Laid off demon", "Strongest upgrade", "Immortal ascension",
    "Battle through the heavens", "Tales of herding gods", "Renegade immortal", "Peerless soul",
    "mo-tian records", "lord of mysteries", "above the kingdom of god", "the all-devouring whale"
  ],
  anim3: [
    "One Piece", "Bleach", "Jujutsu Kaisen", "Attack on Titan", "My Hero Academia",
    "Naruto", "Boruto", "Demon Slayer", "Chainsaw Man", "Black Clover",
    "Tokyo Revengers", "Solo Leveling", "Kaiju No. 8", "Wind Breaker", "Mashle"
  ]
};

function titleMatches(title, keyword) {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export default async function handler(req, res) {
  const { type = "donghua", pageToken = "" } = req.query;
  const playlistId = PLAYLISTS[type];
  if (!playlistId) return res.status(400).json({ error: 'Invalid playlist type.' });

  const items = [];
  let nextPageToken = pageToken;

  try {
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}&key=${API_KEY}`);
    const data = await ytRes.json();

    if (!data.items) throw new Error("No items found");

    items.push(...data.items);
    nextPageToken = data.nextPageToken || '';

    const addedIds = new Set();
    const grouped = {};
    const mixed = [];
    const latest = [];

    const keywords = GROUP_KEYWORDS[type] || [];

    if (keywords.length > 0) {
      for (const key of keywords) grouped[key] = [];
    }

    for (const v of items) {
      const { title = "", resourceId, publishedAt } = v.snippet || {};
      const id = resourceId?.videoId;
      if (!title || !id || title.toLowerCase().includes("deleted") || title.toLowerCase().includes("private") || addedIds.has(id)) continue;

      addedIds.add(id);

      let matched = false;
      for (const keyword of keywords) {
        if (titleMatches(title, keyword)) {
          grouped[keyword].push(v);
          matched = true;
          break;
        }
      }

      if (!matched) {
        mixed.push(v);
      }
    }

    latest.push(...items
      .filter(v => v.snippet?.publishedAt && v.snippet?.resourceId?.videoId)
      .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt))
      .slice(0, 20)
    );

    return res.status(200).json({
      grouped: keywords.length > 0 ? grouped : undefined,
      mixed: keywords.length === 0 ? items : mixed,
      latest,
      nextPage: nextPageToken
    });

  } catch (e) {
    console.error("Fetch error:", e);
    return res.status(500).json({ error: e.message });
  }
}
