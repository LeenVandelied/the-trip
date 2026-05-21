// Server-side GPX parsing.
// @we-gold/gpxjs uses the browser's DOMParser by default — provide @xmldom in Node.

import { parseGPXWithCustomParser } from "@we-gold/gpxjs";
import { DOMParser } from "xmldom-qsa";

export function parseGpxNode(content: string) {
  const parser = new DOMParser();
  return parseGPXWithCustomParser(content, (xml) =>
    parser.parseFromString(xml, "text/xml") as unknown as Document,
  );
}
