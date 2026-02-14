/**
 * Custom CodeMirror 6 language support for nftables syntax.
 * Uses StreamLanguage for simplicity.
 */

import { StreamLanguage } from "@codemirror/language";

const NFT_KEYWORDS = new Set([
  "table", "chain", "rule", "set", "map", "type", "hook", "priority",
  "policy", "flags", "elements", "devices", "counter", "quota", "limit",
  "log", "prefix", "level", "group", "comment", "timeout", "size",
  "auto-merge", "flush", "ruleset", "add", "delete", "replace", "list",
  "flowtable", "meter", "include",
]);

const NFT_FAMILIES = new Set([
  "ip", "ip6", "inet", "arp", "bridge", "netdev",
]);

const NFT_CHAIN_TYPES = new Set(["filter", "nat", "route"]);

const NFT_HOOKS = new Set([
  "input", "output", "forward", "prerouting", "postrouting",
  "ingress", "egress",
]);

const NFT_VERDICTS_ACCEPT = new Set(["accept", "continue"]);
const NFT_VERDICTS_DROP = new Set(["drop", "reject"]);
const NFT_VERDICTS_JUMP = new Set(["jump", "goto", "return"]);

const NFT_PROTOCOLS = new Set([
  "tcp", "udp", "icmp", "icmpv6", "sctp", "dccp", "ah", "esp",
  "comp", "gre", "udplite",
]);

const NFT_META = new Set([
  "meta", "ct", "fib", "rt", "socket", "osf", "numgen",
]);

const NFT_STATEMENTS = new Set([
  "snat", "dnat", "masquerade", "redirect", "notrack", "queue",
  "dup", "fwd", "mangle",
]);

interface NftState {
  inComment: boolean;
  inString: boolean;
  inBlock: number;
}

export const nftLanguage = StreamLanguage.define<NftState>({
  startState: () => ({ inComment: false, inString: false, inBlock: 0 }),

  token(stream, state) {
    // Comments
    if (stream.match("#")) {
      stream.skipToEnd();
      return "lineComment";
    }

    // Strings
    if (stream.match('"')) {
      while (!stream.eol()) {
        if (stream.next() === '"') break;
      }
      return "string";
    }

    // Braces
    if (stream.match("{")) {
      state.inBlock++;
      return "brace";
    }
    if (stream.match("}")) {
      state.inBlock = Math.max(0, state.inBlock - 1);
      return "brace";
    }

    // Skip whitespace
    if (stream.eatSpace()) return null;

    // Numbers (hex and decimal)
    if (stream.match(/^0x[0-9a-fA-F]+/) || stream.match(/^\d+/)) {
      return "number";
    }

    // Operators
    if (stream.match(/^[!=<>]=?/) || stream.match(/^[.,:;\/]/)) {
      return "operator";
    }

    // Words
    if (stream.match(/^[a-zA-Z_@][\w\-]*/)) {
      const word = stream.current();

      if (NFT_KEYWORDS.has(word)) return "keyword";
      if (NFT_FAMILIES.has(word)) return "typeName";
      if (NFT_CHAIN_TYPES.has(word)) return "typeName";
      if (NFT_HOOKS.has(word)) return "attributeName";
      if (NFT_VERDICTS_ACCEPT.has(word)) return "bool";
      if (NFT_VERDICTS_DROP.has(word)) return "invalid";
      if (NFT_VERDICTS_JUMP.has(word)) return "labelName";
      if (NFT_PROTOCOLS.has(word)) return "className";
      if (NFT_META.has(word)) return "className";
      if (NFT_STATEMENTS.has(word)) return "function";

      // Common field names
      if (["dport", "sport", "saddr", "daddr", "state", "iifname", "oifname", "mark", "length"].includes(word)) {
        return "propertyName";
      }

      return "variableName";
    }

    // Skip unknown chars
    stream.next();
    return null;
  },
});
