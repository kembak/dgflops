import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFile } from "music-metadata";

const folder = join(process.cwd(), "public", "music");
const output = join(process.cwd(), "src", "lib", "music-catalog.json");
const scopes = new Set(["lobby", "blackjack", "baccarat", "ultimate", "holdem", "omaha", "all"]);

await mkdir(folder, { recursive: true });
const files = (await readdir(folder)).filter((name) => /\.(mp3|m4a|ogg|wav)$/i.test(name)).sort();
const tracks = [];
for (const file of files) {
  const prefix = file.split("--", 1)[0].toLowerCase();
  const scope = scopes.has(prefix) ? prefix : "all";
  const fallback = file.replace(/\.[^.]+$/, "").replace(/^(lobby|blackjack|baccarat|ultimate|holdem|omaha|all)--/i, "").replace(/[-_]+/g, " ");
  try {
    const metadata = await parseFile(join(folder, file), { duration: false });
    const picture = metadata.common.picture?.[0];
    tracks.push({
      id: file,
      src: `/music/${encodeURIComponent(file)}`,
      scope,
      title: metadata.common.title?.trim() || fallback,
      artist: metadata.common.artist?.trim() || "DG Flops",
      image: picture ? `data:${picture.format};base64,${Buffer.from(picture.data).toString("base64")}` : null,
    });
  } catch (error) {
    console.warn(`Could not read metadata for ${file}:`, error.message);
    tracks.push({ id: file, src: `/music/${encodeURIComponent(file)}`, scope, title: fallback, artist: "DG Flops", image: null });
  }
}
await writeFile(output, `${JSON.stringify(tracks, null, 2)}\n`);
console.log(`Music catalog: ${tracks.length} track${tracks.length === 1 ? "" : "s"} from public/music`);
