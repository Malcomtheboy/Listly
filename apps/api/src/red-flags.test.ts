import { test } from "node:test";
import assert from "node:assert/strict";
import { ruleFlags, scoreFlags } from "./red-flags.js";
import type { ListingFacts } from "./types.js";

const facts: ListingFacts = {
  title: "Hybel på Grünerløkka",
  price: 9000,
  currency: "NOK",
  deposit: 27000,
  address: "Thorvald Meyers gate 1",
  city: "Oslo",
  sizeM2: 20,
  rooms: 1,
  billsIncluded: ["strøm"],
  availableFrom: null,
  contact: null,
  platform: "Finn",
};

test("a normal listing gets no rule flags and looks ok", () => {
  const flags = ruleFlags("Lys hybel nær trikken. Visning torsdag kl 18.", facts);
  assert.deepEqual(flags, []);
  assert.equal(scoreFlags(flags).verdict, "looks-ok");
});

test("classic abroad + keys by post scam is high risk", () => {
  const text = "Jeg jobber i utlandet, så jeg sender nøklene i posten etter at du har betalt depositum med Western Union.";
  const flags = ruleFlags(text, facts);
  const titles = flags.map((f) => f.title);
  assert.ok(titles.includes("Utleier er «i utlandet»"));
  assert.ok(titles.includes("Nøkler sendes i posten"));
  assert.ok(titles.includes("Uvanlig betalingsmåte"));
  assert.equal(scoreFlags(flags).verdict, "high-risk");
});

test("english pay-before-viewing is caught", () => {
  const flags = ruleFlags("Please pay the deposit before viewing, I am out of the country.", facts);
  assert.ok(flags.some((f) => f.title === "Betaling før visning"));
});

test("deposit to the landlord's own account is caught in its inflected forms", () => {
  for (const text of [
    "Betal depositum på 15000 kr til min private konto.",
    "Depositum overføres til privatkonto.",
    "Send depositumet til min personlige konto.",
  ]) {
    assert.ok(
      ruleFlags(text, facts).some((f) => f.title === "Depositum til privat konto"),
      text,
    );
  }
});

test("deposit over six months of rent is flagged for NOK", () => {
  const flags = ruleFlags("", { ...facts, deposit: 60000 });
  assert.ok(flags.some((f) => f.title === "Depositum over lovlig maks"));
});

test("missing price, address and deposit are low flags", () => {
  const flags = ruleFlags("", { ...facts, price: null, address: null, deposit: null });
  assert.equal(flags.filter((f) => f.severity === "low").length, 3);
});

test("a single high flag is never 'looks ok' even with a good score", () => {
  const { score, verdict } = scoreFlags([{ severity: "high", title: "x", detail: "", source: "ai" }]);
  assert.equal(score, 70);
  assert.equal(verdict, "high-risk");
});

test("duplicate titles from rule and ai only count once", () => {
  const flag = { severity: "medium" as const, title: "Kunstig hastverk", detail: "" };
  const { score } = scoreFlags([
    { ...flag, source: "rule" },
    { ...flag, source: "ai" },
  ]);
  assert.equal(score, 88);
});
