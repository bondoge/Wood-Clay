const CATALOG_PDF_URL =
  "https://1bdb1afd-641e-4c4c-be89-1010e798b2e5.selstorage.ru/documents/catalog.pdf";

// The PDF lead-magnet block — same file, same copy, on the homepage,
// /korporativnye-podarki, and /novogodnie-podarki-2027 (a corporate buyer
// forwards this internally; the HTML page around it is what actually earns
// search traffic). `id` is only set on the homepage, for its `#catalog-pdf`
// anchor link — the other two pages don't need one.
export function CatalogPdfDownload({ id }: { id?: string } = {}) {
  return (
    <section className="catalog-download" id={id} aria-labelledby="catalog-download-heading">
      <div className="catalog-download__copy">
        <p className="catalog-download__kicker">Каталог для бизнеса</p>
        <h2 id="catalog-download-heading">Коллекция, которую удобно переслать.</h2>
        <p className="catalog-download__lead">
          Один файл для закупочной команды: направления коллекции, варианты
          росписи, упаковка и возможности корпоративного оформления.
        </p>

        <div className="catalog-download__details" aria-label="О каталоге">
          <div>
            <span>Формат</span>
            <strong>PDF</strong>
          </div>
          <div>
            <span>Внутри</span>
            <strong>Коллекции и условия</strong>
          </div>
          <div>
            <span>Для кого</span>
            <strong>Компании и агентства</strong>
          </div>
        </div>

        <a className="catalog-download__button" href={CATALOG_PDF_URL} download aria-label="Скачать PDF-каталог">
          <span>Скачать PDF-каталог</span>
          <span aria-hidden="true">↓</span>
        </a>
        <p className="catalog-download__note">Можно сохранить, распечатать или отправить коллегам.</p>
      </div>

      <div className="catalog-preview" aria-hidden="true">
        <span className="catalog-preview__shadow" />
        <span className="catalog-preview__sheet catalog-preview__sheet--back" />
        <span className="catalog-preview__sheet catalog-preview__sheet--middle" />

        <article className="catalog-cover">
          <header className="catalog-cover__brand">
            <img
              className="catalog-cover__mark"
              src="/woodclay-mark.png"
              alt=""
              width="76"
              height="58"
            />
            <img
              className="catalog-cover__wordmark"
              src="/woodclay-wordmark.svg"
              alt=""
              width="100"
              height="19"
            />
          </header>

          <div className="catalog-cover__art">
            <span />
            <img
              src="/right-flower.svg"
              alt=""
              width="1181"
              height="1332"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="catalog-cover__copy">
            <p>Корпоративная коллекция</p>
            <h3>Фарфор, который становится частью истории</h3>
          </div>

          <footer>
            <span>Wood&Clay</span>
            <span>2026</span>
          </footer>
        </article>

        <div className="catalog-preview__label">
          <span>PDF</span>
          <p>Каталог корпоративной коллекции</p>
        </div>
      </div>
    </section>
  );
}
