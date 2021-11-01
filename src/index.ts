/// <reference path="../types/interface.d.ts" />

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// The "functionId" category api
import { execute as execute_old } from "./old_api";

// The parse html category api
import { execute as execute_new } from "./new_api";

const config_path = path.join(__dirname, "../config.yaml");

enum ApiType {
  Old,
  New,
}

const type: ApiType = ApiType.New;

const configs = yaml.safeLoad(
  fs.readFileSync(config_path).toString()
) as BuyConfig;

async function main() {
  switch (type) {
    case ApiType.Old:
      execute_old(configs);
      break;
    case ApiType.New:
      execute_new(configs);
      break;
    default:
      throw new Error("Unknown api type.");
  }
}

main();
