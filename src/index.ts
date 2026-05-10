import {parseFileDataForEmails} from "./utils/file-util";

async function main() {
  const uniqueEmails = await parseFileDataForEmails("./emails.txt");
  for (const uniqueEmail of uniqueEmails) {
    console.log(uniqueEmail);
  }
}

main().then();