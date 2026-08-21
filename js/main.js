// ===== language toggle =====
(function () {
  var STORAGE_KEY = "site-lang";
  var html = document.documentElement;
  var saved = localStorage.getItem(STORAGE_KEY);
  var browserZh = navigator.language && navigator.language.toLowerCase().indexOf("zh") === 0;
  var lang = saved || (browserZh ? "zh" : "en");
  html.setAttribute("data-lang", lang);

  function updateButtons() {
    document.querySelectorAll(".lang-toggle").forEach(function (btn) {
      btn.textContent = lang === "zh" ? "EN" : "中文";
      btn.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换到中文");
    });
    document.title = lang === "zh"
      ? (document.title.match(/\|.*/) ? document.querySelector('title').getAttribute('data-zh-title') || document.title : document.title)
      : document.title;
  }

  function setLang(next) {
    lang = next;
    html.setAttribute("data-lang", lang);
    localStorage.setItem(STORAGE_KEY, lang);
    updateButtons();
    var titleEl = document.querySelector("title");
    if (titleEl) {
      var t = lang === "zh" ? titleEl.getAttribute("data-zh") : titleEl.getAttribute("data-en");
      if (t) titleEl.textContent = t;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var titleEl = document.querySelector("title");
    if (titleEl) {
      var t = lang === "zh" ? titleEl.getAttribute("data-zh") : titleEl.getAttribute("data-en");
      if (t) titleEl.textContent = t;
    }
    updateButtons();
    document.querySelectorAll(".lang-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(lang === "zh" ? "en" : "zh");
      });
    });
  });
})();

// ===== mobile nav =====
document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      toggle.classList.toggle("open");
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.classList.remove("open");
        links.classList.remove("open");
      });
    });
  }
});

// ===== scroll reveal =====
document.addEventListener("DOMContentLoaded", function () {
  var items = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window) || !items.length) {
    items.forEach(function (el) { el.classList.add("in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
  items.forEach(function (el) { io.observe(el); });
});

// ===== nav active link on scroll (index only) =====
document.addEventListener("DOMContentLoaded", function () {
  var sections = document.querySelectorAll("main section[id]");
  var navLinks = document.querySelectorAll(".nav-links a[href^='#']");
  if (!sections.length || !navLinks.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = document.querySelector(".nav-links a[href='#" + entry.target.id + "']");
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(function (s) { io.observe(s); });
});

// ===== lightbox for gallery =====
document.addEventListener("DOMContentLoaded", function () {
  var lb = document.querySelector(".lightbox");
  if (!lb) return;
  var lbImg = lb.querySelector("img");
  document.querySelectorAll("[data-lightbox]").forEach(function (el) {
    el.addEventListener("click", function () {
      var src = el.getAttribute("data-lightbox") || el.querySelector("img").src;
      lbImg.src = src;
      lb.classList.add("open");
    });
  });
  lb.addEventListener("click", function (e) {
    if (e.target === lb || e.target.classList.contains("lb-close")) {
      lb.classList.remove("open");
      lbImg.src = "";
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { lb.classList.remove("open"); lbImg.src = ""; }
  });
});
