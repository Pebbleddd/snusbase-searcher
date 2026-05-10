import {parseFileDataForEmails} from "./utils/file.util";
import {DatabaseSearchResponse} from "./types/response.types";
import axios from "axios"
import "dotenv/config"
import {ConfigService} from "./config/ConfigService";
import {Config} from "./types/config.types";

async function main() {
  const config: Config = ConfigService.getInstance().getConfig();

  const uniqueEmails = await parseFileDataForEmails("./emails.txt");

  for (const uniqueEmail of uniqueEmails) {
    const {data} = await axios.post<DatabaseSearchResponse>("https://api.snusbase.com/data/search", {
      terms: [uniqueEmail], types: ["email"],
    }, {
      headers: {
        "Content-Type": "application/json", "Auth": config.apiKey
      },
    })

    if (!data) {
      console.error("Something went wrong sending post to /search")
    }
    console.log(data);
  }
}

main().then();