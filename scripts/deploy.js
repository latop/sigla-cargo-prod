import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, {
    stdio: "inherit",
    shell: true,
  });
}

function getAppVersion() {
  const changelogFile = readFileSync(
    new URL("../src/pages/Changelog.tsx", import.meta.url),
    "utf8"
  );

  const appVersionMatch = changelogFile.match(
    /export const APP_VERSION\s*=\s*["']([^"']+)["']/
  );

  if (appVersionMatch) {
    return appVersionMatch[1];
  }

  const firstChangelogVersionMatch = changelogFile.match(
    /version:\s*["']([^"']+)["']/
  );

  if (firstChangelogVersionMatch) {
    return firstChangelogVersionMatch[1];
  }

  return "sem-versao";
}

function hasStagedChanges() {
  try {
    execSync("git diff --cached --quiet", {
      stdio: "ignore",
      shell: true,
    });

    return false;
  } catch {
    return true;
  }
}

const version = getAppVersion();
const commitMessage = `Atualiza aplicação SIGLA Cargo - v${version}`;

run("npm run build");
run("git add .");

if (hasStagedChanges()) {
  run(`git commit -m "${commitMessage}"`);
} else {
  console.log("\nNada novo para commitar.");
}

run("git push origin main");