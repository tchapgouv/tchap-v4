/**
 * Writes the files in tchap-infra that you need to create a deployment.
 *
 * Usage : node scripts/tchap/deployment/writeReleaseConfigFiles.js --current=4.3.9 --new=4.3.9 --beta=4.3.10
 * [--tchapInfraDir="../tchap-infra"] [--githubBranch="tchap-web-deploy-4.3.10-to-beta"]
 *
 * Don't run it too many times because the github api will block you :facepalm: Waiting will get you unblocked.
 *
 * Todo :
 *  - use token to avoid being throttled
 *  - create the pr !
 */

const fs = require('fs');

const fetchReleaseDetails = require('./fetchReleaseDetails').fetchReleaseDetails;

if (process.argv.length < 5) {
  console.error('Expected arguments like : --current=4.1.2 --new=4.1.3 --beta=4.1.4 [tchapInfraDir="../tchap-infra"]');
  process.exit(1);
}
const versions = {};
let tchapInfraDir = "../tchap-infra"; // default
const date = new Date();
let githubBranch = "deploy-tchap-web-" + date.getFullYear() + (date.getMonth() + 1) + date.getDate(); // default
process.argv.slice(2).forEach((arg) => {
  const parts = arg.split("--")[1].split("=")
  if (parts[0] === "tchapInfraDir") {
    tchapInfraDir = parts[1]
    if (tchapInfraDir.endsWith("/")) {
      tchapInfraDir = tchapInfraDir.slice(0, -1);
    }
  } else if (parts[0] === "githubBranch") {
    githubBranch = parts[1];
  } else {
    versions[parts[0]] = parts[1];
  }
});
console.log('Found versions:', versions);
console.log('Using tchapInfraDir :', tchapInfraDir);
console.log('Using githubBranch :', githubBranch);
// todo maybe a bit more input validation...

/*
 * String looks like :
---
current_version: 4.3.fas
current_version_zip_date: 202310fda

new_version: 4.3.asdf
new_version_zip_date: 2023100sdf

beta_version: 4.3safd
beta_version_zip_date: 202310sdf
 */
const prepareStringToWrite = async (versions) => {
  let stringToWrite = "---\n";

  for (const [cookieName, version] of Object.entries(versions)) {
    // cookieName = e.g. current
    // version = e.g. 4.3.10
    const releaseDetails = await fetchReleaseDetails(version)
    const date = releaseDetails[0].date;
    // Note : we fetch too much detail, now that we simplified the string to write...
    // Still leaving it in case we need it.

    stringToWrite += cookieName + "_version: " + version + "\n";
    stringToWrite += cookieName + "_version_zip_date: " + date + "\n\n";
  }
  return stringToWrite;
};

// env = e.g. "preprod"
const writeFileForEnv = (envName, stringToWrite) => {
  const fileToWrite = tchapInfraDir + "/ansible/inventory-" + envName + "/group_vars/webserver/vars";
  const fileContents = fs.readFileSync(fileToWrite, 'utf8'); // store existing contents into a var
  // Write our new piece
  fs.writeFileSync(fileToWrite, stringToWrite, err => {
    if (err) {
      console.error(err);
    }
  });
  // rewrite the existing contents, without the first 9 lines.
  const lines = fileContents.split('\n');
  lines.splice(0, 9);
  const toWrite = lines.join('\n');
  fs.appendFileSync(fileToWrite, toWrite, err => {
    if (err) {
      console.error(err);
    }
  });
};

prepareStringToWrite(versions).then(stringToWrite => {
  for (const envName of ["prod", "preprod", "dev"]) {
    writeFileForEnv(envName, stringToWrite);
  }

  /*
    // WIP
    require("child_process").execSync(`./scripts/tchap/open-deployment-pr.sh ${tchapInfraDir} ${githubBranch}`, {
      env: process.env,
      stdio: ["inherit", "inherit", "inherit"],
    });
  */
});


