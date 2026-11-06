/* Shared behaviour for every page. Loaded with `defer`. */
(function () {
  "use strict";
  var root = document.documentElement;

  /* ---------- Theme ---------- */
  function currentTheme() {
    return root.getAttribute("data-theme") ||
      (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0e1413" : "#f4f1ea");
    document.querySelectorAll(".theme-toggle").forEach(function (b) {
      b.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });
  }
  applyTheme(currentTheme());
  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  });

  /* ---------- Header border on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Section menu (drawer) ---------- */
  var drawer = document.getElementById("drawer");
  var backdrop = document.querySelector(".drawer-backdrop");
  var openers = document.querySelectorAll("[data-drawer-open]");
  var lastFocus = null;

  function setOpen(open) {
    if (!drawer) return;
    drawer.classList.toggle("is-open", open);
    if (backdrop) backdrop.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    if ("inert" in drawer) drawer.inert = !open;
    root.classList.toggle("no-scroll", open);
    openers.forEach(function (b) { b.setAttribute("aria-expanded", String(open)); });
    if (open) {
      lastFocus = document.activeElement;
      var first = drawer.querySelector(".is-active") || drawer.querySelector("a, button");
      setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, 50);
    } else if (lastFocus) {
      lastFocus.focus({ preventScroll: true });
    }
  }
  if (drawer) {
    if ("inert" in drawer) drawer.inert = true;
    openers.forEach(function (b) { b.addEventListener("click", function () { setOpen(true); }); });
    drawer.querySelectorAll("[data-drawer-close]").forEach(function (b) {
      b.addEventListener("click", function () { setOpen(false); });
    });
    if (backdrop) backdrop.addEventListener("click", function () { setOpen(false); });
    drawer.querySelectorAll(".drawer-nav a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("is-open")) return;
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "Tab") { // keep focus inside the drawer
        var f = drawer.querySelectorAll("a[href], button");
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
  }

  /* ---------- Highlight the section in view ---------- */
  function spy(links, targets, cls) {
    if (!("IntersectionObserver" in window) || !targets.length) return;
    var visible = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible.set(en.target.id, en.isIntersecting ? en.boundingClientRect.top : null); });
      var best = null, bestTop = Infinity;
      targets.forEach(function (t) {
        var v = visible.get(t.id);
        if (v !== null && v !== undefined && Math.abs(v) < bestTop) { bestTop = Math.abs(v); best = t.id; }
      });
      if (!best || window.scrollY < 120) best = window.scrollY < 120 ? "" : null;
      if (best === null) return;
      links.forEach(function (l) {
        var on = l.getAttribute("href").split("#")[1] === best;
        l.classList.toggle(cls, on);
        if (on) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
      });
    }, { rootMargin: "-30% 0px -55% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  }
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-desktop a[href^="#"], .drawer-nav a[href^="#"]'));
  var sectionIds = {};
  navLinks.forEach(function (l) { sectionIds[l.getAttribute("href").slice(1)] = true; });
  spy(navLinks, Object.keys(sectionIds).map(function (id) { return document.getElementById(id); }).filter(Boolean), "is-active");

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  spy(tocLinks, tocLinks.map(function (l) { return document.getElementById(l.getAttribute("href").slice(1)); }).filter(Boolean), "is-active");

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); rio.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveals.forEach(function (el) { rio.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Image lightbox ---------- */
  var zooms = document.querySelectorAll("[data-zoom]");
  if (zooms.length && typeof HTMLDialogElement === "function") {
    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", "Image viewer");
    dlg.innerHTML =
      '<div class="lightbox-bar"><span class="caption"></span>' +
      '<a class="icon-btn lb-original" target="_blank" rel="noopener" aria-label="Open full resolution in a new tab" title="Full resolution"><svg class="icon" aria-hidden="true"><use href="icons.svg#external"/></svg></a>' +
      '<button class="icon-btn lb-close" type="button" aria-label="Close image"><svg class="icon" aria-hidden="true"><use href="icons.svg#close"/></svg></button></div>' +
      '<div class="lightbox-stage"><img alt=""></div>';
    document.body.appendChild(dlg);
    var lbImg = dlg.querySelector("img"), lbCap = dlg.querySelector(".caption"),
        lbOrig = dlg.querySelector(".lb-original"), stage = dlg.querySelector(".lightbox-stage");
    zooms.forEach(function (z) {
      z.addEventListener("click", function () {
        var img = z.querySelector("img");
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = img.alt;
        lbOrig.href = z.getAttribute("data-zoom") || img.src;
        stage.classList.remove("is-zoomed");
        dlg.showModal();
        root.classList.add("no-scroll");
      });
    });
    lbImg.addEventListener("click", function () { stage.classList.toggle("is-zoomed"); });
    dlg.querySelector(".lb-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target === stage) dlg.close(); });
    dlg.addEventListener("close", function () { root.classList.remove("no-scroll"); lbImg.removeAttribute("src"); });
  }

  /* ---------- Copy email ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      var done = function () {
        b.classList.add("is-copied");
        b.setAttribute("aria-label", "Email copied");
        setTimeout(function () { b.classList.remove("is-copied"); b.setAttribute("aria-label", "Copy email address"); }, 1800);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
