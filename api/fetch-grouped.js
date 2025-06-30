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
  "Throne of seal", "Jade dynasty", "Embers", "all-devouring whale", "Perfect world",
  "Soul land 2", "Laid off demon", "Strongest upgrade", "Immortal ascension",
  "Battle through the heavens", "Tales of herding gods", "Renegade immortal", "Peerless soul",
  "mo-tian records", "lord of mysteries", "above the kingdom of god"
];

// Normalize function for consistent comparison
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

export default async function handler(req, res) {
  const { type = "donghua" } = req.query;
  const playlistId = PLAYLISTS[type];
  if (!playlistId) return res.status(400).json({ error: 'Invalid playlist type.' });

  try {
    const allItems = await fetchAllVideos(playlistId);

    const addedIds = new Set();
    const grouped = {};
    const mixed = [];

    const titleMap = {}; // normalized -> original
    if (type === "donghua") {
      for (let keyword of DONGHUA_TITLES) {
        const key = normalize(keyword);
        grouped[key] = [];
        titleMap[key] = keyword;
      }
    }

    for (let v of allItems) {
      const title = v.snippet?.title || "";
      const id = v.snippet?.resourceId?.videoId;
      if (!title || !id || title.toLowerCase().includes("deleted") || title.toLowerCase().includes("private") || addedIds.has(id)) continue;

      const normalizedTitle = normalize(title);
      let matched = false;

      if (type === "donghua") {
        for (let keyword of DONGHUA_TITLES) {
          const key = normalize(keyword);
          if (normalizedTitle.includes(key)) {
            grouped[key].push(v);
            matched = true;
            console.log(`[MATCHED] "${title}" → "${keyword}"`);
            break;
          } else {
            console.log(`[NO MATCH] "${title}" ❌ "${keyword}"`);
          }
        }
      }

      if (!matched) {
        mixed.push(v);
        console.log(`[MIXED] "${title}"`);
      }

      addedIds.add(id);
    }

    if (type === "donghua") {
      const sortedGroups = Object.entries(grouped)
        .filter(([_, vids]) => vids.length > 0)
        .map(([key, vids]) => ({
          name: titleMap[key] || key,
          videos: vids.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt)),
          latestTime: Math.max(...vids.map(v => new Date(v.snippet.publishedAt).getTime()))
        }))
        .sort((a, b) => b.latestTime - a.latestTime);

      const sortedGrouped = {};
      for (const group of sortedGroups) {
        sortedGrouped[group.name] = group.videos;
      }

      return res.status(200).json({ grouped: sortedGrouped, mixed });
    }

    return res.status(200).json({ grouped: {}, mixed });

  } catch (e) {
    console.error("Grouped fetch error:", e);
    return res.status(500).json({ error: e.message });
  }
}

async function fetchAllVideos(playlistId) {
  let items = [], pageToken = '';
  do {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}&key=${API_KEY}`);
    const data = await res.json();
    if (!data.items) break;
    items.push(...data.items);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return items;
}
