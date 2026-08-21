import type { Metadata } from "next";
import { CatalogHeader, CatalogFooter } from "../catalog/catalog-components";
import { CorporateInquiryForm } from "./CorporateInquiryForm";
import { CatalogPdfDownload } from "@/components/catalog/CatalogPdfDownload";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { FAQJsonLd } from "@/components/seo/FAQJsonLd";
import "../catalog/catalog.css";

export const metadata: Metadata = {
  title: "Корпоративные подарки — Wood&Clay",
  description:
    "Фарфоровые новогодние подарки для компаний: от 50 единиц, корпоративная символика, подбор изделий и упаковки. Обсудим тираж, оформление и сроки лично.",
};

const faqEntries = [
  {
    question: "Какой минимальный тираж для корпоративного заказа?",
    answer: "От 50 единиц. Точное количество и стоимость за штуку обсуждаем индивидуально в зависимости от изделий.",
  },
  {
    question: "Можно нанести логотип или символику компании?",
    answer: "Да — варианты нанесения корпоративной символики или логотипа на упаковку обсуждаем на консультации.",
  },
  {
    question: "Сколько времени занимает выполнение заказа?",
    answer: "Сроки зависят от тиража и сложности росписи каждого изделия — менеджер называет точную дату после уточнения деталей заказа.",
  },
  {
    question: "Как получить каталог для закупочной команды?",
    answer: "Скачайте PDF-каталог на этой странице или запросите его вместе с расчётом стоимости через форму выше.",
  },
];

export default function CorporatePage() {
  return (
    <main className="catalog-page korporativnye-page">
      <BreadcrumbJsonLd crumbs={[{ name: "Корпоративным клиентам", path: "/korporativnye-podarki" }]} />
      <FAQJsonLd entries={faqEntries} />
      <CatalogHeader />

      <div className="product-breadcrumbs">
        <span>Корпоративным клиентам</span>
      </div>

      <section className="bulk-order" aria-labelledby="corporate-heading">
        <div className="bulk-order__glow bulk-order__glow--one" aria-hidden="true" />
        <div className="bulk-order__glow bulk-order__glow--two" aria-hidden="true" />

        <div className="bulk-order__intro">
          <p className="bulk-order__kicker">Для компаний</p>
          <h1 id="corporate-heading">Новогодние подарки для команды и партнёров</h1>
          <p className="bulk-order__lead">
            Фарфоровые ёлочные игрушки и фигурки ручной работы — тираж от 50
            единиц, с возможностью корпоративной символики и подбора
            упаковки под бюджет и сроки. Оставьте контакт — обсудим детали
            лично и подготовим предложение по цене и срокам.
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

      <section className="product-story" aria-label="Подробнее об условиях">
        <p className="catalog-eyebrow">Условия</p>
        <h2>Тираж, символика, упаковка и сроки</h2>
        <p>
          Минимальный тираж корпоративного заказа — от 50 единиц; для
          крупных заказов (300–1000+ единиц) действуют отдельные условия по
          цене. Каждое изделие расписывается вручную, поэтому финальная
          цена за штуку зависит от выбранной коллекции и объёма заказа —
          точный расчёт мы присылаем после консультации.
        </p>
        <p>
          Возможно нанесение корпоративной символики или логотипа на
          упаковку — варианты и ограничения обсуждаем индивидуально. Так же
          индивидуально подбираем упаковку: от простой подарочной коробки
          до брендированного оформления партии.
        </p>
        <p>
          Сроки изготовления зависят от тиража и сложности росписи — мы не
          называем фиксированный срок заранее, чтобы не давать неточных
          обещаний: менеджер подтверждает точную дату после того, как
          согласован состав заказа.
        </p>
      </section>

      <CatalogPdfDownload />

      <section className="product-story" aria-label="Частые вопросы">
        <p className="catalog-eyebrow">Вопросы</p>
        <h2>Частые вопросы о корпоративных заказах</h2>
        <dl className="faq-list">
          {faqEntries.map((entry) => (
            <div key={entry.question}>
              <dt>{entry.question}</dt>
              <dd>{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <CatalogFooter />
    </main>
  );
}
