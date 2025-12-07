import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
    serverDir: "./src",
    entry: "./src/index.ts",
    modules: ["workflow/nitro"],
});

