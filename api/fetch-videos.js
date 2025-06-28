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

async function fetchAll(playlistId) {
  let results = [];
  let page = '';
  while (true) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${page}&key=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.items) break;
    results.push(...json.items);
    if (!json.nextPageToken) break;
    page = json.nextPageToken;
  }
  return results.filter(isValid);
}

function matchTitle(title, keyword) {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export default async function handler(req, res) {
  const { type = 'donghua' } = req.query;
  const playlistId = PLAYLISTS[type];
  if (!playlistId) return res.status(400).json({ error: "Invalid playlist type." });

  try {
    const videos = await fetchAll(playlistId);
    const seen = new Set();

    if (type === 'anim3') {
      const unique = videos.filter(v => {
        const id = v.snippet.resourceId.videoId;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      return res.status(200).json({ mixed: unique });
    }

    const grouped = {}, mixed = [];

    for (let keyword of DONGHUA_TITLES) grouped[keyword] = [];

    for (let v of videos) {
      const id = v.snippet.resourceId.videoId;
      const title = v.snippet.title;
      if (seen.has(id)) continue;

      let added = false;
      for (let keyword of DONGHUA_TITLES) {
        if (matchTitle(title, keyword)) {
          grouped[keyword].push(v);
          added = true;
          break;
        }
      }
      if (!added) mixed.push(v);
      seen.add(id);
    }

    return res.status(200).json({ grouped, mixed });
  } catch (err) {
    console.error("API fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch videos." });
  }
}
