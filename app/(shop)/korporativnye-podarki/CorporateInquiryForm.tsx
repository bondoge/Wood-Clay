"use client";

import { useState } from "react";

type ContactMethod = "email" | "telegram" | "phone";
type SubmitStatus = "idle" | "submitting" | "error";

const contactMethods: Record<
  ContactMethod,
  {
    label: string;
    fieldLabel: string;
    placeholder: string;
    type: "email" | "text" | "tel";
    autoComplete: string;
  }
> = {
  email: {
    label: "Email",
    fieldLabel: "Рабочая почта",
    placeholder: "name@company.ru",
    type: "email",
    autoComplete: "email",
  },
  telegram: {
    label: "Telegram",
    fieldLabel: "Имя в Telegram",
    placeholder: "@username",
    type: "text",
    autoComplete: "off",
  },
  phone: {
    label: "Телефон",
    fieldLabel: "Номер телефона",
    placeholder: "+7 999 000-00-00",
    type: "tel",
    autoComplete: "tel",
  },
};

// Shared by the homepage's #custom section and /korporativnye-podarki — the
// same form, same /api/corporate-quote endpoint, mounted in two places so
// there's exactly one implementation to keep working.
export function CorporateInquiryForm() {
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");

  const activeContact = contactMethods[contactMethod];

  return (
    <div className="inquiry-card" id="contact">
      {formSubmitted ? (
        <div className="inquiry-success" role="status" aria-live="polite">
          <span className="inquiry-success__mark" aria-hidden="true">✓</span>
          <p className="inquiry-card__eyebrow">Заявка принята</p>
          <h3>Спасибо — всё получили.</h3>
          <p>
            Менеджер изучит сообщение и свяжется с вами выбранным способом
            в ближайшее рабочее время.
          </p>
          <button type="button" onClick={() => setFormSubmitted(false)}>
            Отправить ещё одну заявку
          </button>
        </div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitStatus("submitting");

            const formData = new FormData(event.currentTarget);
            const payload = Object.fromEntries(formData.entries());

            try {
              const res = await fetch("/api/corporate-quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (res.ok) {
                setSubmitStatus("idle");
                setFormSubmitted(true);
              } else {
                setSubmitStatus("error");
              }
            } catch {
              setSubmitStatus("error");
            }
          }}
        >
          <div className="inquiry-card__heading">
            <div>
              <p className="inquiry-card__eyebrow">Заявка на сотрудничество</p>
              <h3>Как с вами связаться?</h3>
            </div>
            <span>≈ 1 минута</span>
          </div>

          <div className="inquiry-grid">
            <label className="field">
              <span>Ваше имя</span>
              <input
                name="name"
                type="text"
                placeholder="Как к вам обращаться"
                autoComplete="name"
                required
              />
            </label>
            <label className="field">
              <span>Компания <em>необязательно</em></span>
              <input
                name="company"
                type="text"
                placeholder="Название компании"
                autoComplete="organization"
              />
            </label>
          </div>

          <fieldset className="contact-choice">
            <legend>Удобный способ связи</legend>
            <div className="contact-choice__options">
              {(Object.keys(contactMethods) as ContactMethod[]).map((method) => (
                <label
                  className={contactMethod === method ? "is-selected" : ""}
                  key={method}
                >
                  <input
                    type="radio"
                    name="contactMethod"
                    value={method}
                    checked={contactMethod === method}
                    onChange={() => setContactMethod(method)}
                  />
                  <span>{contactMethods[method].label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field field--contact">
            <span>{activeContact.fieldLabel}</span>
            <input
              key={contactMethod}
              name="contact"
              type={activeContact.type}
              placeholder={activeContact.placeholder}
              autoComplete={activeContact.autoComplete}
              required
            />
          </label>

          <label className="field field--message">
            <span>Комментарий <em>необязательно</em></span>
            <textarea
              name="message"
              placeholder="Например: примерный тираж, дата, пожелания по росписи или брендированию"
              rows={4}
            />
          </label>

          <label className="field field--consent">
            <input
              type="checkbox"
              name="consent"
              value="true"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            <span>
              Отправляя форму, вы соглашаетесь на обработку контактных
              данных в соответствии с{" "}
              <a href="/privacy">
                политикой конфиденциальности
              </a>
              .
            </span>
          </label>

          <button
            className="inquiry-submit"
            type="submit"
            disabled={submitStatus === "submitting"}
          >
            <span>
              {submitStatus === "submitting"
                ? "Отправляем…"
                : "Обсудить большой заказ"}
            </span>
            <span aria-hidden="true">↗</span>
          </button>

          {submitStatus === "error" ? (
            <p className="inquiry-error">
              Не удалось отправить заявку. Напишите нам в Telegram или
              позвоните — контакты внизу страницы.
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
