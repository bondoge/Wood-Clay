"use client";

import { useEffect, useRef, useState } from "react";

export type CdekPvz = { code: string; city: string; address: string; name: string; workTime: string };

type CitySuggestion = { name: string; label: string };
type Office = { code: string; name: string; address: string; city: string; workTime: string; lon: number; lat: number };
type Step = "city" | "offices";

// Hand-built picker: DaData (app/api/dadata/suggest-cities) resolves fuzzy
// city input to an exact name — СДЭК's own /location/cities only matches
// exact names — and a real Yandex map (JS API v2.1, plain <script> tag, no
// npm dependency) plots pins from coordinates СДЭК's own /deliverypoints
// already returns, so no geocoding call is ever made client-side.
//
// This isn't CDEK's official @cdek-it/widget: that package hard-requires a
// *separately paid* Yandex HTTP Geocoder license (confirmed via its bundled
// source and a live 403 "Invalid api key" against a correctly-configured
// key — Yandex split Geocoder from the JS API into its own commercial
// product in May 2026). The JS API used here for map *display* only is
// still free under standard conditions, and we never call ymaps.geocode()
// or a Suggest control, which is the part that would hit that paywall.
const POPULAR_CITIES = [
  "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург",
  "Нижний Новгород", "Казань", "Челябинск", "Красноярск",
  "Самара", "Уфа", "Ростов-на-Дону", "Омск",
  "Краснодар", "Воронеж", "Пермь", "Волгоград",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- no official types package for the plain JS API v2.1; not worth a new dependency for this small a surface.
type YmapsApi = any;

declare global {
  interface Window {
    ymaps?: YmapsApi;
  }
}

let ymapsPromise: Promise<YmapsApi> | null = null;
function loadYmaps(apiKey: string): Promise<YmapsApi> {
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (ymapsPromise) return ymapsPromise;
  ymapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps!.ready(() => resolve(window.ymaps!));
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));
    document.head.appendChild(script);
  });
  return ymapsPromise;
}

export default function CdekPvzPicker({ value, onChange }: { value: CdekPvz | null; onChange: (pvz: CdekPvz) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("city");
  const [cityQuery, setCityQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<YmapsApi | null>(null);
  const listItemRefs = useRef(new Map<string, HTMLButtonElement>());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function handleOpen() {
    setIsOpen(true);
    setStep("city");
    setSuggestions(null);
    setCityQuery("");
    setError(null);
  }

  async function loadOffices(city: string) {
    setSelectedCity(city);
    setStep("offices");
    setOffices(null);
    setHighlightedCode(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/cdek/offices?city=${encodeURIComponent(city)}`);
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

  function handleCityInputChange(input: string) {
    setCityQuery(input);
    setSuggestions(null);
    clearTimeout(debounceRef.current);
    const query = input.trim();
    if (query.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch(`/api/dadata/suggest-cities?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        setSuggestions(await res.json());
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
  }

  function handleSelectOffice(office: Office) {
    onChange({ code: office.code, city: office.city, address: office.address, name: office.name, workTime: office.workTime });
    setIsOpen(false);
  }

  useEffect(() => {
    if (step !== "offices" || !offices || offices.length === 0) return;
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    if (!apiKey || !mapContainerRef.current) return;

    let cancelled = false;
    loadYmaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !mapContainerRef.current) return;
        const map = new ymaps.Map(
          mapContainerRef.current,
          { center: [offices[0].lat, offices[0].lon], zoom: 11, controls: ["zoomControl"] },
          { suppressMapOpenBlock: true },
        );
        mapInstanceRef.current = map;

        offices.forEach((office) => {
          const placemark = new ymaps.Placemark(
            [office.lat, office.lon],
            { balloonContentHeader: office.name, balloonContentBody: office.address },
            { preset: "islands#greenDotIcon" },
          );
          placemark.events.add("click", () => {
            setHighlightedCode(office.code);
            listItemRefs.current.get(office.code)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          });
          map.geoObjects.add(placemark);
        });

        if (offices.length > 1) {
          map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 24 });
        }
      })
      .catch((err) => console.error("Failed to load Yandex Maps:", err));

    return () => {
      cancelled = true;
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
    };
  }, [step, offices]);

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
                  <button type="button" key={city} onClick={() => loadOffices(city)}>
                    {city}
                  </button>
                ))}
              </div>

              {/* Not a <form> — this picker renders inside CartPageClient's
                  own checkout <form>, and nested forms are invalid HTML
                  (the browser silently mangles them, breaking submission). */}
              <div className="cdek-city-search">
                <input
                  type="text"
                  placeholder="Другой город"
                  value={cityQuery}
                  onChange={(e) => handleCityInputChange(e.target.value)}
                />
              </div>

              {suggestLoading && <p className="cdek-modal__status">Ищем город…</p>}
              {suggestions?.length === 0 && !suggestLoading && (
                <p className="cdek-picker__error" role="alert">Город не найден.</p>
              )}

              {suggestions && suggestions.length > 0 && (
                <ul className="cdek-city-matches">
                  {suggestions.map((city) => (
                    <li key={city.name}>
                      <button type="button" onClick={() => loadOffices(city.name)}>
                        {city.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === "offices" && (
            <div className="cdek-modal__body cdek-modal__body--offices">
              <button type="button" className="cdek-modal__back" onClick={() => setStep("city")}>
                ← Другой город
              </button>
              <h3 className="cdek-modal__title">{selectedCity}</h3>

              {loading && <p className="cdek-modal__status">Загружаем пункты выдачи…</p>}
              {error && <p className="cdek-picker__error" role="alert">{error}</p>}

              {offices && offices.length > 0 && (
                <div className="cdek-offices-layout">
                  <div className="cdek-offices-map" ref={mapContainerRef} aria-hidden="true" />
                  <ul className="cdek-office-list">
                    {offices.map((office) => (
                      <li key={office.code}>
                        <button
                          type="button"
                          ref={(el) => {
                            if (el) listItemRefs.current.set(office.code, el);
                          }}
                          className={office.code === highlightedCode ? "is-highlighted" : undefined}
                          onClick={() => handleSelectOffice(office)}
                        >
                          <strong>{office.name}</strong>
                          <span>{office.address}</span>
                          {office.workTime && <small>{office.workTime}</small>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
