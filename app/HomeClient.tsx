"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CollectionsBlock } from "./(shop)/catalog/CollectionsBlock";
import { HeaderAccountActions, MobileAccountLink, MobileNavToggle } from "./(shop)/catalog/catalog-components";
import type { CollectionTile } from "./(shop)/catalog/collections";
import { CookieSettingsLink } from "@/components/analytics/CookieSettingsLink";
import { CorporateInquiryForm } from "./(shop)/korporativnye-podarki/CorporateInquiryForm";

const BASE_URL =
  "https://1bdb1afd-641e-4c4c-be89-1010e798b2e5.selstorage.ru/reviews/";

const CATALOG_PDF_URL =
  "https://1bdb1afd-641e-4c4c-be89-1010e798b2e5.selstorage.ru/documents/catalog.pdf";

const CATALOG_HREF = "/catalog";
const ACCOUNT_HREF = "/account";

type Review = {
  name: string;
  text: string;
  images: string[];
  objectPosition?: string;
};

const reviews: Review[] = [
  {
    name: "Анна",
    text: "Всё как в карточке. Лошадка — восторг! Спасибо за 100% соответствие: не часто встретишь, чтобы картинка и товар были идентичны. И спасибо производителю за красоту. Ещё и подарок положили!",
    images: ["anna.PNG"],
    objectPosition: "48% 50%",
  },
  {
    name: "Тамара",
    text: "Вживую фигурки оказались ещё круче, чем на фото. Влюбилась в этих кошечек. Буду ещё заказывать другие изделия. К покупке советую!",
    images: ["tamara.PNG"],
  },
  {
    name: "Светлана",
    text: "Очень милая машинка! Качественная, лёгкая, запакована в бумагу, пупырку и коробочку. Ровный рисунок, петелька для крепления и шнурок. Самая первая висит на ёлке в этом году. Игрушка с душой — а в подарок ещё крошечная божья коровка на магните.",
    images: ["svetlana.PNG"],
    objectPosition: "50% 48%",
  },
  {
    name: "Оксана",
    text: "Мои любимые, самые шикарные конфетки в коллекции. С нетерпением жду пополнения другими расцветками. Спасибо, дорогие волшебники, что создали такую красоту — они волшебные!",
    images: ["oksana_01.PNG", "oksana_02.PNG", "oksana_03.PNG"],
  },
  {
    name: "Юлия",
    text: "Милота, которая органично вписалась в мою коллекцию. Фарфор тонкий, игрушка лёгкая — можно повесить даже на верхние ветки. Очень довольна!",
    images: ["yulia_01.PNG", "yulia_02.PNG"],
  },
  {
    name: "Алина",
    text: "Забрала свою красавицу. Прорисовка отличная, детальная. Игрушка лёгкая по весу. Очень довольна покупкой.",
    images: ["alina_01.PNG", "alina_02.PNG"],
  },
  {
    name: "Галина",
    text: "Отличная лошадка, аккуратно сделана, красивая роспись художницы Зверковой.",
    images: ["galina.PNG"],
    objectPosition: "50% 52%",
  },
  {
    name: "Ирина",
    text: "Великолепно выполнен!",
    images: ["irina.PNG"],
  },
  {
    name: "Юлия",
    text: "Красивая, блестит. За маленький подарок — спасибо!",
    images: ["yulia_10Jan.PNG"],
  },
];

// 2371/2420/2421 404 against the S3 bucket (files never uploaded or since
// removed) — excluded rather than left to render as grey placeholder tiles.
const MISSING_ARCHIVE_IMAGE_NUMBERS = new Set([2371, 2420, 2421]);
const archiveImages = Array.from(
  { length: 2468 - 2313 + 1 },
  (_, index) => 2313 + index,
)
  .filter((n) => !MISSING_ARCHIVE_IMAGE_NUMBERS.has(n))
  .map((n) => `grid-600/IMG_${n}.webp`);

const wallRows = [
  archiveImages.slice(0, 52),
  archiveImages.slice(52, 104),
  archiveImages.slice(104),
];

function imageUrl(name: string) {
  return `${BASE_URL}${name}`;
}

function Stars() {
  return (
    <span className="stars" aria-label="5 из 5 звёзд">
      <span aria-hidden="true">★★★★★</span>
    </span>
  );
}

function WallRow({ images, index }: { images: string[]; index: number }) {
  return (
    <div className={`wall-row wall-row--${index}`}>
      <div className="wall-row__track">
        {[0, 1].map((copy) => (
          <div className="wall-row__set" key={copy}>
            {images.map((image, imageIndex) => (
              <img
                className={imageIndex % 7 === 0 ? "is-wide" : ""}
                key={`${copy}-${image}`}
                src={imageUrl(image)}
                alt=""
                width="450"
                height="600"
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewWall() {
  return (
    <div className="review-wall" aria-hidden="true">
      {wallRows.map((row, index) => (
        <WallRow images={row} index={index} key={index} />
      ))}
    </div>
  );
}

export default function HomeClient({ collectionTiles }: { collectionTiles: CollectionTile[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const pointerStart = useRef<number | null>(null);
  const activeReview = reviews[activeIndex];

  const goTo = (direction: number) => {
    setActiveIndex((current) =>
      (current + direction + reviews.length) % reviews.length,
    );
    setMediaIndex(0);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goTo(1);
      if (event.key === "ArrowLeft") goTo(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Link
        className="catalog-cta"
        href={CATALOG_HREF}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty(
            "--cursor-x",
            `${event.clientX - bounds.left}px`,
          );
          event.currentTarget.style.setProperty(
            "--cursor-y",
            `${event.clientY - bounds.top}px`,
          );
        }}
      >
        <span>Смотреть каталог</span>
        <span className="catalog-cta__arrow" aria-hidden="true">↗</span>
      </Link>

    <main>

      <section className="hero" aria-labelledby="hero-heading">
        <video
          className="hero__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero-poster.jpg"
          aria-hidden="true"
        >
          <source
            src="https://1bdb1afd-641e-4c4c-be89-1010e798b2e5.selstorage.ru/hero_video/hero_video_3.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero__shade" aria-hidden="true" />

        <header className="site-header">
          <a className="brand" href="#top" aria-label="Wood&Clay — на главную">
            <img
              className="brand__mark"
              src="/woodclay-mark.png"
              alt=""
              width="76"
              height="58"
            />
            <img
              className="brand__wordmark"
              src="/woodclay-wordmark.svg"
              alt="Wood&Clay"
              width="100"
              height="19"
            />
          </a>

          <nav className="site-header__nav" aria-label="Основная навигация">
            <a href="#top">Главная</a>
            <Link href="/o-nas">О нас</Link>
            <Link href="/korporativnye-podarki">Корпоративным клиентам</Link>
            <Link href="/kontakty">Контакты</Link>
          </nav>

          <nav className="site-header__actions" aria-label="Каталог, кабинет и корзина">
            <HeaderAccountActions />
            <MobileNavToggle>
              <a href="#top">Главная</a>
              <Link href="/o-nas">О нас</Link>
              <Link href="/korporativnye-podarki">Корпоративным клиентам</Link>
              <Link href="/kontakty">Контакты</Link>
              <MobileAccountLink />
            </MobileNavToggle>
          </nav>
        </header>

        <div className="hero__content" id="top">
          <p className="hero__kicker">Фарфор · ручная роспись · сделано в России</p>
          <h1 id="hero-heading">
            Маленькие произведения искусства,
            <br /> созданные для вас
          </h1>
          <p className="hero__lead">
            Фарфоровые фигурки и подарки, расписанные вручную.
            <br /> Для дома, важных событий и историй, которые хочется сохранить.
          </p>
        </div>

        <a className="hero__scroll" href="#about" aria-label="Перейти к следующему разделу">
          <span>Листайте</span>
          <span className="hero__scroll-line" aria-hidden="true" />
        </a>
      </section>

      <section className="creation" id="about" aria-labelledby="creation-heading">
        <div className="creation__copy">
          <p className="section-kicker">Что мы создаём</p>
          <h2 id="creation-heading">Искусство, которое остаётся навсегда</h2>
          <p>
            От одной ёлочной игрушки до целой коллекции — каждое изделие
            начинается с эскиза и проходит через руки наших художников.
          </p>
        </div>

        <div className="creation__art" aria-hidden="true">
          <span className="creation__halo" />
          <img
            src="/right-flower.svg"
            alt=""
            width="1181"
            height="1332"
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      <section className="craft" aria-labelledby="craft-heading">
        <figure className="craft__art">
          <span className="craft__art-halo" aria-hidden="true" />
          <img
            src="/zhostovo-floral-ornament-left.png"
            alt="Цветочная роспись в жостовской традиции"
            width="1710"
            height="1074"
            loading="lazy"
            decoding="async"
          />
          <figcaption>
            <span>Роспись вручную</span>
            <p>След кисти делает каждое изделие единственным.</p>
          </figcaption>
        </figure>

        <div className="craft__content">
          <p className="section-kicker section-kicker--gold">Почему ручная работа</p>
          <h2 id="craft-heading">Потому что безупречное уступает живому.</h2>
          <p className="craft__lead">
            Присмотритесь — и вы увидите руку художника: лёгкое движение
            лепестка, мазок, деталь, которая принадлежит только этому изделию.
          </p>

          <div className="craft__principles">
            <article>
              <span>01</span>
              <div>
                <h3>Продуманная форма</h3>
                <p>Фарфор, выбранный за гармонию, выразительность и особое обаяние.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Роспись вручную</h3>
                <p>Слой за слоем, тонкими кистями и уверенной рукой художника.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Создано надолго</h3>
                <p>Обжиг, проверка и бережная упаковка — чтобы радовать не одно поколение.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="reviews" id="reviews" aria-labelledby="reviews-heading">
        <header className="reviews__intro">
          <div>
            <p className="eyebrow">Отзывы клиентов</p>
            <h2 id="reviews-heading">Нам доверяют</h2>
          </div>
          <div className="reviews__context">
            <p>
              Больше 3500 постоянных клиентов. Истории тех, у кого наши
              игрушки уже дома и на ёлке.
            </p>
            <div className="trust-chips" aria-label="Доверие клиентов">
              <span><strong>3500+</strong> постоянных клиентов</span>
              <span><strong>1000+</strong> фотоотзывов</span>
            </div>
          </div>
        </header>

        <ReviewWall />

        <article
          className="spotlight"
          key={activeIndex}
          aria-roledescription="отзыв"
          onPointerDown={(event) => {
            pointerStart.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (pointerStart.current === null) return;
            const delta = event.clientX - pointerStart.current;
            pointerStart.current = null;
            if (Math.abs(delta) > 48) goTo(delta < 0 ? 1 : -1);
          }}
          onPointerCancel={() => {
            pointerStart.current = null;
          }}
        >
          <div className="spotlight__media">
            <img
              src={imageUrl(activeReview.images[mediaIndex] ?? activeReview.images[0])}
              alt={`Фотография клиента к отзыву — ${activeReview.name}`}
              style={{ objectPosition: activeReview.objectPosition ?? "50% 50%" }}
              width="450"
              height="600"
              loading="eager"
              decoding="async"
            />
            {activeReview.images.length > 1 && (
              <button
                className="media-count"
                type="button"
                onClick={() =>
                  setMediaIndex((current) =>
                    (current + 1) % activeReview.images.length,
                  )
                }
                aria-label={`Показать следующее фото. Фото ${mediaIndex + 1} из ${activeReview.images.length}`}
              >
                {mediaIndex + 1} / {activeReview.images.length}
              </button>
            )}
          </div>

          <div className="spotlight__body">
            <div className="spotlight__author">
              <div>
                <Stars />
                <h2>{activeReview.name}</h2>
              </div>
              <span className="verified">Проверенная покупка</span>
            </div>

            <blockquote>
              <p>«{activeReview.text}»</p>
            </blockquote>

            <footer className="spotlight__footer">
              <span className="review-index">
                {String(activeIndex + 1).padStart(2, "0")} / {String(reviews.length).padStart(2, "0")}
              </span>
              <div className="nav-capsule">
                <button type="button" onClick={() => goTo(-1)} aria-label="Предыдущий отзыв">
                  <span aria-hidden="true">←</span>
                </button>
                <button type="button" onClick={() => goTo(1)} aria-label="Следующий отзыв">
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </footer>
          </div>
        </article>

        <p className="sr-only" aria-live="polite">
          Отзыв {activeIndex + 1} из {reviews.length}, {activeReview.name}
        </p>
      </section>

      <CollectionsBlock
        tiles={collectionTiles}
        ctaLabel="Смотреть каталог"
        hrefFor={(kind, id) => `/catalog?${kind}=${encodeURIComponent(id)}`}
      />

      <section className="bulk-order" id="custom" aria-labelledby="bulk-order-heading">
        <div className="bulk-order__glow bulk-order__glow--one" aria-hidden="true" />
        <div className="bulk-order__glow bulk-order__glow--two" aria-hidden="true" />

        <div className="bulk-order__intro">
          <p className="bulk-order__kicker">Для компаний</p>
          <h2 id="bulk-order-heading">Большой заказ — обсудим лично.</h2>
          <p className="bulk-order__lead">
            Выбираете подарки для команды, клиентов или события? Оставьте
            удобный контакт — менеджер уточнит задачу, тираж и сроки, а затем
            предложит персональные условия.
          </p>

          <div className="bulk-order__benefits" aria-label="Что можно обсудить">
            <span>Специальная цена</span>
            <span>Корпоративная символика</span>
            <span>Подбор изделий и упаковки</span>
          </div>

          <div className="bulk-order__steps" aria-label="Как это работает">
            <div>
              <span>01</span>
              <p>Вы оставляете удобный способ связи.</p>
            </div>
            <div>
              <span>02</span>
              <p>Менеджер лично уточняет детали заказа.</p>
            </div>
            <div>
              <span>03</span>
              <p>Мы готовим предложение по цене и срокам.</p>
            </div>
          </div>
        </div>

        <CorporateInquiryForm />
      </section>

      <section
        className="catalog-download"
        id="catalog-pdf"
        aria-labelledby="catalog-download-heading"
      >
        <div className="catalog-download__copy">
          <p className="catalog-download__kicker">Каталог для бизнеса</p>
          <h2 id="catalog-download-heading">
            Коллекция, которую удобно переслать.
          </h2>
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

          <a
            className="catalog-download__button"
            href={CATALOG_PDF_URL}
            download
            aria-label="Скачать PDF-каталог"
          >
            <span>Скачать PDF-каталог</span>
            <span aria-hidden="true">↓</span>
          </a>
          <p className="catalog-download__note">
            Можно сохранить, распечатать или отправить коллегам.
          </p>
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
    </main>

    <footer className="site-footer" id="contacts">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <a className="footer-brand" href="#top" aria-label="Wood&Clay — наверх">
              <img
                src="/woodclay-mark.png"
                alt=""
                width="76"
                height="58"
              />
              <img
                src="/woodclay-wordmark.svg"
                alt="Wood&Clay"
                width="100"
                height="19"
              />
            </a>
            <p>Фарфоровые игрушки и фигурки, расписанные вручную.</p>
          </div>

          <nav className="footer-column" aria-label="Навигация по сайту">
            <p>Навигация</p>
            <a href="#top">Главная</a>
            <Link href="/o-nas">О нас</Link>
            <Link href="/kontakty">Контакты</Link>
            <Link href="/korporativnye-podarki">Корпоративным клиентам</Link>
            <Link href={CATALOG_HREF}>Каталог</Link>
            <Link href={ACCOUNT_HREF}>Личный кабинет</Link>
            <Link href="/oferta">Оферта</Link>
            <Link href="/vozvrat">Возврат и обмен</Link>
            <Link href="/rekvizity">Реквизиты</Link>
          </nav>

          <div className="footer-column footer-column--contacts">
            <p>Связаться</p>
            <a href="mailto:woodandclay.help@mail.ru">
              woodandclay.help@mail.ru
              <span aria-hidden="true">↗</span>
            </a>
            <a href="tel:+79153909884">
              +7 915 390-98-84
              <span aria-hidden="true">↗</span>
            </a>
            <a href="https://t.me/Kiss_Love_odsk" target="_blank" rel="noreferrer">
              Telegram
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="footer-column footer-column--social">
            <p>Социальные сети</p>
            <a href="https://t.me/Kiss_Love_odsk" target="_blank" rel="noreferrer">
              Telegram
            </a>
          </div>
        </div>

        <div className="site-footer__meta">
          <span>© 2026 Wood&Clay</span>
          <span>Сделано вручную в России</span>
          <span className="site-footer__meta-end">
            <a href="/privacy">Политика конфиденциальности</a>
            <CookieSettingsLink />
          </span>
        </div>
      </div>

      <a className="footer-wordmark" href="#top" aria-label="Wood&Clay — вернуться наверх">
        <span className="footer-wordmark__texture" aria-hidden="true" />
      </a>
    </footer>
    </>
  );
}
