import type { Metadata } from "next";
import Link from "next/link";
import { CatalogHeader, CatalogFooter } from "../catalog/catalog-components";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import "../catalog/catalog.css";

export const metadata: Metadata = {
  title: "О нас — Wood&Clay",
  description:
    "Wood&Clay — фарфоровые ёлочные игрушки и фигурки, расписанные вручную в России. Как создаются изделия и почему нам доверяют 3500+ клиентов.",
};

export default function AboutPage() {
  return (
    <main className="catalog-page o-nas-page">
      <BreadcrumbJsonLd crumbs={[{ name: "О нас", path: "/o-nas" }]} />
      <CatalogHeader />

      <div className="product-breadcrumbs">
        <span>О нас</span>
      </div>

      <section className="creation" aria-labelledby="about-heading">
        <div className="creation__copy">
          <p className="section-kicker">Сделано вручную в России</p>
          <h1 id="about-heading">Искусство, которое остаётся навсегда</h1>
          <p>
            Wood&Clay делает фарфоровые ёлочные игрушки и интерьерные
            фигурки — от одной игрушки до целой коллекции. Каждое изделие
            начинается с эскиза и проходит через руки наших художников: свою
            мастерскую и кураторскую сеть партнёрских мастерских, где
            изделия расписывают в традициях гжели, хохломы и в авторской
            манере.
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
          <p className="section-kicker section-kicker--gold">Как это сделано</p>
          <h2 id="craft-heading">От эскиза до готового изделия</h2>
          <p className="craft__lead">
            Присмотритесь — и вы увидите руку художника: лёгкое движение
            лепестка, мазок, деталь, которая принадлежит только этому
            изделию. Наши покупатели замечают это сами — например, в
            отзывах отдельно отмечают работу художницы Зверковой.
          </p>

          <div className="craft__principles">
            <article>
              <span>01</span>
              <div>
                <h3>Форма</h3>
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
                <h3>Обжиг и проверка</h3>
                <p>Обжиг, проверка и бережная упаковка — чтобы радовать не одно поколение.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="product-story" aria-label="Кому мы доверяем">
        <p className="catalog-eyebrow">Нам доверяют</p>
        <h2>3500+ постоянных клиентов</h2>
        <p>
          Больше 3500 постоянных клиентов и свыше 1000 фотоотзывов — истории
          тех, у кого наши игрушки уже дома и на ёлке. Полные юридические
          реквизиты и контакты — на странице{" "}
          <Link href="/rekvizity">Реквизиты</Link>.
        </p>
      </section>

      <CatalogFooter />
    </main>
  );
}
