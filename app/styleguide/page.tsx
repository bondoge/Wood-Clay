import { Button } from "@/components/ui/button";

type Swatch = { token: string; name: string; hex: string };

const palettes: { theme: string; title: string; swatches: Swatch[] }[] = [
  {
    theme: "house",
    title: "House — по умолчанию",
    swatches: [
      { token: "--ink", name: "чернила", hex: "#17150F" },
      { token: "--ground", name: "фон", hex: "#FBFAF7" },
      {
        token: "--bisque / --surface",
        name: "неглазурованный фарфор",
        hex: "#E9E4DA",
      },
      { token: "--muted", name: "приглушённый текст", hex: "#6E685D" },
      { token: "--gilt / --accent", name: "позолота", hex: "#A88B4A" },
    ],
  },
  {
    theme: "gzhel",
    title: "Гжель",
    swatches: [
      { token: "--ink", name: "чернила", hex: "#101A33" },
      { token: "--cobalt / --accent", name: "кобальт", hex: "#17357F" },
      { token: "--deep", name: "глубокий кобальт", hex: "#0C1C4A" },
      { token: "--wash / --rule", name: "разбавленный мазок", hex: "#6B8FD4" },
      { token: "--ground", name: "фон", hex: "#F6F8FB" },
      { token: "--glaze / --surface", name: "глазурь", hex: "#E1E8F2" },
    ],
  },
  {
    theme: "khokhloma",
    title: "Хохлома",
    swatches: [
      { token: "--ink", name: "чернила", hex: "#F1E4C9" },
      { token: "--ground", name: "лаковый фон", hex: "#120C08" },
      { token: "--linen / --surface", name: "лён", hex: "#EFE4CE" },
      { token: "--gold / --focus", name: "золото", hex: "#D9A22B" },
      { token: "--cinnabar / --accent", name: "киноварь", hex: "#A8261C" },
      { token: "--ember", name: "уголь", hex: "#6E1A10" },
    ],
  },
  {
    theme: "zhostovo",
    title: "Жостово",
    swatches: [
      { token: "--ink", name: "чернила", hex: "#F2E9D8" },
      { token: "--ground", name: "лаковый фон", hex: "#0A0A0C" },
      { token: "--rose", name: "роза", hex: "#C23A57" },
      { token: "--blush", name: "румянец", hex: "#E8A9B4" },
      { token: "--leaf", name: "лист", hex: "#4A5D3A" },
      { token: "--gold / --accent / --focus", name: "золото", hex: "#C9A24D" },
    ],
  },
];

const spacingSteps = [
  { token: "--space-1", px: 4 },
  { token: "--space-2", px: 8 },
  { token: "--space-3", px: 12 },
  { token: "--space-4", px: 16 },
  { token: "--space-5", px: 24 },
  { token: "--space-6", px: 32 },
  { token: "--space-7", px: 48 },
  { token: "--space-8", px: 64 },
  { token: "--space-9", px: 96 },
  { token: "--space-10", px: 128 },
  { token: "--space-11", px: 192 },
];

const typeRows: { cls: string; token: string; rem: string; sample: string }[] =
  [
    { cls: "type-9", token: "--text-9", rem: "7rem", sample: "Гжель" },
    { cls: "type-8", token: "--text-8", rem: "4.5rem", sample: "Хохлома" },
    { cls: "type-7", token: "--text-7", rem: "3rem", sample: "Жостово" },
    {
      cls: "type-6",
      token: "--text-6",
      rem: "2rem",
      sample: "Роспись сходит с фигурки",
    },
    {
      cls: "type-5",
      token: "--text-5",
      rem: "1.5rem",
      sample: "Предмет — максималистичен. Страница — молчит.",
    },
    {
      cls: "type-4",
      token: "--text-4",
      rem: "1.25rem",
      sample: "Каждая вещь в доме расписана вручную одним мастером.",
    },
    {
      cls: "type-3",
      token: "--text-3",
      rem: "1rem",
      sample:
        "Мы собираем и расписываем фарфор в традициях гжели, хохломы и жостова — в своей мастерской и с партнёрскими артелями.",
    },
    {
      cls: "type-2",
      token: "--text-2",
      rem: "0.875rem",
      sample: "Высота 180 мм · тираж 12 экземпляров · глазурь кобальтовая",
    },
    {
      cls: "type-1",
      token: "--text-1",
      rem: "0.75rem",
      sample: "Мастерская Ирины К., Гжель",
    },
  ];

const buttons: { theme: string; label: string }[] = [
  { theme: "house", label: "Смотреть коллекцию" },
  { theme: "gzhel", label: "Смотреть гжель" },
  { theme: "khokhloma", label: "Смотреть хохлому" },
  { theme: "zhostovo", label: "Смотреть жостово" },
];

export default function StyleguidePage() {
  return (
    <main className="px-[var(--space-5)] py-[var(--space-9)]">
      <div className="mx-auto max-w-[var(--content-max)]">
        <header className="reveal mb-[var(--space-10)]">
          <p className="type-utility mb-[var(--space-3)]">Wood&amp;Clay</p>
          <h1 className="type-7 mb-[var(--space-4)]">Дизайн-система</h1>
          <p className="type-4" style={{ maxWidth: "var(--measure)" }}>
            Общие токены четырёх миров дома: House — тихий и бесцветный, и три
            ремесленные традиции — Гжель, Хохлома, Жостово. Один компонент,
            четыре палитры, ни одной развилки в коде.
          </p>
        </header>

        <section className="reveal mb-[var(--space-10)]">
          <h2 className="type-6 mb-[var(--space-6)]">Типографика</h2>
          <div className="flex flex-col gap-[var(--space-6)]">
            {typeRows.map((row) => (
              <div
                key={row.token}
                className="border-b pb-[var(--space-4)]"
                style={{ borderColor: "var(--rule)" }}
              >
                <p className={row.cls}>{row.sample}</p>
                <p className="type-utility mt-[var(--space-2)] opacity-60">
                  {row.token} · {row.rem}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="reveal mb-[var(--space-10)]">
          <h2 className="type-6 mb-[var(--space-6)]">Цвет</h2>
          <div className="flex flex-col gap-[var(--space-9)]">
            {palettes.map((palette) => (
              <div key={palette.theme} data-theme={palette.theme}>
                <div
                  className="p-[var(--space-6)]"
                  style={{ background: "var(--ground)", color: "var(--ink)" }}
                >
                  <h3 className="type-5 mb-[var(--space-5)]">
                    {palette.title}
                  </h3>
                  <div className="flex flex-wrap gap-[var(--space-5)]">
                    {palette.swatches.map((swatch) => (
                      <div key={swatch.token} className="w-[144px]">
                        <div
                          className="mb-[var(--space-2)] h-[96px] w-full border"
                          style={{
                            background: swatch.hex,
                            borderColor: "var(--rule)",
                          }}
                        />
                        <p className="type-2">{swatch.name}</p>
                        <p className="type-1 opacity-70">
                          {swatch.token} · {swatch.hex}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="reveal mb-[var(--space-10)]">
          <h2 className="type-6 mb-[var(--space-6)]">Отступы</h2>
          <div className="flex flex-col gap-[var(--space-3)]">
            {spacingSteps.map((step) => (
              <div
                key={step.token}
                className="flex items-center gap-[var(--space-4)]"
              >
                <div
                  className="h-[16px]"
                  style={{
                    width: `var(${step.token})`,
                    background: "var(--accent)",
                  }}
                />
                <p className="type-2">
                  {step.token} — {step.px}px
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="reveal mb-[var(--space-10)]">
          <h2 className="type-6 mb-[var(--space-6)]">Радиус и линии</h2>
          <div className="flex flex-wrap items-start gap-[var(--space-8)]">
            <div>
              <div
                className="h-[96px] w-[144px] border"
                style={{
                  borderRadius: "var(--radius)",
                  background: "var(--surface)",
                  borderColor: "var(--rule)",
                }}
              />
              <p className="type-1 mt-[var(--space-2)] opacity-70">
                --radius: 0
              </p>
            </div>
            {palettes.map((palette) => (
              <div key={palette.theme} data-theme={palette.theme}>
                <div
                  className="p-[var(--space-4)]"
                  style={{ background: "var(--ground)" }}
                >
                  <div
                    className="w-[144px]"
                    style={{
                      borderTop: "var(--rule-weight) solid var(--rule)",
                    }}
                  />
                  <p
                    className="type-1 mt-[var(--space-2)]"
                    style={{ color: "var(--ink)", opacity: 0.7 }}
                  >
                    {palette.title} · --rule
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="reveal">
          <h2 className="type-6 mb-[var(--space-6)]">Кнопки</h2>
          <div className="flex flex-wrap gap-[var(--space-8)]">
            {buttons.map((b) => (
              <div key={b.theme} data-theme={b.theme}>
                <div
                  className="p-[var(--space-6)]"
                  style={{ background: "var(--ground)" }}
                >
                  <Button>{b.label}</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
