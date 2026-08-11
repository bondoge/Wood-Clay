import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { CookieSettingsLink } from "@/components/analytics/CookieSettingsLink";
import "../legal.css";

export const metadata: Metadata = {
  title: "Возврат и обмен — Wood&Clay",
  description: "Условия и порядок возврата товара, купленного в интернет-магазине Wood&Clay.",
};

const sections = [
  {
    number: "01",
    title: "Право на возврат",
    content: (
      <>
        <p>В соответствии со ст. 26.1 Закона РФ «О защите прав потребителей» Покупатель вправе отказаться от Товара в любое время до его получения, а также в течение 7 дней после получения — без объяснения причин.</p>
        <p>Если при получении заказа информация о порядке и сроках возврата не была предоставлена в письменной форме, этот срок увеличивается до 3 месяцев.</p>
      </>
    ),
  },
  {
    number: "02",
    title: "Условия возврата",
    content: (
      <ul>
        <li>товар не был в употреблении;</li>
        <li>сохранены товарный вид, упаковка и потребительские свойства;</li>
        <li>есть документ, подтверждающий покупку (номер заказа, чек), либо иное подтверждение факта и условий покупки.</li>
      </ul>
    ),
  },
  {
    number: "03",
    title: "Как оформить возврат",
    content: (
      <>
        <p>Напишите на <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a> или позвоните на <a href={COMPANY.supportPhoneHref}>{COMPANY.supportPhone}</a>, укажите номер заказа и причину возврата. Мы согласуем способ и адрес отправки.</p>
        <p>Возврат стоимости Товара производится в течение 10 дней с момента получения возвращённого изделия тем же способом, которым была произведена оплата.</p>
      </>
    ),
  },
  {
    number: "04",
    title: "Кто оплачивает доставку",
    content: (
      <>
        <p>Если Покупатель отказывается от Товара без претензий к его качеству, стоимость обратной доставки оплачивает Покупатель.</p>
        <p>Если причина возврата — брак, повреждение при доставке или пересортица, доставку в обе стороны оплачивает Продавец, а Покупателю возвращается полная стоимость заказа, включая доставку.</p>
      </>
    ),
  },
  {
    number: "05",
    title: "Обмен",
    content: (
      <p>Обмен на другое изделие возможен по договорённости — фактически оформляется как возврат с последующим оформлением нового заказа.</p>
    ),
  },
];

export default function VozvratPage() {
  return (
    <main className="legal-page">
      <header className="legal-nav">
        <Link className="legal-brand" href="/" aria-label="Wood&Clay — на главную">
          <img src="/woodclay-mark.png" alt="" width="76" height="58" />
          <img src="/woodclay-wordmark.svg" alt="Wood&Clay" width="100" height="19" />
        </Link>
        <nav aria-label="Навигация">
          <Link href="/">Главная</Link>
          <Link href="/oferta">Оферта</Link>
          <Link href="/rekvizity">Реквизиты</Link>
          <Link href="/privacy">Конфиденциальность</Link>
        </nav>
      </header>

      <section className="legal-hero">
        <p>Правовые документы · версия от 8 августа 2026</p>
        <h1>Возврат <span>и обмен</span></h1>
        <div>
          <p>Как отказаться от заказа или вернуть изделие — сроки, условия и порядок возврата денег.</p>
          <a href={`mailto:${COMPANY.supportEmail}`}>Оформить возврат <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="legal-content" aria-label="Содержание политики возврата">
        {sections.map((section) => (
          <article className="legal-section" key={section.number}>
            <span>{section.number}</span>
            <h2>{section.title}</h2>
            <div>{section.content}</div>
          </article>
        ))}
      </section>

      <footer className="legal-footer">
        <span>© 2026 Wood&amp;Clay</span>
        <Link href="/">Вернуться на главную</Link>
        <span className="legal-footer__end">
          <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
          <CookieSettingsLink />
        </span>
      </footer>
    </main>
  );
}
