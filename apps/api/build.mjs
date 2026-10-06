// Bundles the API into dist/server.js.
// Workspace packages (@wcro/*) ship TypeScript source, so they are bundled in together with their
// own dependencies (e.g. zod), which pnpm does not expose to this app. Only Node built-ins and the
// dependencies declared in this package.json stay external and load from node_modules at runtime.
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { build } from "esbuild";

const { dependencies = {} } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const external = new Set(Object.keys(dependencies).filter((name) => !name.startsWith("@wcro/")));
const packageName = (spec) =>
  spec
    .split("/")
    .slice(0, spec.startsWith("@") ? 2 : 1)
    .join("/");

await rm("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/server.ts"],
  outfile: "dist/server.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
  plugins: [
    {
      name: "external-app-dependencies",
      setup(b) {
        b.onResolve({ filter: /^[^./]/ }, (args) =>
          isBuiltin(args.path) || external.has(packageName(args.path))
            ? { path: args.path, external: true }
            : undefined,
        );
      },
    },
  ],
});
