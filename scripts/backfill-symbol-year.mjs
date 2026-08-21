// One-off (but safely rerunnable) backfill: populates products.symbol_year
// for rows whose own copy already claims symbol-of-the-year status.
//
// Scope is deliberately narrow, per Task 2's brief: this only touches
// products whose own_title/own_description/wb_description already mentions
// "символ" (symbol-of-the-year language) — it never assigns symbol_year to
// a product just because it depicts a zodiac animal. A realistic horse
// figurine that never claims "символ года" stays untouched. For each
// candidate, the depicted animal is read from own_title (the reliable
// signal — WB/own description text has been shown to be wrong, e.g. one
// "Коза" product's description says "Фарфоровый дракон - символ года", a
// copy-paste error from an unrelated product) and mapped through the fixed
// zodiac table below. Animals outside that table (Сова, Слон, Домовой,
// Баба Яга, Кот, ...) are left/set to NULL even when their copy wrongly
// claims otherwise — this script corrects the attribute, not the prose.
//
// A second safeguard beyond the claim-text check (see hasGenuineClaim
// below): a description-only claim is only trusted for an animal that has
// at least one product ELSEWHERE in the catalogue whose own TITLE itself
// explicitly claims that animal's symbol-year status — i.e., independently
// corroborated, not solely inferred from a shared WB description template.
// This was added after finding that a whole "Хохлома ёлочная игрушка"
// product line shares one boilerplate description ("Фарфоровый дракон -
// символ года. В серию входят: ...") verbatim across dozens of items whose
// titles are Лошадка/Снеговик/Собака/etc — most of which have no
// independent evidence of ever being marketed as a symbol-of-the-year
// piece. Дракон/Змея/Лошадь/Коза family/Обезьяна all have dozens of
// title-explicit confirmations elsewhere in the catalogue; Петух/Собака/
// Свинья have zero — see findings.md for the full investigation.
//
//   npm run backfill:symbol-year -- --dry-run   (preview only, no writes)
//   npm run backfill:symbol-year
import { Pool } from "pg";

const REQUIRED_VARS = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`${missing.join(", ")} not set — see .env.example.`);
}

const DRY_RUN = process.argv.includes("--dry-run");

// Коза and Овца share 2027 per the brief's table; Баран/барашек/овечка are
// the same zodiac animal family (ram/sheep), and this catalogue's own
// "Баран символ года 2027" / "Овечка символ года 2027" titles already
// assert 2027 themselves — including them here keeps the attribute
// consistent with what those products already claim, not introducing a new
// claim.
const ZODIAC_RULES = [
  { year: 2024, keywords: ["дракон"] },
  { year: 2025, keywords: ["змея", "змей"] },
  { year: 2026, keywords: ["лошад"] },
  { year: 2027, keywords: ["коз", "овц", "овеч", "баран"] },
  { year: 2028, keywords: ["обезьян"] },
  { year: 2029, keywords: ["петух"] },
  { year: 2030, keywords: ["собак"] },
  { year: 2031, keywords: ["свинь"] },
];

// The one specific bug the brief itself names: id=76 "Елочная игрушка Коза.
// Фарфор, Хохлома" has description "Фарфоровый дракон - символ года." — a
// verified, individually-confirmed copy-paste error (id=3 has the identical
// title and correctly says "коза" in the same template slot). Handled as an
// explicit override rather than a generalized "trust the title over a
// mismatched claim animal" rule, since that generalization is exactly what
// produced the Петух/Собака/Свинья false positives above.
const MANUAL_OVERRIDES = { 76: 2027 };

function normalize(text) {
  return text.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
}

function classifyAnimal(title) {
  const t = normalize(title);
  for (const rule of ZODIAC_RULES) {
    if (rule.keywords.some((kw) => t.includes(kw))) return rule.year;
  }
  return null;
}

// A real "символ года/20XX" claim, not the unrelated word "символизируют" —
// \p{L}* absorbs the inflected suffix, but "года" or a 4-digit year must
// follow directly, which "символизируют уют..." never satisfies. Needs the
// `u` flag + \p{L} (not \w, which is ASCII-only in JS and doesn't match
// Cyrillic at all) — confirmed the hard way when the ASCII version matched
// nothing.
const CLAIM_PATTERN = /символ\p{L}*\s+(года|\d{4})/iu;

// Many of these WB-sourced descriptions share one template: a first
// sentence naming the technique, a SECOND sentence naming this specific
// item's symbol-year claim (when it has one) — e.g. id=3 "Фарфоровая коза-
// символ 2027 года." — then a long "В серию входят: ..." listing of every
// OTHER item in the same themed product line, which frequently name-drops
// unrelated animals' zodiac trivia deep in that filler (e.g. id=302, a dog
// figurine, mentions "Зайчик (кролик) - символ 2023 года" ~600 characters
// in, describing a DIFFERENT catalogue item, not itself). Empirically the
// genuine claim always sits within the first ~300 characters; the
// series-listing false positives sit 600+ characters in — a wide, safe
// margin.
const CLAIM_WINDOW = 300;

function hasClaimText(row) {
  if (CLAIM_PATTERN.test(row.own_title)) return true;
  if (CLAIM_PATTERN.test(row.own_description.slice(0, CLAIM_WINDOW))) return true;
  if (CLAIM_PATTERN.test(row.wb_description.slice(0, CLAIM_WINDOW))) return true;
  return false;
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const { rows } = await pool.query(`
  SELECT id, own_title, own_description, wb_description, symbol_year, published
  FROM products
  WHERE own_description ILIKE '%символ%'
     OR own_title ILIKE '%символ%'
     OR wb_description ILIKE '%символ%'
  ORDER BY id
`);

console.log(`Candidates mentioning "символ" in title/description: ${rows.length}${DRY_RUN ? " (DRY RUN — no writes)" : ""}`);

// Which zodiac years have at least one product whose OWN TITLE explicitly
// claims symbol-of-year status for that animal — independently
// corroborated, not solely inferred from a shared/boilerplate description
// sentence. See the file header for why this matters.
const confirmedYears = new Set(
  rows
    .filter((r) => CLAIM_PATTERN.test(r.own_title))
    .map((r) => classifyAnimal(r.own_title))
    .filter((year) => year !== null),
);
console.log(`Years with independent title-level corroboration: ${[...confirmedYears].sort().join(", ")}`);

const changes = [];
const excludedAsIncidental = [];
let unchanged = 0;
let notEligibleAlreadyNull = 0;

for (const row of rows) {
  const override = MANUAL_OVERRIDES[row.id];
  const titleYear = classifyAnimal(row.own_title);
  const eligible = override !== undefined
    || (hasClaimText(row) && titleYear !== null && confirmedYears.has(titleYear));

  if (!eligible) {
    // "символ" appeared somewhere in this row's text (the broad SQL
    // prefilter), but not as a genuine, corroborated claim about this item.
    // Left/kept null, logged separately so the exclusion is auditable
    // rather than silent.
    if (row.symbol_year !== null) {
      if (!DRY_RUN) await pool.query("UPDATE products SET symbol_year = NULL WHERE id = $1", [row.id]);
      excludedAsIncidental.push({ id: row.id, title: row.own_title });
    } else {
      notEligibleAlreadyNull++;
    }
    continue;
  }

  const newYear = override ?? titleYear;
  const oldYear = row.symbol_year;
  if (newYear !== oldYear) {
    changes.push({ id: row.id, title: row.own_title, published: row.published, oldYear, newYear, override: override !== undefined });
    if (!DRY_RUN) {
      await pool.query("UPDATE products SET symbol_year = $1 WHERE id = $2", [newYear, row.id]);
    }
  } else {
    unchanged++;
  }
}

console.log(`\n${DRY_RUN ? "Would change" : "Changed"}: ${changes.length}`);
console.log(`Unchanged (already correct, including already-NULL non-zodiac/non-corroborated items): ${unchanged}`);
console.log(`Excluded as incidental "символ" mention or uncorroborated animal: ${excludedAsIncidental.length}`);
console.log(`Not eligible, already null (no-op): ${notEligibleAlreadyNull}`);
console.log();
for (const c of changes) {
  console.log(`  #${c.id} [${c.oldYear ?? "null"} -> ${c.newYear ?? "null"}]${c.published ? "" : " (unpublished)"}${c.override ? " (manual override)" : ""} ${c.title}`);
}
if (excludedAsIncidental.length > 0) {
  console.log("\nExcluded (had a non-null symbol_year that this run cleared, since the only \"символ\" text found was incidental or uncorroborated):");
  for (const e of excludedAsIncidental) console.log(`  #${e.id} ${e.title}`);
}

const { rows: byYear } = await pool.query(`
  SELECT symbol_year, published, count(*) AS count
  FROM products
  WHERE symbol_year IS NOT NULL
  GROUP BY symbol_year, published
  ORDER BY symbol_year, published
`);
console.log("\nsymbol_year distribution after this run (live query, reflects DRY_RUN too since it re-reads current state):");
console.table(byYear);

await pool.end();
