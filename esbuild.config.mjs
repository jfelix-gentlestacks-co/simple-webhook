import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  outfile: "main.js",
  platform: "browser",
  format: "cjs",
  target: "es2020",
  sourcemap: true,
  external: ["obsidian"]
});

if (isWatch) {
  await ctx.watch();
  console.log("[webhook-on-save] watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("[webhook-on-save] build complete.");
}
