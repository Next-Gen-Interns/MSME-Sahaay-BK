// config/meili.js
import { MeiliSearch } from "meilisearch";

const meiliClient = new MeiliSearch({
  host: "http://127.0.0.1:7700",
  apiKey: "msmeMasterKey123",
});

export default meiliClient;