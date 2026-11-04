import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCategory, ruleFlags, scoreFlags } from "./red-flags.js";
import type { CarFacts, RentalFacts } from "./types.js";

const facts: RentalFacts = {
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
  const flags = ruleFlags("Lys hybel nær trikken. Visning torsdag kl 18.", "rental", facts);
  assert.deepEqual(flags, []);
  assert.equal(scoreFlags(flags).verdict, "looks-ok");
});

test("classic abroad + keys by post scam is high risk", () => {
  const text = "Jeg jobber i utlandet, så jeg sender nøklene i posten etter at du har betalt depositum med Western Union.";
  const flags = ruleFlags(text, "rental", facts);
  const titles = flags.map((f) => f.title);
  assert.ok(titles.includes("Utleier er «i utlandet»"));
  assert.ok(titles.includes("Nøkler sendes i posten"));
  assert.ok(titles.includes("Uvanlig betalingsmåte"));
  assert.equal(scoreFlags(flags).verdict, "high-risk");
});

test("english pay-before-viewing is caught", () => {
  const flags = ruleFlags("Please pay the deposit before viewing, I am out of the country.", "rental", facts);
  assert.ok(flags.some((f) => f.title === "Betaling før visning"));
});

test("deposit to the landlord's own account is caught in its inflected forms", () => {
  for (const text of [
    "Betal depositum på 15000 kr til min private konto.",
    "Depositum overføres til privatkonto.",
    "Send depositumet til min personlige konto.",
  ]) {
    assert.ok(
      ruleFlags(text, "rental", facts).some((f) => f.title === "Depositum til privat konto"),
      text,
    );
  }
});

test("deposit over six months of rent is flagged for NOK", () => {
  const flags = ruleFlags("", "rental", { ...facts, deposit: 60000 });
  assert.ok(flags.some((f) => f.title === "Depositum over lovlig maks"));
});

test("missing price, address and deposit are low flags", () => {
  const flags = ruleFlags("", "rental", { ...facts, price: null, address: null, deposit: null });
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

const car: CarFacts = {
  title: "Volkswagen Golf 1.5 TSI",
  price: 189000,
  currency: "NOK",
  make: "Volkswagen",
  model: "Golf",
  year: 2019,
  mileageKm: 84000,
  regNumber: "EF12345",
  fuel: "Bensin",
  gearbox: "Automat",
  location: "Trondheim",
  seller: "Privat",
  platform: "Finn",
};

test("a normal car listing gets no rule flags", () => {
  const flags = ruleFlags("Pent brukt Golf, ny EU-kontroll. Prøvekjøring etter avtale.", "car", car);
  assert.deepEqual(flags, []);
});

test("car abroad + shipping company + reservation fee is high risk", () => {
  const text = "Bilen står i Tyskland. Betal 5000 kr i forskudd for å reservere den, så sender fraktfirmaet den til deg.";
  const titles = ruleFlags(text, "car", car).map((f) => f.title);
  assert.ok(titles.includes("Bilen eller selgeren er «i utlandet»"));
  assert.ok(titles.includes("Betaling via fraktfirma eller «deponering»"));
  assert.ok(titles.includes("Forskudd for å reservere bilen"));
});

test("refusing a test drive is flagged", () => {
  const flags = ruleFlags("Dessverre ikke mulig å prøvekjøre.", "car", car);
  assert.ok(flags.some((f) => f.title === "Ingen prøvekjøring"));
});

test("rental-only rules do not fire on cars", () => {
  const flags = ruleFlags("Nøklene sendes i posten.", "car", car);
  assert.ok(!flags.some((f) => f.title === "Nøkler sendes i posten"));
});

test("a car without plate, mileage or year gets missing-info flags", () => {
  const flags = ruleFlags("", "car", { ...car, regNumber: null, mileageKm: null, year: null });
  assert.equal(flags.filter((f) => f.severity === "low").length, 3);
});

test("category is guessed from the url first, then from the words", () => {
  assert.equal(detectCategory("", "https://www.finn.no/mobility/item/123"), "car");
  assert.equal(detectCategory("", "https://www.hybel.no/annonse/1"), "rental");
  assert.equal(detectCategory("Golf 2019, 84 000 km, automatgir, diesel"), "car");
  assert.equal(detectCategory("Hybel i kollektiv, husleie 6000, depositum 18000"), "rental");
  assert.equal(detectCategory("Årsmodell 2015, bensin"), "car");
});
