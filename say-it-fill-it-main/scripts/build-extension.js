import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

async function runExtensionBuild() {
  console.log("🚀 Building MozhiFill AI Browser Extension...");
  const rootDir = process.cwd();
  const outDir = path.resolve(rootDir, "dist-extension");

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Build Popup UI (HTML + React app)
  console.log("📦 1/3 Compiling Popup UI...");
  await build({
    configFile: false,
    root: path.resolve(rootDir, "extension"),
    plugins: [react(), tailwindcss()],
    base: "./",
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: path.resolve(rootDir, "extension/popup.html"),
        },
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
  });

  // 2. Build Content Script (IIFE for isolated execution in webpage)
  console.log("📦 2/3 Compiling Content Script...");
  await build({
    configFile: false,
    plugins: [],
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, "extension/src/content.ts"),
        name: "MozhiFillContentScript",
        formats: ["iife"],
        fileName: () => "content.js",
      },
      rollupOptions: {
        output: {
          extend: true,
        },
      },
    },
  });

  // 3. Build Background Service Worker
  console.log("📦 3/3 Compiling Background Service Worker...");
  await build({
    configFile: false,
    plugins: [],
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, "extension/src/background.ts"),
        formats: ["es"],
        fileName: () => "background.js",
      },
    },
  });

  // 4. Copy manifest.json, permission files, and icons
  console.log("📋 Copying manifest.json, permission files, and extension assets...");
  fs.copyFileSync(
    path.resolve(rootDir, "extension/manifest.json"),
    path.join(outDir, "manifest.json")
  );

  if (fs.existsSync(path.resolve(rootDir, "extension/permission.html"))) {
    fs.copyFileSync(
      path.resolve(rootDir, "extension/permission.html"),
      path.join(outDir, "permission.html")
    );
  }
  if (fs.existsSync(path.resolve(rootDir, "extension/permission.js"))) {
    fs.copyFileSync(
      path.resolve(rootDir, "extension/permission.js"),
      path.join(outDir, "permission.js")
    );
  }

  const iconsSrcDir = path.resolve(rootDir, "extension/icons");
  const iconsDestDir = path.join(outDir, "icons");
  if (fs.existsSync(iconsSrcDir)) {
    if (!fs.existsSync(iconsDestDir)) {
      fs.mkdirSync(iconsDestDir, { recursive: true });
    }
    const iconFiles = fs.readdirSync(iconsSrcDir);
    for (const f of iconFiles) {
      fs.copyFileSync(path.join(iconsSrcDir, f), path.join(iconsDestDir, f));
    }
  }

  console.log("✅ MozhiFill AI Browser Extension built successfully in /dist-extension!");
}

runExtensionBuild().catch((err) => {
  console.error("❌ Extension build failed:", err);
  process.exit(1);
});
