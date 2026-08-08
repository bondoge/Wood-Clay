"use client";

import { useState } from "react";

export type CdekPvz = { code: string; city: string; address: string; name: string; workTime: string };

type CityMatch = { code: number; city: string; region: string };
type Office = { code: string; name: string; address: string; city: string; workTime: string };

// СДЭК's own city lookup only matches on the exact name (no substring/
// prefix search — confirmed against their API), so live type-ahead across
// all ~20 000 Russian localities isn't workable without caching that whole
// list. This curated shortlist covers where most orders actually come from;
// anything else goes through the exact-name search below.
// Codes verified directly against СДЭК's /location/cities — don't guess
// these, several major cities collide with same-named small settlements in
// other regions (e.g. "Казань", "Самара", "Уфа" each returned 2-5 matches).
const POPULAR_CITIES: CityMatch[] = [
  { code: 44, city: "Москва", region: "Москва" },
  { code: 137, city: "Санкт-Петербург", region: "Санкт-Петербург" },
  { code: 270, city: "Новосибирск", region: "Новосибирская область" },
  { code: 250, city: "Екатеринбург", region: "Свердловская область" },
  { code: 414, city: "Нижний Новгород", region: "Нижегородская область" },
  { code: 424, city: "Казань", region: "Татарстан" },
  { code: 259, city: "Челябинск", region: "Челябинская область" },
  { code: 278, city: "Красноярск", region: "Красноярский край" },
  { code: 430, city: "Самара", region: "Самарская область" },
  { code: 256, city: "Уфа", region: "Республика Башкортостан" },
  { code: 438, city: "Ростов-на-Дону", region: "Ростовская область" },
  { code: 268, city: "Омск", region: "Омская область" },
  { code: 435, city: "Краснодар", region: "Краснодарский край" },
  { code: 506, city: "Воронеж", region: "Воронежская область" },
  { code: 248, city: "Пермь", region: "Пермский край" },
  { code: 426, city: "Волгоград", region: "Волгоградская область" },
];

type Step = "city" | "offices";

export default function CdekPvzPicker({ value, onChange }: { value: CdekPvz | null; onChange: (pvz: CdekPvz) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("city");
  const [cityQuery, setCityQuery] = useState("");
  const [cityMatches, setCityMatches] = useState<CityMatch[] | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityMatch | null>(null);
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setIsOpen(true);
    setStep("city");
    setCityMatches(null);
    setError(null);
  }

  async function loadOffices(city: CityMatch) {
    setSelectedCity(city);
    setStep("offices");
    setOffices(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/cdek/offices?city_code=${city.code}`);
      if (!res.ok) throw new Error();
      const data: Office[] = await res.json();
      if (data.length === 0) {
        setError("В этом городе нет пунктов выдачи СДЭК. Попробуйте другой город.");
      }
      setOffices(data);
    } catch {
      setError("Не получилось загрузить пункты выдачи. Попробуйте ещё раз.");
      setOffices([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCitySearch() {
    const query = cityQuery.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    setCityMatches(null);
    try {
      const res = await fetch(`/api/cdek/cities?city=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error();
      const data: CityMatch[] = await res.json();
      if (data.length === 0) {
        setError("Город не найден. Проверьте написание — нужно точное название, например «Ижевск».");
      } else if (data.length === 1) {
        await loadOffices(data[0]);
        return;
      } else {
        setCityMatches(data);
      }
    } catch {
      setError("Не получилось найти город. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectOffice(office: Office) {
    onChange({ code: office.code, city: office.city, address: office.address, name: office.name, workTime: office.workTime });
    setIsOpen(false);
  }

  return (
    <div className="cdek-picker">
      {value ? (
        <div className="cdek-picker__summary">
          <div>
            <strong>{value.name || "Пункт выдачи СДЭК"}</strong>
            <span>{value.city ? `${value.city}, ` : ""}{value.address}</span>
            {value.workTime && <small>{value.workTime}</small>}
          </div>
          <button type="button" onClick={handleOpen}>Изменить</button>
        </div>
      ) : (
        <button type="button" className="cdek-picker__trigger" onClick={handleOpen}>
          Выбрать пункт выдачи
        </button>
      )}

      <div className={`cdek-modal${isOpen ? " is-open" : ""}`} aria-hidden={!isOpen}>
        <div className="cdek-modal__backdrop" onClick={() => setIsOpen(false)} />
        <div className="cdek-modal__panel">
          <button type="button" className="cdek-modal__close" onClick={() => setIsOpen(false)} aria-label="Закрыть">
            ✕
          </button>

          {step === "city" && (
            <div className="cdek-modal__body">
              <h3 className="cdek-modal__title">Выберите город</h3>
              <div className="cdek-city-grid">
                {POPULAR_CITIES.map((city) => (
                  <button type="button" key={city.code} onClick={() => loadOffices(city)}>
                    {city.city}
                  </button>
                ))}
              </div>

              {/* Not a <form> — this picker renders inside CartPageClient's
                  own checkout <form>, and nested forms are invalid HTML
                  (the browser silently mangles them, breaking submission). */}
              <div className="cdek-city-search">
                <input
                  type="text"
                  placeholder="Другой город — точное название"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCitySearch(); }}
                />
                <button type="button" onClick={handleCitySearch}>Найти</button>
              </div>

              {loading && <p className="cdek-modal__status">Ищем город…</p>}
              {error && <p className="cdek-picker__error" role="alert">{error}</p>}

              {cityMatches && (
                <ul className="cdek-city-matches">
                  {cityMatches.map((city) => (
                    <li key={city.code}>
                      <button type="button" onClick={() => loadOffices(city)}>
                        {city.city} <span>{city.region}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === "offices" && (
            <div className="cdek-modal__body">
              <button type="button" className="cdek-modal__back" onClick={() => setStep("city")}>
                ← Другой город
              </button>
              <h3 className="cdek-modal__title">{selectedCity?.city}</h3>

              {loading && <p className="cdek-modal__status">Загружаем пункты выдачи…</p>}
              {error && <p className="cdek-picker__error" role="alert">{error}</p>}

              {offices && offices.length > 0 && (
                <ul className="cdek-office-list">
                  {offices.map((office) => (
                    <li key={office.code}>
                      <button type="button" onClick={() => handleSelectOffice(office)}>
                        <strong>{office.name}</strong>
                        <span>{office.address}</span>
                        {office.workTime && <small>{office.workTime}</small>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
