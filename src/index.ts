import fs from "fs";
import path from "path";
import yaml from "js-yaml";

import { execute as execute_new } from "./old_api";

import { execute as execute_old } from "./new_api";

const config_path = path.join(__dirname, "../config.yaml");

const configs = yaml.safeLoad(
  fs.readFileSync(config_path).toString()
) as BuyConfig;

async function main() {
  execute_new(configs);
}
