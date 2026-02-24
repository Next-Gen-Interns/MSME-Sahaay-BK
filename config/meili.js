// config/meili.js
import { MeiliSearch } from "meilisearch";

const meiliClient = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: "msmeMasterKey123",
});

export default meiliClient;
