const WORDS = [
  "ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF",
  "HOTEL", "INDIA", "JULIET", "KILO", "LIMA", "MIKE", "NOVEMBER",
  "OSCAR", "PAPA", "QUEBEC", "ROMEO", "SIERRA", "TANGO", "UNIFORM",
  "VICTOR", "WHISKEY", "XRAY", "YANKEE", "ZULU",
  "STORM", "RIVER", "FALCON", "WOLF", "HAWK", "RAVEN", "STONE",
  "IRON", "SILVER", "GOLD", "SWIFT", "TITAN",
];

function pick(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

/** Returns a phrase like "DELTA-STORM-42-ECHO" */
export function generateOverridePhrase(): string {
  const num = Math.floor(Math.random() * 99) + 1;
  return `${pick()}-${pick()}-${num}-${pick()}`;
}
