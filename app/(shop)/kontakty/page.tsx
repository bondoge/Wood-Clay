import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { CatalogHeader, CatalogFooter } from "../catalog/catalog-components";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import "../catalog/catalog.css";

export const metadata: Metadata = {
  title: "Контакты — Wood&Clay",
  description: "Телефон, email и Telegram Wood&Clay, доставка по всей России, реквизиты продавца.",
};

export default function ContactsPage() {
  return (
    <main className="catalog-page kontakty-page">
      <BreadcrumbJsonLd crumbs={[{ name: "Контакты", path: "/kontakty" }]} />
      <CatalogHeader />

      <div className="product-breadcrumbs">
        <span>Контакты</span>
      </div>

      <section className="product-story" aria-labelledby="contacts-heading">
        <p className="catalog-eyebrow">Свяжитесь с нами</p>
        <h1 id="contacts-heading">Контакты</h1>
        <p>
          Отвечаем на вопросы о заказе, оплате, доставке и возврате в будни.
          Доставляем по всей России через СДЭК — интернет-магазин без
          розничного шоурума, весь заказ оформляется онлайн.
        </p>
      </section>

      <section className="product-detail product-detail--single" aria-label="Способы связи и реквизиты">
        <aside className="product-detail__info">
          <dl className="product-detail__facts">
            <div>
              <dt>Телефон</dt>
              <dd><a href={COMPANY.supportPhoneHref}>{COMPANY.supportPhone}</a></dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd><a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a></dd>
            </div>
            <div>
              <dt>Telegram</dt>
              <dd>
                <a href={COMPANY.telegram} target="_blank" rel="noreferrer">
                  t.me/Kiss_Love_odsk
                </a>
              </dd>
            </div>
            <div>
              <dt>Регион обслуживания</dt>
              <dd>Вся Россия (доставка СДЭК)</dd>
            </div>
            <div>
              <dt>Продавец</dt>
              <dd>{COMPANY.legalName}</dd>
            </div>
            <div>
              <dt>ИНН</dt>
              <dd>{COMPANY.inn}</dd>
            </div>
            <div>
              <dt>ОГРНИП</dt>
              <dd>{COMPANY.ogrnip}</dd>
            </div>
          </dl>
          <p className="product-detail__reply">
            Полные реквизиты и адрес для корреспонденции — на странице{" "}
            <Link href="/rekvizity">Реквизиты</Link>. Вопросы о доставке и
            возврате — в <Link href="/vozvrat">Политике возврата</Link> и{" "}
            <Link href="/oferta">Оферте</Link>.
          </p>
        </aside>
      </section>

      <CatalogFooter />
    </main>
  );
}
