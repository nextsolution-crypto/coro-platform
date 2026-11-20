import { execFileSync } from "node:child_process";
import { loadApprovedRelease } from "../deploy/approved-immutable-release.mjs";

const SHA = /^[0-9a-f]{40}$/;

export function validateApplicationCommit(
  applicationCommit,
  { repository = process.cwd(), policyPath } = {},
) {
  if (!SHA.test(applicationCommit || "")) {
    throw new Error("APPLICATION_COMMIT_INVALID");
  }
  try {
    execFileSync(
      "git",
      ["cat-file", "-e", `${applicationCommit}^{commit}`],
      { cwd: repository, stdio: "ignore" },
    );
  } catch {
    throw new Error("APPLICATION_COMMIT_UNKNOWN");
  }
  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", applicationCommit, "HEAD"],
      { cwd: repository, stdio: "ignore" },
    );
  } catch {
    throw new Error("APPLICATION_COMMIT_NOT_ANCESTOR");
  }
  return loadApprovedRelease(applicationCommit, policyPath);
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  try {
    validateApplicationCommit(process.argv[2]);
    process.stdout.write("demo-report-application-commit=PASS\n");
  } catch (error) {
    process.stderr.write(
      `demo-report-application-commit=FAIL code=${error.message}\n`,
    );
    process.exitCode = 1;
  }
}
