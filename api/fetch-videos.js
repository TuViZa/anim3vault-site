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

function matchTitle(title, keyword) {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

async function fetchAllVideos(playlistId) {
  const results = [];
  let nextPage = '';
  while (true) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPage}&key=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.items) break;
    results.push(...json.items);
    if (!json.nextPageToken) break;
    nextPage = json.nextPageToken;
  }

  return results.filter(v =>
    v.snippet &&
    v.snippet.title &&
    v.snippet.resourceId?.videoId &&
    !v.snippet.title.toLowerCase().includes("deleted") &&
    !v.snippet.title.toLowerCase().includes("private")
  );
}

export default async function handler(req, res) {
  try {
    const { type = 'donghua' } = req.query;
    const playlistId = PLAYLISTS[type];
    if (!playlistId) return res.status(400).json({ error: "Invalid playlist type" });

    const allVideos = await fetchAllVideos(playlistId);
    const added = new Set();

    // For flat playlists like "anim3"
    if (type === 'anim3') {
      const unique = allVideos.filter(v => {
        const id = v.snippet.resourceId.videoId;
        if (added.has(id)) return false;
        added.add(id);
        return true;
      });
      return res.status(200).json({ mixed: unique });
    }

    // For grouped playlists like "donghua" or "news"
    const grouped = {};
    const mixed = [];

    for (let title of DONGHUA_TITLES) {
      grouped[title] = [];
    }

    for (let v of allVideos) {
      const id = v.snippet.resourceId.videoId;
      const title = v.snippet.title;
      if (added.has(id)) continue;

      let matched = false;
      for (let groupTitle of DONGHUA_TITLES) {
        if (matchTitle(title, groupTitle)) {
          grouped[groupTitle].push(v);
          matched = true;
          break;
        }
      }

      if (!matched) mixed.push(v);
      added.add(id);
    }

    return res.status(200).json({ grouped, mixed });
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
