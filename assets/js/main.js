(() => {
  "use strict";

  const CART_KEY = "aurelia.cart.v1";
  const WISHLIST_KEY = "aurelia.wishlist.v1";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const storage = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
      }
    },
  };

  const formatPrice = (amount) => `Rs. ${Number(amount).toLocaleString("en-US")}`;

  function icon(name, classes = "size-5") {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", classes);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.5");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
  }

  function toast(message) {
    const region = $("#toast-region");
    if (!region) return;
    const el = document.createElement("div");
    el.className =
      "pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm text-white shadow-soft transition duration-300 translate-y-3 opacity-0";
    el.append(icon("check", "size-4 shrink-0 text-gold-300"));
    const text = document.createElement("span");
    text.textContent = message;
    el.append(text);
    region.append(el);
    requestAnimationFrame(() => el.classList.remove("translate-y-3", "opacity-0"));
    window.setTimeout(() => {
      el.classList.add("translate-y-3", "opacity-0");
      window.setTimeout(() => el.remove(), 350);
    }, 2800);
  }

  function initNavigation() {
    const header = $("#site-header");
    const toggle = $("#menu-toggle");
    const menu = $("#mobile-menu");

    if (header) {
      const onScroll = () => header.classList.toggle("shadow-soft", window.scrollY > 8);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (!toggle || !menu) return;
    const setOpen = (open) => {
      menu.classList.toggle("hidden", !open);
      toggle.setAttribute("aria-expanded", String(open));
      $(".menu-open", toggle)?.classList.toggle("hidden", open);
      $(".menu-close", toggle)?.classList.toggle("hidden", !open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", (event) => {
      if (event.matches) setOpen(false);
    });
  }

  function initCart() {
    const drawer = $("#cart-drawer");
    const overlay = $("#cart-overlay");
    const openBtn = $("#cart-open");
    const list = $("#cart-items");
    const emptyState = $("#cart-empty");
    const footer = $("#cart-footer");
    const totalEl = $("#cart-total");
    const badge = $("#cart-count");
    if (!drawer || !overlay || !list) return;

    let items = storage.get(CART_KEY, []);
    if (!Array.isArray(items)) items = [];
    let lastFocus = null;

    const persist = () => storage.set(CART_KEY, items);

    function setOpen(open) {
      drawer.classList.toggle("translate-x-full", !open);
      drawer.classList.toggle("translate-x-0", open);
      overlay.classList.toggle("hidden", !open);
      drawer.setAttribute("aria-hidden", String(!open));
      drawer.inert = !open;
      document.body.classList.toggle("overflow-hidden", open);
      if (open) {
        lastFocus = document.activeElement;
        drawer.focus();
      } else if (lastFocus instanceof HTMLElement) {
        lastFocus.focus();
      }
    }

    function render() {
      const count = items.reduce((sum, item) => sum + item.qty, 0);
      const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

      if (badge) {
        badge.textContent = String(count);
        badge.hidden = count === 0;
      }
      if (emptyState) emptyState.hidden = items.length > 0;
      list.classList.toggle("hidden", items.length === 0);
      footer?.classList.toggle("hidden", items.length === 0);
      if (totalEl) totalEl.textContent = formatPrice(total);

      list.replaceChildren(
        ...items.map((item) => {
          const li = document.createElement("li");
          li.className = "flex gap-4 rounded-2xl border border-ink-100 bg-white p-3";

          const img = document.createElement("img");
          img.src = item.img;
          img.alt = "";
          img.className = "size-20 shrink-0 rounded-xl object-cover";

          const body = document.createElement("div");
          body.className = "flex min-w-0 flex-1 flex-col justify-between";

          const top = document.createElement("div");
          top.className = "flex items-start justify-between gap-2";
          const name = document.createElement("p");
          name.className = "font-serif text-base leading-snug text-ink-900";
          name.textContent = item.name;
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "text-ink-400 transition hover:text-red-600";
          remove.dataset.cartRemove = item.id;
          remove.setAttribute("aria-label", `Remove ${item.name} from bag`);
          remove.append(icon("trash", "size-4"));
          top.append(name, remove);

          const bottom = document.createElement("div");
          bottom.className = "flex items-center justify-between";
          const qty = document.createElement("div");
          qty.className = "inline-flex items-center rounded-full border border-ink-200 text-sm";
          const dec = document.createElement("button");
          dec.type = "button";
          dec.className = "grid size-8 place-items-center text-ink-700 hover:text-gold-700";
          dec.dataset.cartDec = item.id;
          dec.setAttribute("aria-label", `Decrease quantity of ${item.name}`);
          dec.textContent = "\u2212";
          const qtyValue = document.createElement("span");
          qtyValue.className = "min-w-6 text-center font-medium";
          qtyValue.textContent = String(item.qty);
          const inc = document.createElement("button");
          inc.type = "button";
          inc.className = "grid size-8 place-items-center text-ink-700 hover:text-gold-700";
          inc.dataset.cartInc = item.id;
          inc.setAttribute("aria-label", `Increase quantity of ${item.name}`);
          inc.textContent = "+";
          qty.append(dec, qtyValue, inc);
          const price = document.createElement("p");
          price.className = "text-sm font-semibold text-ink-900";
          price.textContent = formatPrice(item.price * item.qty);
          bottom.append(qty, price);

          body.append(top, bottom);
          li.append(img, body);
          return li;
        }),
      );
    }

    function add(product) {
      const existing = items.find((item) => item.id === product.id);
      if (existing) existing.qty = Math.min(existing.qty + 1, 10);
      else items.push({ ...product, qty: 1 });
      persist();
      render();
      toast(`${product.name} added to your bag`);
    }

    function change(id, delta) {
      const item = items.find((entry) => entry.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) items = items.filter((entry) => entry.id !== id);
      item.qty = Math.min(item.qty, 10);
      persist();
      render();
    }

    document.addEventListener("click", (event) => {
      const addBtn = event.target.closest("[data-add-to-cart]");
      if (addBtn) {
        const price = Number(addBtn.dataset.price);
        if (!addBtn.dataset.id || !Number.isFinite(price)) return;
        add({ id: addBtn.dataset.id, name: addBtn.dataset.name, price, img: addBtn.dataset.img });
        return;
      }
      const remove = event.target.closest("[data-cart-remove]");
      if (remove) {
        items = items.filter((item) => item.id !== remove.dataset.cartRemove);
        persist();
        render();
        return;
      }
      const inc = event.target.closest("[data-cart-inc]");
      if (inc) return change(inc.dataset.cartInc, 1);
      const dec = event.target.closest("[data-cart-dec]");
      if (dec) return change(dec.dataset.cartDec, -1);
      if (event.target.closest("[data-cart-close]")) setOpen(false);
    });

    openBtn?.addEventListener("click", () => setOpen(true));
    $("#cart-close")?.addEventListener("click", () => setOpen(false));
    overlay.addEventListener("click", () => setOpen(false));
    $("#cart-clear")?.addEventListener("click", () => {
      items = [];
      persist();
      render();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer.getAttribute("aria-hidden") === "false") setOpen(false);
    });
    window.addEventListener("storage", (event) => {
      if (event.key === CART_KEY) {
        items = storage.get(CART_KEY, []);
        render();
      }
    });

    drawer.inert = true;
    render();
  }

  function initWishlist() {
    const buttons = $$(".wishlist-btn");
    if (!buttons.length) return;
    let saved = storage.get(WISHLIST_KEY, []);
    if (!Array.isArray(saved)) saved = [];

    const paint = (button) => {
      const active = saved.includes(button.dataset.id);
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("text-red-500", active);
      $("use", button)?.setAttribute("href", active ? "#i-heart-solid" : "#i-heart");
    };

    buttons.forEach((button) => {
      paint(button);
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        saved = saved.includes(id) ? saved.filter((entry) => entry !== id) : [...saved, id];
        storage.set(WISHLIST_KEY, saved);
        paint(button);
        toast(saved.includes(id) ? "Saved to your wishlist" : "Removed from your wishlist");
      });
    });
  }

  function initProductFilter() {
    const tabs = $$("#product-tabs [data-filter]");
    const cards = $$(".product-card");
    const empty = $("#product-empty");
    if (!tabs.length || !cards.length) return;

    function apply(filter) {
      let visible = 0;
      cards.forEach((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("hidden", !show);
        if (show) visible += 1;
      });
      tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.filter === filter)));
      empty?.classList.toggle("hidden", visible > 0);
    }

    tabs.forEach((tab) => tab.addEventListener("click", () => apply(tab.dataset.filter)));
    $$("[data-filter-link]").forEach((link) =>
      link.addEventListener("click", () => apply(link.dataset.filterLink)),
    );
  }

  function initReveal() {
    const targets = $$(".reveal");
    if (!targets.length) return;
    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    targets.forEach((el) => observer.observe(el));
  }

  function initCounters() {
    const counters = $$("[data-count]");
    if (!counters.length) return;
    const render = (el, value) => {
      el.textContent = `${Math.round(value).toLocaleString("en-US")}${el.dataset.suffix || ""}`;
    };
    if (!("IntersectionObserver" in window) || prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          const el = entry.target;
          const target = Number(el.dataset.count);
          const duration = 1400;
          const start = performance.now();
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            render(el, target * (1 - Math.pow(1 - progress, 3)));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach((el) => observer.observe(el));
  }

  function initBackToTop() {
    const button = $("#back-to-top");
    if (!button) return;
    const update = () => {
      const show = window.scrollY > 600;
      button.classList.toggle("opacity-0", !show);
      button.classList.toggle("translate-y-4", !show);
      button.classList.toggle("opacity-100", show);
      button.classList.toggle("translate-y-0", show);
      button.tabIndex = show ? 0 : -1;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    button.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" }),
    );
  }

  function fieldMessage(field) {
    const { validity } = field;
    if (validity.customError) return field.validationMessage;
    if (validity.valueMissing) {
      if (field.type === "checkbox") return "Please tick this box to continue.";
      return field.tagName === "SELECT" ? "Please choose an option." : "This field is required.";
    }
    if (validity.typeMismatch) return "Please enter a valid email address.";
    if (validity.tooShort) return `Please use at least ${field.minLength} characters.`;
    if (validity.patternMismatch) return "Please enter a valid phone number.";
    return "Please check this field.";
  }

  function errorElement(form, field) {
    return $(`[data-error-for="${CSS.escape(field.name)}"]`, form);
  }

  function clearFieldError(form, field) {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
    const error = errorElement(form, field);
    if (error) {
      error.textContent = "";
      error.classList.add("hidden");
    }
  }

  function showFieldError(form, field, message) {
    field.setAttribute("aria-invalid", "true");
    const error = errorElement(form, field);
    if (!error) return;
    error.id = error.id || `${field.id || field.name}-error`;
    error.textContent = message;
    error.classList.remove("hidden");
    field.setAttribute("aria-describedby", error.id);
  }

  function validateField(form, field) {
    field.setCustomValidity("");
    if (field.type === "email" && field.value && !EMAIL_PATTERN.test(field.value.trim())) {
      field.setCustomValidity("Please enter a valid email address.");
    }
    if (field.name === "confirm_password") {
      const password = form.elements.password;
      if (password && field.value && field.value !== password.value) {
        field.setCustomValidity("Passwords do not match.");
      }
    }
    if (field.name === "password" && form.dataset.authForm === "signup" && field.value) {
      const strong = field.value.length >= 8 && /[a-z]/.test(field.value) && /[A-Z]/.test(field.value) && /\d/.test(field.value);
      if (!strong) field.setCustomValidity("Use 8+ characters with upper & lower case letters and a number.");
    }
    if (field.checkValidity()) {
      clearFieldError(form, field);
      return true;
    }
    showFieldError(form, field, fieldMessage(field));
    return false;
  }

  function validateForm(form) {
    const fields = Array.from(form.elements).filter(
      (el) => el.name && el.name !== "_gotcha" && el.type !== "hidden" && el.type !== "submit" && el.type !== "button",
    );
    let firstInvalid = null;
    fields.forEach((field) => {
      if (!validateField(form, field) && !firstInvalid) firstInvalid = field;
    });
    firstInvalid?.focus();
    return !firstInvalid;
  }

  const STATUS_STYLES = {
    success: ["border", "border-emerald-200", "bg-emerald-50", "text-emerald-800"],
    error: ["border", "border-red-200", "bg-red-50", "text-red-800"],
    info: ["border", "border-gold-200", "bg-gold-50", "text-gold-900"],
  };
  const ALL_STATUS_CLASSES = Object.values(STATUS_STYLES).flat();

  function setStatus(form, type, message) {
    const box = $(".form-status", form);
    if (!box) return;
    box.classList.remove(...ALL_STATUS_CLASSES);
    if (!message) {
      box.classList.add("hidden");
      box.textContent = "";
      return;
    }
    box.classList.add(...STATUS_STYLES[type]);
    box.classList.remove("hidden");
    box.textContent = message;
  }

  function bindLiveValidation(form) {
    form.addEventListener("input", (event) => {
      const field = event.target;
      if (!(field instanceof HTMLElement) || !field.name) return;
      if (field.getAttribute("aria-invalid") === "true") validateField(form, field);
      if (field.name === "password" && form.elements.confirm_password?.value) {
        validateField(form, form.elements.confirm_password);
      }
    });
    form.addEventListener("change", (event) => {
      const field = event.target;
      if (field instanceof HTMLElement && field.getAttribute("aria-invalid") === "true") {
        validateField(form, field);
      }
    });
  }

  function initAjaxForms() {
    $$("form[data-ajax-form]").forEach((form) => {
      bindLiveValidation(form);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus(form, "info", "");
        if (!validateForm(form)) return;

        const action = form.getAttribute("action") || "";
        if (!action || action.includes("YOUR_FORM_ID")) {
          setStatus(form, "error", "This form is not connected yet. Replace YOUR_FORM_ID in the form action with your Formspree form ID.");
          return;
        }

        if (form.elements._gotcha?.value) {
          form.reset();
          return;
        }

        const submit = $('[type="submit"]', form);
        const originalHtml = submit?.innerHTML;
        if (submit) {
          submit.disabled = true;
          submit.textContent = "Sending\u2026";
        }

        try {
          const response = await fetch(action, {
            method: "POST",
            body: new FormData(form),
            headers: { Accept: "application/json" },
          });

          if (response.ok) {
            form.reset();
            $$("[data-counter]", form).forEach((el) => {
              const counter = document.getElementById(el.dataset.counter);
              if (counter) counter.textContent = "0";
            });
            setStatus(form, "success", "Thank you! Your message has been sent and our team will reply shortly.");
            toast("Message sent successfully");
          } else {
            const data = await response.json().catch(() => ({}));
            const detail = Array.isArray(data.errors) ? data.errors.map((e) => e.message).join(" ") : "";
            setStatus(form, "error", detail || "Sorry, we could not send your message. Please try again or call us.");
          }
        } catch (error) {
          console.error("Form submission failed", error);
          setStatus(form, "error", "Network error. Please check your connection and try again.");
        } finally {
          if (submit) {
            submit.disabled = false;
            submit.innerHTML = originalHtml;
          }
        }
      });
    });
  }

  function initAuthForms() {
    $$("form[data-auth-form]").forEach((form) => {
      bindLiveValidation(form);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        setStatus(form, "info", "");
        if (!validateForm(form)) return;

        const isSignup = form.dataset.authForm === "signup";
        ["password", "confirm_password"].forEach((name) => {
          if (form.elements[name]) form.elements[name].value = "";
        });
        $$("[data-password-strength]", form).forEach((input) => input.dispatchEvent(new Event("input")));
        setStatus(
          form,
          "info",
          isSignup
            ? "Your details look good. Account creation is not connected to a server in this front-end project, so no account was created."
            : "Your details look good. Authentication is not connected to a server in this front-end project, so no session was started.",
        );
      });
    });
  }

  function initPasswordToggles() {
    $$("[data-toggle-password]").forEach((button) => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      button.addEventListener("click", () => {
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        button.setAttribute("aria-pressed", String(reveal));
        button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
        $("[data-icon-show]", button)?.classList.toggle("hidden", reveal);
        $("[data-icon-hide]", button)?.classList.toggle("hidden", !reveal);
      });
    });
  }

  function initPasswordStrength() {
    const input = $("[data-password-strength]");
    const meter = $("[data-strength-meter]");
    if (!input || !meter) return;

    const bars = $$("[data-bar]", meter);
    const label = $("[data-strength-label]", meter);
    const rules = {
      length: (v) => v.length >= 8,
      case: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
      number: (v) => /\d/.test(v),
      symbol: (v) => /[^A-Za-z0-9]/.test(v),
    };
    const levels = [
      { text: "Too weak", bar: "bg-red-500", color: "text-red-600" },
      { text: "Fair", bar: "bg-orange-400", color: "text-orange-600" },
      { text: "Good", bar: "bg-amber-400", color: "text-amber-600" },
      { text: "Strong", bar: "bg-emerald-500", color: "text-emerald-600" },
    ];
    const allBarColors = levels.map((level) => level.bar);
    const allTextColors = levels.map((level) => level.color);

    input.addEventListener("input", () => {
      const value = input.value;
      let score = 0;
      Object.entries(rules).forEach(([name, test]) => {
        const passed = test(value);
        if (passed) score += 1;
        const item = $(`[data-rule="${name}"]`, meter);
        item?.classList.toggle("text-emerald-600", passed);
        item?.classList.toggle("text-ink-500", !passed);
        $("svg", item)?.classList.toggle("opacity-30", !passed);
      });

      bars.forEach((bar, index) => {
        bar.classList.remove(...allBarColors, "bg-ink-100");
        bar.classList.add(value && index < score ? levels[Math.max(score - 1, 0)].bar : "bg-ink-100");
      });

      label.classList.remove(...allTextColors, "text-ink-500");
      if (!value) {
        label.textContent = "Password strength: enter a password";
        label.classList.add("text-ink-500");
        return;
      }
      const level = levels[Math.max(score - 1, 0)];
      label.textContent = `Password strength: ${score === 0 ? levels[0].text : level.text}`;
      label.classList.add(score === 0 ? levels[0].color : level.color);
    });
  }

  function initCharacterCounters() {
    $$("[data-counter]").forEach((field) => {
      const counter = document.getElementById(field.dataset.counter);
      if (!counter) return;
      const update = () => {
        counter.textContent = String(field.value.length);
      };
      field.addEventListener("input", update);
      update();
    });
  }

  function prefillOrderEnquiry() {
    const form = $("[data-contact-form]");
    if (!form || new URLSearchParams(window.location.search).get("order") !== "1") return;

    const items = storage.get(CART_KEY, []);
    if (!Array.isArray(items) || !items.length) return;

    const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const lines = items.map((item) => `- ${item.name} x ${item.qty} (${formatPrice(item.price * item.qty)})`);
    const message = [
      "Hello Aurelia team, I would like to place an order for the following pieces:",
      "",
      ...lines,
      "",
      `Estimated total: ${formatPrice(total)}`,
    ].join("\n");

    const textarea = form.elements.message;
    const topic = form.elements.topic;
    if (textarea) {
      textarea.value = message;
      textarea.dispatchEvent(new Event("input"));
    }
    if (topic) topic.value = "Order or delivery support";
    setStatus(form, "info", "We have added the items from your bag to your message. Fill in your details and send it to complete your order request.");
  }

  function initYear() {
    $$("[data-year]").forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function init() {
    initNavigation();
    initCart();
    initWishlist();
    initProductFilter();
    initReveal();
    initCounters();
    initBackToTop();
    initPasswordToggles();
    initPasswordStrength();
    initCharacterCounters();
    initAjaxForms();
    initAuthForms();
    prefillOrderEnquiry();
    initYear();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
