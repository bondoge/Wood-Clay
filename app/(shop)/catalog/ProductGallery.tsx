"use client";

import { useState } from "react";

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className="product-gallery">
      <div className="product-gallery__stage">
        <img src={activeImage} alt={`${title}, фото ${activeIndex + 1}`} width="1100" height="1300" />
        <span>{activeIndex + 1} / {images.length}</span>
      </div>
      {images.length > 1 && (
        <div className="product-gallery__thumbs" aria-label="Фотографии товара">
          {images.slice(0, 7).map((image, index) => (
            <button
              className={index === activeIndex ? "is-active" : ""}
              key={image}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Показать фото ${index + 1}`}
              aria-pressed={index === activeIndex}
            >
              <img src={image} alt="" width="180" height="180" loading={index < 3 ? "eager" : "lazy"} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
