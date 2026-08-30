import { survivalVocab } from "./survival.js";
import { dailyVocab } from "./daily.js";
import { nativeVocab } from "./native.js";
import { expandedVocab } from "./expanded.js";
import { depthVocab } from "./depth.js";

export const allVocab = [...survivalVocab, ...dailyVocab, ...nativeVocab, ...expandedVocab, ...depthVocab];
