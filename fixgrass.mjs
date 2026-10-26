import fs from "fs";
const path = "src/components/pixel.ts";
let s = fs.readFileSync(path, "utf8");
const start = s.indexOf("export const grassSprite:");
const end = s.indexOf("export const roadTextureSprite:", start);
if (start === -1 || end === -1) { console.log("nope"); process.exit(1); }
let chunk = s.slice(start, end);
chunk = chunk.replace('outlineToken: "var(--color-scene-outline)"', 'outlineToken: "var(--color-scene-grass-outline)"');
s = s.slice(0, start) + chunk + s.slice(end);
fs.writeFileSync(path, s);
console.log("done");
