import { readFile, writeFile } from "fs/promises";
import { extname } from "path";
import { createHash } from "crypto";

import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import swc from "@swc/core";

const extensions = [".js", ".jsx", ".mjs", ".ts", ".tsx", ".cts", ".mts"];

/** @type import("rollup").InputPluginOption */
const plugins = [
  nodeResolve(),
  commonjs(),
  {
    name: "swc",
    async transform(code, id) {
      const ext = extname(id);
      if (!extensions.includes(ext)) return null;

      const ts = ext.includes("ts");
      const tsx = ts ? ext.endsWith("x") : undefined;
      const jsx = !ts ? ext.endsWith("x") : undefined;

      const result = await swc.transform(code, {
        filename: id,
        jsc: {
          externalHelpers: true,
          parser: {
            syntax: ts ? "typescript" : "ecmascript",
            tsx,
            jsx,
          },
        },
        env: {
          targets: "defaults",
          include: ["transform-classes", "transform-arrow-functions"],
        },
      });
      return result.code;
    },
  },
  esbuild({ minify: true }),
];

function vendettaGlobal(id) {
  if (!id.startsWith("@vendetta")) return null;
  return id.substring(1).replace(/\//g, ".");
}

const manifestPath = "./manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const buildMain = manifest.main;
const outPath = `./dist/index.js`;

try {
  const bundle = await rollup({
    input: `./${buildMain}`,
    external: (id) => id.startsWith("@vendetta"),
    onwarn: () => {},
    plugins,
  });

  await bundle.write({
    file: outPath,
    format: "iife",
    name: "__LocalMessagePreviewBundle",
    compact: true,
    exports: "named",
    globals: vendettaGlobal,
  });
  await bundle.close();

  let code = await readFile(outPath, "utf8");
  code = code.replace(/^\s*var\s+__LocalMessagePreviewBundle\s*=\s*/, "").trim();
  code = code.replace(/\s*;\s*$/, "");
  // Rollup leaves `function(...){...}(deps)` — wrap so `return (<expr>)` inside vendetta=>{} is valid (function expr + call).
  if (!code.startsWith("(")) code = `(${code})`;

  await writeFile(outPath, code);

  const toHash = await readFile(outPath);
  manifest.hash = createHash("sha256").update(toHash).digest("hex");
  manifest.main = "index.js";
  await writeFile(`./dist/manifest.json`, JSON.stringify(manifest, null, 2));

  console.log(`Built ${manifest.name} → dist/index.js (${manifest.hash.slice(0, 16)}…)`);
} catch (e) {
  console.error("Build failed:", e);
  process.exit(1);
}
