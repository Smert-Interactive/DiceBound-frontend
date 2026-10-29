import { expect, test } from "vitest";
import { analyzeJson } from "../systems/jsonSyntax";

test.each([
  "{}",
  "[]",
  "null",
  "true",
  "-1.5e+2",
  '"строка"',
  '{"a":1,"b":[true,false,null,"text"]}',
  '{"formula":"unknown_function(x)"}',
  '{"sections":[{"fields":[{"type":"unknown"}]}]}',
])("accepts JSON syntax without applying Sheet Schema rules: %s", (text) => {
  expect(analyzeJson(text).syntax).toEqual({ valid: true });
});

test.each([
  ["", 1],
  ["\n  ", 2],
  ["{", 1],
  ['{\n "x": ]\n}', 2],
  ['{\n "x": 1,\n}', 3],
  ['{\r\n "x": 1,\r\n}', 3],
  ['{\n "x": 1', 2],
  ['{"x":01}', 1],
  ['{"x":NaN}', 1],
  ['{/* comment */"x":1}', 1],
  ['{"x":1}// comment', 1],
  ['{"x":"\\q"}', 1],
  ["[1,]", 1],
  ["{} []", 1],
])(
  "rejects invalid JSON and identifies the first error line: %s",
  (text, errorLine) => {
    expect(analyzeJson(text).syntax).toEqual({ valid: false, errorLine });
  },
);

test.each([
  "",
  "  ",
  '{\n "x": ]\n}',
  '{"unfinished": "text',
  String.raw`{"escaped":"\"\\","unicode":"Привет 🌍"}`,
  '{"html":"<script>alert(1)</script>"}',
  "[1,]",
  "\r\n{}\r\n",
])(
  "highlighting preserves every character even in unfinished input: %s",
  (text) => {
    expect(
      analyzeJson(text)
        .tokens.map((token) => token.text)
        .join(""),
    ).toBe(text);
  },
);

test("distinguishes keys, values and formula strings, without executing formulas", () => {
  const text =
    '{"formula":"floor(x / 2)","text":"formula","number":2,"flag":true,"nil":null}';
  const tokens = analyzeJson(text).tokens;
  expect(
    tokens.filter((token) => token.kind === "key").map((token) => token.text),
  ).toEqual(['"formula"', '"text"', '"number"', '"flag"', '"nil"']);
  expect(tokens.find((token) => token.kind === "formula")?.text).toBe(
    '"floor(x / 2)"',
  );
  expect(tokens.find((token) => token.kind === "number")?.text).toBe("2");
  expect(
    tokens
      .filter((token) => token.kind === "keyword")
      .map((token) => token.text),
  ).toEqual(["true", "null"]);
  expect(
    tokens
      .filter((token) => token.kind === "string")
      .map((token) => token.text),
  ).toEqual(['"formula"']);
});
