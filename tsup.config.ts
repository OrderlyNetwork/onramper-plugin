import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2020",
  // minify: !options.watch,
  splitting: true,
  sourcemap: true,
  treeshake: true,
  clean: !options.watch,
  dts: true,
  tsconfig: "tsconfig.build.json",
  external: ["react", "react-dom", /\.css$/],
  esbuildOptions(esOptions, context) {
    if (!options.watch) {
      esOptions.drop = ["console", "debugger"];
    }
  },
}));
