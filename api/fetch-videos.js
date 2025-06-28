import fetch from 'node-fetch';

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

const isValid = (v) => (
  v?.snippet?.title &&
  !v.snippet.title.toLowerCase().includes("deleted") &&
  !v.snippet.title.toLowerCase().includes("private") &&
  v.snippet.resourceId?.videoId
);

function matchTitle(title, keyword) {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export default async function handler(req, res) {
  const { type = 'donghua', pageToken = '' } = req.query;
  const playlistId = PLAYLISTS[type];
  if (!playlistId) return res.status(400).json({ error: "Invalid playlist type." });

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlistId}&pageToken=${pageToken}&key=${API_KEY}`;
    const ytRes = await fetch(url);
    const json = await ytRes.json();

    if (!ytRes.ok || !json.items) {
      return res.status(500).json({ error: "YouTube API Error", details: json });
    }

    const items = json.items.filter(isValid);
    const nextPage = json.nextPageToken || null;
    const added = new Set();

    if (type === "anim3" || type === "news") {
      const unique = items.filter(v => {
        const id = v.snippet.resourceId.videoId;
        if (added.has(id)) return false;
        added.add(id);
        return true;
      });
      return res.status(200).json({ mixed: unique, nextPage });
    }

    // Group for Donghua
    const grouped = {};
    const mixed = [];

    for (let keyword of DONGHUA_TITLES) grouped[keyword] = [];

    for (let v of items) {
      const id = v.snippet.resourceId.videoId;
      const title = v.snippet.title;
      if (added.has(id)) continue;

      let addedToGroup = false;
      for (let keyword of DONGHUA_TITLES) {
        if (matchTitle(title, keyword)) {
          grouped[keyword].push(v);
          addedToGroup = true;
          break;
        }
      }
      if (!addedToGroup) mixed.push(v);
      added.add(id);
    }

    return res.status(200).json({ grouped, mixed, nextPage });
  } catch (err) {
    console.error("API fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch videos." });
  }
}
