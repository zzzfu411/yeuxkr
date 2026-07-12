import test from "node:test";
import assert from "node:assert/strict";

const { backspaceJamo, composeJamoInput, composeSyllable, decomposeSyllable, QWERTY_TO_JAMO } = await import("../src/lib/korean/jamo.ts");

test("composeSyllable builds blocks from jamo indices", () => {
  assert.equal(composeSyllable("ㄱ", "ㅏ"), "가");
  assert.equal(composeSyllable("ㅎ", "ㅏ", "ㄴ"), "한");
  assert.equal(composeSyllable("ㅇ", "ㅢ"), "의");
  assert.equal(composeSyllable("x", "ㅏ"), null);
});

test("decomposeSyllable splits blocks back into jamo", () => {
  assert.deepEqual(decomposeSyllable("값"), { cho: "ㄱ", jung: "ㅏ", jong: "ㅄ" });
  assert.deepEqual(decomposeSyllable("의"), { cho: "ㅇ", jung: "ㅢ", jong: "" });
  assert.equal(decomposeSyllable("a"), null);
  assert.equal(decomposeSyllable("ㄱ"), null);
});

test("composeJamoInput builds a syllable step by step", () => {
  let text = "";
  text = composeJamoInput(text, "ㄱ");
  assert.equal(text, "ㄱ");
  text = composeJamoInput(text, "ㅏ");
  assert.equal(text, "가");
  text = composeJamoInput(text, "ㅂ");
  assert.equal(text, "갑");
  text = composeJamoInput(text, "ㅅ");
  assert.equal(text, "값");
});

test("composeJamoInput merges compound vowels", () => {
  assert.equal(composeJamoInput("오", "ㅏ"), "와");
  assert.equal(composeJamoInput("우", "ㅓ"), "워");
  assert.equal(composeJamoInput("으", "ㅣ"), "의");
  assert.equal(composeJamoInput("ㅗ", "ㅣ"), "ㅚ");
  assert.equal(composeJamoInput("고", "ㅐ"), "괘");
});

test("composeJamoInput hands the final consonant to the next syllable before a vowel", () => {
  assert.equal(composeJamoInput("갑", "ㅏ"), "가바");
  assert.equal(composeJamoInput("값", "ㅏ"), "갑사");
  assert.equal(composeJamoInput("강", "ㅏ"), "가아");
  assert.equal(composeJamoInput("한국", "ㅓ"), "한구거");
});

test("composeJamoInput appends when no composition applies", () => {
  assert.equal(composeJamoInput("가", "ㄸ"), "가ㄸ");
  assert.equal(composeJamoInput("가", "ㅏ"), "가ㅏ");
  assert.equal(composeJamoInput("", "ㅏ"), "ㅏ");
  assert.equal(composeJamoInput("abc", "ㄱ"), "abcㄱ");
});

test("backspaceJamo peels one jamo at a time", () => {
  assert.equal(backspaceJamo("값"), "갑");
  assert.equal(backspaceJamo("갑"), "가");
  assert.equal(backspaceJamo("가"), "ㄱ");
  assert.equal(backspaceJamo("ㄱ"), "");
  assert.equal(backspaceJamo("과"), "고");
  assert.equal(backspaceJamo("ㅘ"), "ㅗ");
  assert.equal(backspaceJamo("의사"), "의ㅅ");
  assert.equal(backspaceJamo(""), "");
});

test("backspace inverts a full composition chain", () => {
  const target = "값";
  let text = "";
  for (const jamo of ["ㄱ", "ㅏ", "ㅂ", "ㅅ"]) text = composeJamoInput(text, jamo);
  assert.equal(text, target);
  const steps = [];
  while (text) {
    text = backspaceJamo(text);
    steps.push(text);
  }
  assert.deepEqual(steps, ["갑", "가", "ㄱ", ""]);
});

test("qwerty mapping covers the full two-set layout", () => {
  assert.equal(QWERTY_TO_JAMO.r, "ㄱ");
  assert.equal(QWERTY_TO_JAMO.R, "ㄲ");
  assert.equal(QWERTY_TO_JAMO.k, "ㅏ");
  assert.equal(QWERTY_TO_JAMO.O, "ㅒ");
  assert.equal(QWERTY_TO_JAMO.P, "ㅖ");
  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    assert.ok(QWERTY_TO_JAMO[letter], `missing mapping for ${letter}`);
  }
});

test("typing 한국어 with qwerty mapping composes correctly", () => {
  let text = "";
  for (const key of ["g", "k", "s", "r", "n", "r", "d", "j"]) {
    text = composeJamoInput(text, QWERTY_TO_JAMO[key]);
  }
  assert.equal(text, "한국어");
});
