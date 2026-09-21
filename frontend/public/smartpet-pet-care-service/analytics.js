(function () {
  "use strict";

  const CONFIG = {
    selectors: {
      ctaButtons: [".cta__button", ".hero__button", "[data-analytics='cta']"],
      navLinks: [".header__link", ".footer__link", "[data-analytics='nav']"],
      telegramLinks: [
        ".telegram__chip",
        ".header__social",
        "[data-analytics='telegram']",
      ],
      faqButtons: [".faq-item__button", "[data-analytics='faq']"],
      sectionTargets: [
        "#hero",
        "#importance",
        "#about",
        "#features",
        "#steps",
        "#care",
        "#audience",
        "#benefits",
        "#telegram",
        "#faq",
        "#cta",
      ],
    },
    scrollMarks: [25, 50, 75, 100],
    debug: false,
  };

  const state = {
    sentScrollMarks: new Set(),
    viewedSections: new Set(),
    sessionStartTime: Date.now(),
    maxScrollPercent: 0,
  };

  function logDebug() {
    if (!CONFIG.debug) return;
    console.log("[analytics.js]", ...arguments);
  }

  function hasGtag() {
    return typeof window.gtag === "function";
  }

  function hasYandexMetrika() {
    return typeof window.ym === "function";
  }

  function sendEvent(eventName, params) {
    const eventParams = params || {};

    if (hasGtag()) {
      window.gtag("event", eventName, eventParams);
    }

    if (hasYandexMetrika()) {
      try {
        window.ym(
          window.__YANDEX_METRIKA_COUNTER_ID__,
          "reachGoal",
          eventName,
          eventParams,
        );
      } catch (error) {
        logDebug("Yandex goal skipped:", error);
      }
    }

    logDebug("Event:", eventName, eventParams);
  }

  function getTextContent(element) {
    if (!element) return "";
    return (element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function getHref(element) {
    if (!element) return "";
    return element.getAttribute("href") || "";
  }

  function getSectionIdFromLink(link) {
    const href = getHref(link);
    if (!href || !href.startsWith("#")) return "";
    return href.replace("#", "");
  }

  function getCurrentPageMeta() {
    return {
      page_title: document.title,
      page_path: window.location.pathname,
      page_location: window.location.href,
    };
  }

  function trackClickGroup(selectorList, buildPayload) {
    const elements = document.querySelectorAll(selectorList.join(","));

    elements.forEach(function (element) {
      element.addEventListener("click", function () {
        const payload = buildPayload(element);
        sendEvent(payload.eventName, payload.params);
      });
    });
  }

  function setupCTATracking() {
    trackClickGroup(CONFIG.selectors.ctaButtons, function (element) {
      return {
        eventName: "cta_click",
        params: {
          ...getCurrentPageMeta(),
          button_text: getTextContent(element),
          button_href: getHref(element),
          section_target: getSectionIdFromLink(element) || "",
          event_category: "engagement",
          event_label: getTextContent(element) || "CTA",
        },
      };
    });
  }

  function setupNavTracking() {
    trackClickGroup(CONFIG.selectors.navLinks, function (element) {
      return {
        eventName: "navigation_click",
        params: {
          ...getCurrentPageMeta(),
          link_text: getTextContent(element),
          link_href: getHref(element),
          target_section: getSectionIdFromLink(element) || "",
          event_category: "navigation",
          event_label: getTextContent(element) || "Navigation link",
        },
      };
    });
  }

  function setupTelegramTracking() {
    trackClickGroup(CONFIG.selectors.telegramLinks, function (element) {
      return {
        eventName: "telegram_click",
        params: {
          ...getCurrentPageMeta(),
          link_text: getTextContent(element),
          link_href: getHref(element),
          event_category: "social",
          event_label: getTextContent(element) || "Telegram",
        },
      };
    });
  }

  function setupFAQTracking() {
    const buttons = document.querySelectorAll(
      CONFIG.selectors.faqButtons.join(","),
    );

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        const question = getTextContent(button);
        const faqItem = button.closest(".faq-item");
        const wasOpen = faqItem ? faqItem.classList.contains("is-open") : false;

        sendEvent("faq_toggle", {
          ...getCurrentPageMeta(),
          faq_question: question,
          faq_state_before_click: wasOpen ? "open" : "closed",
          event_category: "engagement",
          event_label: question,
        });
      });
    });
  }

  function getScrollPercent() {
    const scrollTop =
      window.pageYOffset || document.documentElement.scrollTop || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const fullHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight,
    );

    if (fullHeight <= viewportHeight) return 100;

    return Math.min(
      100,
      Math.round(((scrollTop + viewportHeight) / fullHeight) * 100),
    );
  }

  function setupScrollDepthTracking() {
    function handleScrollDepth() {
      const currentPercent = getScrollPercent();
      state.maxScrollPercent = Math.max(state.maxScrollPercent, currentPercent);

      CONFIG.scrollMarks.forEach(function (mark) {
        if (currentPercent >= mark && !state.sentScrollMarks.has(mark)) {
          state.sentScrollMarks.add(mark);

          sendEvent("scroll_depth", {
            ...getCurrentPageMeta(),
            scroll_percent: mark,
            event_category: "engagement",
            event_label: mark + "%",
          });
        }
      });
    }

    let ticking = false;

    window.addEventListener("scroll", function () {
      if (ticking) return;

      window.requestAnimationFrame(function () {
        handleScrollDepth();
        ticking = false;
      });

      ticking = true;
    });

    handleScrollDepth();
  }

  function setupSectionViewTracking() {
    const sections = CONFIG.selectors.sectionTargets
      .map(function (selector) {
        return document.querySelector(selector);
      })
      .filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          const section = entry.target;
          const sectionId = section.id || "unknown";

          if (state.viewedSections.has(sectionId)) return;
          state.viewedSections.add(sectionId);

          sendEvent("section_view", {
            ...getCurrentPageMeta(),
            section_id: sectionId,
            event_category: "engagement",
            event_label: sectionId,
          });
        });
      },
      {
        threshold: 0.45,
      },
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function setupTimeOnPageTracking() {
    function sendTimeEvent(reason) {
      const seconds = Math.max(
        1,
        Math.round((Date.now() - state.sessionStartTime) / 1000),
      );

      sendEvent("time_on_page", {
        ...getCurrentPageMeta(),
        seconds_on_page: seconds,
        max_scroll_percent: state.maxScrollPercent,
        send_reason: reason,
        event_category: "engagement",
        event_label: reason,
      });
    }

    let hasSentBeforeUnload = false;

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        sendTimeEvent("visibility_hidden");
      }
    });

    window.addEventListener("beforeunload", function () {
      if (hasSentBeforeUnload) return;
      hasSentBeforeUnload = true;
      sendTimeEvent("before_unload");
    });
  }

  function setupOutboundLinkTracking() {
    const allLinks = document.querySelectorAll("a[href]");

    allLinks.forEach(function (link) {
      const href = getHref(link);
      if (!href) return;
      if (href.startsWith("#")) return;

      link.addEventListener("click", function () {
        sendEvent("outbound_click", {
          ...getCurrentPageMeta(),
          link_text: getTextContent(link),
          link_href: href,
          event_category: "outbound",
          event_label: href,
        });
      });
    });
  }

  function setupInitialPageData() {
    sendEvent("smartpet_page_ready", {
      ...getCurrentPageMeta(),
      event_category: "system",
      event_label: "page_ready",
    });
  }

  function initAnalytics() {
    setupInitialPageData();
    setupCTATracking();
    setupNavTracking();
    setupTelegramTracking();
    setupFAQTracking();
    setupScrollDepthTracking();
    setupSectionViewTracking();
    setupTimeOnPageTracking();
    setupOutboundLinkTracking();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAnalytics);
  } else {
    initAnalytics();
  }
})();
