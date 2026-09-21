class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="header">
        <div class="header__container">
          <a class="header__logo" href="#hero" aria-label="SmartPet">
            <img class="brand-logo" src="./img/brand.svg" alt="" width="48" height="48">
            <span class="header__logo-text">СМАРТПЕТ</span>
          </a>

          <nav class="header__nav" aria-label="Основная навигация">
            <a class="header__link" href="#about">О сервисе</a>
            <a class="header__link" href="#features">Возможности</a>
            <a class="header__link" href="#steps">Как это работает</a>
            <a class="header__link" href="#faq">FAQ</a>
          </nav>

          <div class="header__socials" aria-label="Ссылки">
            <a class="header__social" href="#" aria-label="Mini App" data-label="Мини Апп">📱</a>
            <a class="header__social" href="#" aria-label="Bot" data-label="Телеграм бот">🤖</a>
            <a class="header__social" href="#" aria-label="Канал" data-label="Телеграм канал">📣</a>
          </div>
        </div>
      </header>
    `;
  }
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", function (e) {
    const id = this.getAttribute("href");

    if (id === "#") return;

    const target = document.querySelector(id);

    if (target) {
      e.preventDefault();

      const header = document.querySelector(".header");
      const headerHeight = header ? header.offsetHeight : 0;

      const position =
        target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: position,
        behavior: "smooth",
      });
    }
  });
});

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="footer">
        <div class="footer__container">
          <div class="footer__top">
            <div class="footer__brand">
              <h2 class="footer__logo"><img class="brand-logo" src="./img/brand.svg" alt="" width="48" height="48">СМАРТПЕТ</h2>
              <p class="footer__description">
                Сервис мониторинга здоровья питомца
              </p>
            </div>

            <div class="footer__column">
              <h3 class="footer__title">Контакты</h3>
              <div class="footer__links">
                <a class="footer__link" href="https://t.me/SmartPetHelper_bot?startapp">Мини-апп Telegram</a>
                <a class="footer__link" href="https://vk.ru/app54599546">Мини-апп VK</a>
                <a class="footer__link" href="https://t.me/smartpet_info">Telegram-канал</a>
                <a class="footer__link" href="https://vk.ru/club239532031">Сообщество VK</a>
              </div>
            </div>

            <div class="footer__column">
              <h3 class="footer__title">Документы</h3>
              <div class="footer__links">
                <a class="footer__link" href="./user-agreement.html">Пользовательское соглашение</a>
                <a class="footer__link" href="./privacy-policy.html">Политика конфиденциальности</a>
              </div>
            </div>
          </div>

          <div class="footer__line"></div>

          <div class="footer__bottom">
            © 2026 СмартПет. Помогаем питомцам жить долгой и счастливой жизнью.
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define("site-header", SiteHeader);
customElements.define("site-footer", SiteFooter);

document.addEventListener("DOMContentLoaded", () => {
  const animateItems = document.querySelectorAll(
    ".hero__text-block, .hero__visual, .importance-card, .importance__result, .about-feature, .feature-card, .step, .state-box, .care-card, .audience__item, .audience__note, .benefit-card, .telegram__box, .faq-item, .cta__container",
  );

  animateItems.forEach((item) => {
    item.setAttribute("data-animate", "");
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0% 0% -8% 0%",
    },
  );

  animateItems.forEach((item) => observer.observe(item));

  const faqButtons = document.querySelectorAll(".faq-item__button");

  faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const currentItem = button.closest(".faq-item");
      const isOpen = currentItem.classList.contains("is-open");

      document.querySelectorAll(".faq-item").forEach((item) => {
        item.classList.remove("is-open");
      });

      if (!isOpen) {
        currentItem.classList.add("is-open");
      }
    });
  });
});
