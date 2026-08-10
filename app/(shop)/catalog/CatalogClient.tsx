"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CatalogFooter, CatalogHeader, ProductCard } from "./catalog-components";
import { CollectionsBlock } from "./CollectionsBlock";
import type { ProductView } from "./product-view";
import { formatPrice, pluralizeProducts } from "./catalog-utils";
import { computeCategories, computeCollectionTiles, computeStyles, matchesCategory, normalize } from "./collections";

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: "relevance", label: "По релевантности" },
  { value: "price-asc", label: "Сначала дешевле" },
  { value: "price-desc", label: "Сначала дороже" },
  { value: "stock", label: "Больше в наличии" },
];

const SYNONYMS: Record<string, string[]> = {
  елка: ["ёлка", "елочная", "ёлочная", "новогодняя", "украшение"],
  игрушка: ["украшение", "подвес", "елочная", "ёлочная"],
  фигурка: ["статуэтка", "скульптура"],
  статуэтка: ["фигурка", "скульптура"],
  гжель: ["gzhel", "синяя", "синий"],
  хохлома: ["khokhloma", "золотая", "золотой"],
  авторская: ["author", "ручная", "роспись"],
  мишка: ["медведь", "олимпийский"],
  подарок: ["сувенир", "подарочный"],
};

function scoreProduct(product: ProductView, rawQuery: string) {
  const query = normalize(rawQuery);
  if (!query) return 1;

  const originalTokens = query.split(" ").filter(Boolean);
  const tokens = Array.from(new Set(originalTokens.flatMap((token) => [token, ...(SYNONYMS[token] ?? [])].map(normalize))));
  const title = normalize(product.title);
  const type = normalize(product.type);
  const style = normalize(`${product.style} ${product.styleLabel}`);
  const article = normalize(product.article);
  const description = normalize(`${product.description} ${product.story}`);

  let score = 0;
  if (title === query) score += 140;
  if (title.startsWith(query)) score += 85;
  if (title.includes(query)) score += 55;
  if (article === query) score += 150;

  for (const token of tokens) {
    if (title.split(" ").includes(token)) score += 22;
    else if (title.includes(token)) score += 14;
    if (type.includes(token)) score += 9;
    if (style.includes(token)) score += 11;
    if (article.includes(token)) score += 16;
    if (description.includes(token)) score += 2;
  }

  const everyOriginalTokenMatches = originalTokens.every((token) =>
    `${title} ${type} ${style} ${article} ${description}`.includes(token),
  );
  return everyOriginalTokenMatches ? score + 12 : score;
}

type CatalogClientProps = {
  products: ProductView[];
  initialStyle?: string;
  initialCategory?: string;
};

export default function CatalogClient({ products, initialStyle, initialCategory }: CatalogClientProps) {
  const [query, setQuery] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>(initialStyle ? [initialStyle] : []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [sort, setSort] = useState("relevance");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const catalogRef = useRef<HTMLElement>(null);

  const minCatalogPrice = useMemo(() => Math.min(...products.map((product) => product.price)), [products]);
  const maxCatalogPrice = useMemo(() => Math.max(...products.map((product) => product.price)), [products]);
  const [minPrice, setMinPrice] = useState(minCatalogPrice);
  const [maxPrice, setMaxPrice] = useState(maxCatalogPrice);

  const styles = useMemo(() => computeStyles(products), [products]);
  const categories = useMemo(() => computeCategories(products), [products]);
  const collectionTiles = useMemo(
    () => computeCollectionTiles(styles, categories, products),
    [categories, products, styles],
  );

  const filteredProducts = useMemo(() => {
    const scored = products
      .map((product, index) => ({ product, score: scoreProduct(product, query), index }))
      .filter(({ product, score }) => (
        score > 0
        && (selectedStyles.length === 0 || selectedStyles.includes(product.style))
        && (selectedCategories.length === 0 || selectedCategories.some((category) => matchesCategory(product, category)))
        && product.price >= minPrice
        && product.price <= maxPrice
      ));

    scored.sort((a, b) => {
      if (sort === "price-asc") return a.product.price - b.product.price;
      if (sort === "price-desc") return b.product.price - a.product.price;
      if (sort === "stock") return b.product.stock - a.product.stock;
      if (query) return b.score - a.score || a.index - b.index;
      return a.index - b.index;
    });
    return scored.map(({ product }) => product);
  }, [maxPrice, minPrice, products, query, selectedCategories, selectedStyles, sort]);

  const activeFilterCount = selectedStyles.length + selectedCategories.length
    + (minPrice > minCatalogPrice || maxPrice < maxCatalogPrice ? 1 : 0);

  const toggleValue = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setVisibleCount(PAGE_SIZE);
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedStyles([]);
    setSelectedCategories([]);
    setMinPrice(minCatalogPrice);
    setMaxPrice(maxCatalogPrice);
    setSort("relevance");
    setVisibleCount(PAGE_SIZE);
  };

  const scrollToCatalog = () => {
    window.setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const selectCollection = (kind: "style" | "category", id: string) => {
    setQuery("");
    setSelectedStyles(kind === "style" ? [id] : []);
    setSelectedCategories(kind === "category" ? [id] : []);
    setMinPrice(minCatalogPrice);
    setMaxPrice(maxCatalogPrice);
    setVisibleCount(PAGE_SIZE);
    scrollToCatalog();
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVisibleCount(PAGE_SIZE);
    (document.activeElement as HTMLElement | null)?.blur();
    scrollToCatalog();
  };

  // Links from outside the catalog (e.g. the home page's collections
  // block) land here as /catalog?style=X or /catalog?category=X — the
  // matching filter is already preselected via initialStyle/initialCategory,
  // so just jump straight to the results once on load.
  useEffect(() => {
    if (initialStyle || initialCategory) scrollToCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="catalog-page">
      <CatalogHeader />

      <section className="catalog-hero">
        <div className="catalog-hero__wash" aria-hidden="true" />
        <p className="catalog-eyebrow">Ручная работа · Фарфор · В наличии</p>
        <h1>Каталог Wood&amp;Clay</h1>
        <p className="catalog-hero__lead">
          Фарфоровые игрушки и фигурки, которые станут частью семейных историй.
          Все <strong>{products.length}</strong> изделий ниже сейчас в наличии.
        </p>
      </section>

      <CollectionsBlock
        tiles={collectionTiles}
        selectedStyles={selectedStyles}
        selectedCategories={selectedCategories}
        onSelect={selectCollection}
      />

      <section className="catalog-shop" id="catalog-products" ref={catalogRef} aria-labelledby="catalog-products-heading">
        <form className="catalog-search-panel" role="search" onSubmit={handleSearchSubmit}>
          <div>
            <p className="catalog-eyebrow">Поиск по {products.length} изделиям</p>
            <h2>Что вы ищете?</h2>
          </div>
          <div className="catalog-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }}
              placeholder="Например, лошадка, гжель или артикул"
              aria-label="Поиск по каталогу"
            />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Очистить поиск">×</button>}
          </div>
          <button className="catalog-search__submit" type="submit">Найти <span aria-hidden="true">↓</span></button>
          {(selectedStyles.length > 0 || selectedCategories.length > 0 || query) && (
            <div className="catalog-active-filters" aria-label="Активные фильтры">
              {selectedStyles.map((style) => {
                const item = styles.find((candidate) => candidate.style === style);
                return <button type="button" key={style} onClick={() => setSelectedStyles([])}>{item?.label} <span>×</span></button>;
              })}
              {selectedCategories.map((categoryId) => {
                const item = categories.find((candidate) => candidate.id === categoryId);
                return <button type="button" key={categoryId} onClick={() => setSelectedCategories((current) => current.filter((id) => id !== categoryId))}>{item?.label} <span>×</span></button>;
              })}
              {query && <button type="button" onClick={() => setQuery("")}>Поиск: «{query}» <span>×</span></button>}
              <button className="catalog-active-filters__clear" type="button" onClick={clearFilters}>Показать всё</button>
            </div>
          )}
        </form>

        <div className="catalog-toolbar">
          <div>
            <p className="catalog-eyebrow">В наличии</p>
            <h2 id="catalog-products-heading">Все изделия</h2>
            <span>{filteredProducts.length} {pluralizeProducts(filteredProducts.length)}</span>
          </div>
          <div className="catalog-toolbar__controls">
            <button className="catalog-filter-trigger" type="button" onClick={() => setFiltersOpen(true)}>
              Фильтры {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
            </button>
            <div className="catalog-sort-dropdown">
              <button type="button" aria-expanded={sortOpen} onClick={() => setSortOpen(!sortOpen)}>
                <span>Сортировать</span>
                <strong>{SORT_OPTIONS.find((option) => option.value === sort)?.label}</strong>
                <i aria-hidden="true">⌄</i>
              </button>
              {sortOpen && (
                <div className="catalog-sort-menu" role="menu">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      className={sort === option.value ? "is-selected" : ""}
                      type="button"
                      role="menuitemradio"
                      aria-checked={sort === option.value}
                      key={option.value}
                      onClick={() => { setSort(option.value); setSortOpen(false); }}
                    >
                      {option.label}<span aria-hidden="true">{sort === option.value ? "✓" : ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="catalog-shop__layout">
          <aside className={`catalog-filters${filtersOpen ? " is-open" : ""}`} aria-label="Фильтры каталога">
            <div className="catalog-filters__mobile-head">
              <strong>Фильтры</strong>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Закрыть фильтры">×</button>
            </div>

            <FilterGroup title="Роспись">
              {styles.map(({ style, label }) => (
                <label className="catalog-check" key={style}>
                  <input
                    type="checkbox"
                    checked={selectedStyles.includes(style)}
                    onChange={() => toggleValue(style, setSelectedStyles)}
                  />
                  <span>{label}</span>
                  <small>{products.filter((product) => product.style === style).length}</small>
                </label>
              ))}
            </FilterGroup>

            <FilterGroup title="Категория">
              {categories.map(({ id, label, count }) => (
                <label className="catalog-check" key={id}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(id)}
                    onChange={() => toggleValue(id, setSelectedCategories)}
                  />
                  <span>{label}</span>
                  <small>{count}</small>
                </label>
              ))}
            </FilterGroup>

            <FilterGroup title="Цена">
              <div className="catalog-price-filter">
                <div className="catalog-price-filter__values">
                  <label><span>От</span><input type="number" min={minCatalogPrice} max={maxPrice} step="40" value={minPrice}
                    onChange={(event) => { setMinPrice(Math.min(Number(event.target.value), maxPrice)); setVisibleCount(PAGE_SIZE); }}
                    aria-label="Минимальная цена в рублях" /></label>
                  <label><span>До</span><input type="number" min={minPrice} max={maxCatalogPrice} step="40" value={maxPrice}
                    onChange={(event) => { setMaxPrice(Math.max(Number(event.target.value), minPrice)); setVisibleCount(PAGE_SIZE); }}
                    aria-label="Максимальная цена в рублях" /></label>
                </div>
                <div className="catalog-price-filter__sliders" style={{
                  "--price-start": `${((minPrice - minCatalogPrice) / (maxCatalogPrice - minCatalogPrice)) * 100}%`,
                  "--price-end": `${((maxPrice - minCatalogPrice) / (maxCatalogPrice - minCatalogPrice)) * 100}%`,
                } as React.CSSProperties}>
                  <span aria-hidden="true" />
                  <input type="range" min={minCatalogPrice} max={maxCatalogPrice} step="40" value={minPrice}
                    onChange={(event) => { setMinPrice(Math.min(Number(event.target.value), maxPrice - 40)); setVisibleCount(PAGE_SIZE); }}
                    aria-label="Минимальная цена" />
                  <input type="range" min={minCatalogPrice} max={maxCatalogPrice} step="40" value={maxPrice}
                    onChange={(event) => { setMaxPrice(Math.max(Number(event.target.value), minPrice + 40)); setVisibleCount(PAGE_SIZE); }}
                    aria-label="Максимальная цена" />
                </div>
                <div className="catalog-price-filter__bounds"><small>{formatPrice(minCatalogPrice)}</small><small>{formatPrice(maxCatalogPrice)}</small></div>
              </div>
            </FilterGroup>

            <div className="catalog-filters__actions">
              {activeFilterCount > 0 && <button type="button" onClick={clearFilters}>Сбросить всё</button>}
              <button className="catalog-filters__apply" type="button" onClick={() => setFiltersOpen(false)}>
                Показать {filteredProducts.length}
              </button>
            </div>
          </aside>
          {filtersOpen && <button className="catalog-filter-backdrop" type="button" aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)} />}

          <div className="catalog-results">
            {filteredProducts.length > 0 ? (
              <>
                <div className="product-grid">
                  {filteredProducts.slice(0, visibleCount).map((product) => <ProductCard product={product} key={product.id} />)}
                </div>
                {visibleCount < filteredProducts.length && (
                  <div className="catalog-load-more">
                    <p>Показано {Math.min(visibleCount, filteredProducts.length)} из {filteredProducts.length}</p>
                    <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                      Показать ещё
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="catalog-empty">
                <span aria-hidden="true">◇</span>
                <h3>Таких изделий пока не нашли</h3>
                <p>Попробуйте другое слово или снимите один из фильтров.</p>
                <button type="button" onClick={clearFilters}>Показать весь каталог</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="catalog-concierge">
        <div>
          <p className="catalog-eyebrow">Поможем выбрать</p>
          <h2>Ищете особенный подарок?</h2>
          <p>Расскажите, для кого он — наш консультант соберёт персональную подборку и ответит в Telegram.</p>
        </div>
        <a href="https://t.me/Kiss_Love_odsk" target="_blank" rel="noreferrer">Написать консультанту <span aria-hidden="true">↗</span></a>
      </section>

      <CatalogFooter />
    </main>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="catalog-filter-group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}
