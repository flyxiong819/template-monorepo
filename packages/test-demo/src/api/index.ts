import { getConf } from "@sonoscape/base-lib";

export async function readConf() {
  return getConf('test.json');
}
