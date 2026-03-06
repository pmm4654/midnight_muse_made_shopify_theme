class StickyAddToCart extends HTMLElement {
  constructor() {
    super();
    this.originalButton = null;
    this.stickyButton = this.querySelector('.sticky-atc__submit');
    this.observer = null;
  }

  connectedCallback() {
    const sectionId = this.dataset.sectionId;
    this.originalButton = document.getElementById(`ProductSubmitButton-${sectionId}`);
    this.originalForm = this.originalButton?.closest('form');

    if (!this.originalButton || !this.originalForm) return;

    this.setupIntersectionObserver();
    this.setupClickHandler();
    this.setupVariantSync(sectionId);
  }

  setupIntersectionObserver() {
    const target = this.originalButton.closest('.product-form__buttons');
    if (!target) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.classList.remove('is-visible');
            document.body.classList.remove('sticky-atc-active');
          } else {
            if (entry.boundingClientRect.top < 0) {
              this.classList.add('is-visible');
              document.body.classList.add('sticky-atc-active');
            } else {
              this.classList.remove('is-visible');
              document.body.classList.remove('sticky-atc-active');
            }
          }
        });
      },
      { threshold: 0 }
    );

    this.observer.observe(target);
  }

  setupClickHandler() {
    this.stickyButton?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.originalButton.disabled) {
        this.originalButton.closest('product-form')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else {
        this.originalButton.click();
      }
    });
  }

  setupVariantSync(sectionId) {
    const buttonText = this.stickyButton?.querySelector('span');

    if (this.originalButton) {
      const mutationObserver = new MutationObserver(() => {
        if (this.stickyButton) {
          this.stickyButton.disabled = this.originalButton.disabled;
        }
        if (buttonText) {
          const originalText = this.originalButton.querySelector('span');
          if (originalText) {
            buttonText.textContent = originalText.textContent;
          }
        }
      });

      mutationObserver.observe(this.originalButton, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    const originalPrice = document.getElementById(`price-${sectionId}`);
    const priceEl = this.querySelector('.sticky-atc-bar__price');
    if (originalPrice && priceEl) {
      const priceMutationObserver = new MutationObserver(() => {
        const currentPrice = originalPrice.querySelector('.price-item--regular, .price-item--sale');
        if (currentPrice) {
          priceEl.textContent = currentPrice.textContent.trim();
        }
      });

      priceMutationObserver.observe(originalPrice, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    document.body.classList.remove('sticky-atc-active');
  }
}

customElements.define('sticky-add-to-cart', StickyAddToCart);
