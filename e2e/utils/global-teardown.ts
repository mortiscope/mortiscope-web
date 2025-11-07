import { existsSync, unlinkSync } from "fs";

/**
 * Executes cleanup operations after the entire test suite has finished running.
 */
async function globalTeardown() {
  // Check if the current execution environment is a Continuous Integration (CI) server.
  if (process.env.CI) {
    // Define the list of sensitive authentication state files generated during the test run.
    const authFiles = [
      "e2e/.auth/credential-user.json",
      "e2e/.auth/oauth-user.json",
      "e2e/.auth/two-factor-user.json",
    ];

    // Iterate through the array of file paths to remove stored credentials.
    for (const file of authFiles) {
      // Determine if the specific authentication file exists on the local file system.
      if (existsSync(file)) {
        // Delete the file to ensure no session data persists on the CI runner.
        unlinkSync(file);
        // Log the successful removal of the authentication file for debugging purposes.
        console.log(`[teardown] Cleaned up auth file: ${file}`);
      }
    }
  }

  // Signal that the global teardown process has finalized all cleanup tasks.
  console.log("[teardown] Global teardown complete");
}

export default globalTeardown;
