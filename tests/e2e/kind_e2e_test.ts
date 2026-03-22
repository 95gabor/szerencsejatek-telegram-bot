import { fromFileUrl } from "jsr:@std/path@1/from-file-url";
import { join } from "jsr:@std/path@1/join";

const repoRoot = fromFileUrl(new URL("../../", import.meta.url));

if (Deno.env.get("E2E_KIND") === "1") {
  Deno.test({
    name: "kind cluster e2e (scripts/kind-e2e.sh)",
    sanitizeOps: false,
    sanitizeResources: false,
  }, async () => {
    const scriptPath = join(repoRoot, "scripts", "kind-e2e.sh");
    const status = await new Deno.Command("bash", {
      args: [scriptPath],
      cwd: repoRoot,
    }).spawn().status;

    if (!status.success) {
      throw new Error(`kind e2e failed with exit code ${status.code}`);
    }
  });
}
