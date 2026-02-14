import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["../tests/frontend/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "../../types/nftables": new URL("./src/types/nftables.ts", import.meta.url).pathname,
    },
  },
});
