"use client";

import Link from "next/link";
import type { CollectionTile } from "./collections";
import { pluralizeProducts } from "./catalog-utils";

type CollectionKind = "style" | "category";

type CollectionsBlockProps = {
  tiles: CollectionTile[];
  ctaLabel?: string;
  selectedStyles?: string[];
  selectedCategories?: string[];
  onSelect?: (kind: CollectionKind, id: string) => void;
  hrefFor?: (kind: CollectionKind, id: string) => string;
};

export function CollectionsBlock({
  tiles,
  ctaLabel = "Смотреть товары",
  selectedStyles = [],
  selectedCategories = [],
  onSelect,
  hrefFor,
}: CollectionsBlockProps) {
  return (
    <section className="catalog-collections" aria-labelledby="collections-heading">
      <div className="catalog-section-heading">
        <p className="catalog-eyebrow">Коллекции</p>
        <h2 id="collections-heading">Найдите свою коллекцию</h2>
        <p className="catalog-section-heading__hint">Выберите роспись или тему — мы сразу покажем подходящие изделия ниже.</p>
      </div>
      <div className="catalog-collection-grid">
        {tiles.map(({ id, kind, label, image, count }) => {
          const isSelected = kind === "style" ? selectedStyles.includes(id) : selectedCategories.includes(id);
          const className = `collection-tile${isSelected ? " is-selected" : ""}`;
          const content = (
            <>
              <img src={image} alt="" width="520" height="390" loading="eager" />
              <span className="collection-tile__veil" />
              <span className="collection-tile__label">
                <small>{count} {pluralizeProducts(count)}</small>
                {label}
                <em>{ctaLabel} <span aria-hidden="true">↓</span></em>
              </span>
            </>
          );

          if (hrefFor) {
            return (
              <Link className={className} key={`${kind}:${id}`} href={hrefFor(kind, id)}>
                {content}
              </Link>
            );
          }

          return (
            <button
              className={className}
              key={`${kind}:${id}`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect?.(kind, id)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}
