import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { CookieSettingsLink } from "@/components/analytics/CookieSettingsLink";
import "../legal.css";

export const metadata: Metadata = {
  title: "Контакты и реквизиты — Wood&Clay",
  description: "Как связаться с Wood&Clay и официальные реквизиты продавца.",
};

export default function RekvizityPage() {
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
          <Link href="/vozvrat">Возврат</Link>
          <Link href="/privacy">Конфиденциальность</Link>
        </nav>
      </header>

      <section className="legal-hero">
        <p>Правовые документы · версия от 8 августа 2026</p>
        <h1>Контакты <span>и реквизиты</span></h1>
        <div>
          <p>По вопросам заказа, доставки или возврата — пишите или звоните, отвечаем в будни.</p>
          <a href={`mailto:${COMPANY.supportEmail}`}>Написать нам <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="legal-content" aria-label="Контакты и реквизиты">
        <article className="legal-section">
          <span>01</span>
          <h2>Служба поддержки</h2>
          <div>
            <p>
              Email: <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
              <br />
              Телефон: <a href={COMPANY.supportPhoneHref}>{COMPANY.supportPhone}</a>
              <br />
              Telegram: <a href={COMPANY.telegram} target="_blank" rel="noreferrer">t.me/Kiss_Love_odsk</a>
            </p>
            <p>Отвечаем на вопросы о заказе, оплате, доставке и возврате — см. также <Link href="/vozvrat">Политику возврата</Link> и <Link href="/oferta">Оферту</Link>.</p>
          </div>
        </article>

        <dl className="legal-requisites" aria-label="Официальные реквизиты продавца">
          <dt>Продавец</dt>
          <dd>{COMPANY.legalName}</dd>
          <dt>ИНН</dt>
          <dd>{COMPANY.inn}</dd>
          <dt>ОГРНИП</dt>
          <dd>{COMPANY.ogrnip}</dd>
          <dt>Адрес для корреспонденции</dt>
          <dd>{COMPANY.address}</dd>
          <dt>Контактный телефон</dt>
          <dd><a href={COMPANY.legalPhoneHref}>{COMPANY.legalPhone}</a></dd>
        </dl>
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
