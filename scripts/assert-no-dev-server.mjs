import { execFileSync } from "node:child_process";

if (process.env.CI || process.env.NETLIFY || process.env.NEXT_ALLOW_BUILD_WITH_DEV === "1") {
  process.exit(0);
}

try {
  const pids = execFileSync("lsof", ["-ti", "tcp:3000"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (pids.length > 0) {
    console.error(
      [
        "Refusing to run `next build` while localhost:3000 is in use.",
        "Next dev and Next build both write to `.next`; running them together causes stale chunks and 404s.",
        `Stop the dev server first: kill ${pids.join(" ")}`,
        "Then run: npm run build:clean",
      ].join("\n"),
    );
    process.exit(1);
  }
} catch {
  process.exit(0);
}
