/* Photo map + floating horizontal carousel.

   Map geometry (province / land outlines + projection parameters) lives in
   assets/geo/map-data.js and never needs editing.
   The cities themselves live in data/places.js — pins are projected from
   lon/lat at runtime, so adding a city there is all it takes. */
(function () {

  /* ---------- map view configuration ----------
     Change these values to choose the area shown when the map first opens.
     `zoom: 1` means the complete original map; larger values zoom in.
     Coordinates are geographic degrees, so they are easy to adjust without
     knowing the SVG viewBox values.  Set a map to null to keep its full view. */
  const INITIAL_MAP_VIEW = {
    china: { centerLon: 103, centerLat: 35, zoom: 1.8 },
    world: { centerLon: 65, centerLat: 30, zoom: 2.2 }
  };

  /* ---------- projection (mirrors d3-geo's maths for the two we use) ---------- */
  function project(proj, lon, lat) {
    const lambda = (lon * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    const tx = proj.translate[0], ty = proj.translate[1];
    if (proj.type === "mercator") {
      return {
        x: tx + proj.scale * lambda,
        y: ty - proj.scale * Math.log(Math.tan(Math.PI / 4 + phi / 2))
      };
    }
    return { x: tx + proj.scale * lambda, y: ty - proj.scale * phi };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function placesOn(mapKey) {
    return Object.keys(window.PLACES || {}).filter(function (k) {
      const p = window.PLACES[k];
      return p && p.maps && p.maps.indexOf(mapKey) !== -1;
    });
  }

  function pinsSVG(proj, mapKey) {
    let out = '<g class="map-pins">';
    placesOn(mapKey).forEach(function (key) {
      const city = window.PLACES[key];
      const pos = project(proj, city.lon, city.lat);
      const x = pos.x.toFixed(2), y = pos.y.toFixed(2);
      const lx = (pos.x + 9).toFixed(2), ly = (pos.y + 4).toFixed(2);
      out +=
        '<g class="map-pin" data-city="' + key + '" tabindex="0" role="button">' +
        '<title>' + escapeHtml(city.zh) + ' / ' + escapeHtml(city.en) + '</title>' +
        // '<circle class="pulse" cx="' + x + '" cy="' + y + '" r="2"></circle>' +
        '<circle class="dot" cx="' + x + '" cy="' + y + '" r="1"></circle>' +
        '</g>';
    });
    return out + "</g>";
  }

  function chinaSVG(d) {
    let s = '<svg viewBox="' + d.viewBox + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="China map"><g>';
    d.provinces.forEach(function (p) {
      s += '<path class="map-province' + (p.name === d.highlight ? " highlight" : "") + '" d="' + p.d + '"></path>';
    });
    return s + "</g>" + pinsSVG(d.proj, "china") + "</svg>";
  }

  function worldSVG(d) {
    return '<svg viewBox="' + d.viewBox + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="World map">' +
      '<path class="map-land" d="' + d.land + '"></path>' +
      pinsSVG(d.proj, "world") + "</svg>";
  }

  /* ---------- map zoom and pan ----------
     The SVG keeps its original geometry; only its viewBox changes, so pins,
     province outlines and the existing click handlers continue to work. */
  function enableMapView(svg, data, mapKey) {
    if (!svg || !data || !data.viewBox || !data.proj) return;

    const parts = String(data.viewBox).trim().split(/[ ,]+/).map(Number);
    if (parts.length !== 4 || parts.some(function (n) { return !isFinite(n); })) return;

    const full = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    const setting = INITIAL_MAP_VIEW[mapKey];
    let view = { x: full.x, y: full.y, width: full.width, height: full.height };

    function projectPoint(lon, lat) {
      return project(data.proj, lon, lat);
    }

    function clampView(next) {
      next.width = Math.max(Math.min(next.width, full.width), full.width / 40);
      next.height = Math.max(Math.min(next.height, full.height), full.height / 40);
      next.x = Math.max(full.x, Math.min(next.x, full.x + full.width - next.width));
      next.y = Math.max(full.y, Math.min(next.y, full.y + full.height - next.height));
      return next;
    }

    function setView(next) {
      view = clampView(next);
      svg.setAttribute("viewBox", [view.x, view.y, view.width, view.height].join(" "));
    }

    if (setting && setting.zoom > 1) {
      const p = projectPoint(setting.centerLon, setting.centerLat);
      const zoom = Math.max(1, Number(setting.zoom) || 1);
      setView({
        x: p.x - full.width / zoom / 2,
        y: p.y - full.height / zoom / 2,
        width: full.width / zoom,
        height: full.height / zoom
      });
    } else {
      setView(view);
    }

    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0;
    let startView = null;
    let suppressClickUntil = 0;

    function svgPoint(e) {
      const rect = svg.getBoundingClientRect();
      return {
        x: view.x + (e.clientX - rect.left) / rect.width * view.width,
        y: view.y + (e.clientY - rect.top) / rect.height * view.height
      };
    }

    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      const before = svgPoint(e);
      const factor = e.deltaY < 0 ? 1 / 1.18 : 1.18;
      const next = {
        width: view.width * factor,
        height: view.height * factor,
        x: before.x - (before.x - view.x) * factor,
        y: before.y - (before.y - view.y) * factor
      };
      setView(next);
    }, { passive: false });

    svg.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;

      /* Do not capture pointer events that start on a city pin.
         Otherwise the SVG may become the click target and the pin's own
         click handler will not open the photo carousel. */
      if (e.target.closest && e.target.closest(".map-pin")) return;

      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      startView = { x: view.x, y: view.y, width: view.width, height: view.height };
      svg.classList.add("map-dragging");
      svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      const rect = svg.getBoundingClientRect();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      setView({
        x: startView.x - dx / rect.width * startView.width,
        y: startView.y - dy / rect.height * startView.height,
        width: startView.width,
        height: startView.height
      });
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      svg.classList.remove("map-dragging");
      if (moved) suppressClickUntil = Date.now() + 250;
      if (e && svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    }
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);

    /* A drag that ends over a pin must not accidentally activate that pin. */
    svg.addEventListener("click", function (e) {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  }

  /* ---------- carousel ---------- */
  function Carousel(overlay) {
    const viewport = overlay.querySelector(".carousel-viewport");
    const track = overlay.querySelector(".carousel-track");
    const titleZh = overlay.querySelector(".carousel-title [lang-zh]");
    const titleEn = overlay.querySelector(".carousel-title [lang-en]");
    const countNow = overlay.querySelector(".carousel-count .now");
    const countAll = overlay.querySelector(".carousel-count .all");
    let items = [];
    let raf = null;

    /* paint() gives the centred photo z-index 100, while the arrows, the close
       button and the counter sit at z-index 3 in the overlay. `.carousel-viewport`
       is position:absolute with z-index:auto, so it does NOT create a stacking
       context and those 100s compete directly with the 3s — the photo wins and
       covers the controls. Giving the viewport its own z-index confines every
       item's z-index inside it, so the controls stay on top.
       (Only shows up once real images load: broken/empty images are too small
       to reach the arrows.) */
    if (!viewport.style.zIndex) viewport.style.zIndex = "1";

    /* centre-weighted scale + fade — the whole effect, kept deliberately plain.
       Falloff is measured in "items away from centre", not pixels, so it looks
       the same whether the photos are wide panoramas or narrow portraits. */
    function paint() {
      raf = null;
      const mid = viewport.scrollLeft + viewport.clientWidth / 2;
      const pitch = items.length > 1
        ? Math.abs((items[items.length - 1].offsetLeft - items[0].offsetLeft) / (items.length - 1))
        : viewport.clientWidth;
      const reach = Math.max(pitch * 2.6, 1);
      let best = 0, bestD = Infinity;

      items.forEach(function (el, i) {
        const c = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.min(Math.abs(c - mid) / reach, 1);
        el.style.transform = "scale(" + (1 - 0.3 * d).toFixed(4) + ")";
        el.style.opacity = Math.max(0, 1 - Math.pow(d, 1.45) * 1.05).toFixed(4);
        el.style.zIndex = String(100 - Math.round(d * 100));
        if (d < bestD) { bestD = d; best = i; }
      });

      items.forEach(function (el, i) { el.classList.toggle("is-active", i === best); });
      if (countNow) countNow.textContent = items.length ? best + 1 : 0;
    }

    function schedule() { if (raf === null) raf = requestAnimationFrame(paint); }

    function centreOn(i) {
      const el = items[i];
      if (!el) return;
      viewport.scrollTo({
        left: el.offsetLeft + el.offsetWidth / 2 - viewport.clientWidth / 2,
        behavior: "smooth"
      });
    }
    function activeIndex() {
      const mid = viewport.scrollLeft + viewport.clientWidth / 2;
      let best = 0, bestD = Infinity;
      items.forEach(function (el, i) {
        const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    viewport.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", function () { if (overlay.classList.contains("open")) pad(), schedule(); });

    /* wheel: let both mouse-wheel and trackpad input drive the horizontal strip.

       The viewport is `scroll-snap-type: x mandatory`. Snapping re-runs after
       every programmatic scrollLeft change, and one wheel tick (~100px) is far
       smaller than one photo (~600px), so the snap drags the strip straight back
       to the photo it started on — the wheel looks completely dead. It only
       worked before because unloaded images were a few pixels wide, which put
       the snap points closer together than a single tick.

       So: switch snapping off while the wheel is actually moving, then switch it
       back on and settle onto the nearest photo once it stops. The drag handler
       already does the same thing via the `.dragging` class in the stylesheet. */
    let wheelAccum = 0;
    let wheelLock = false;
    const WHEEL_STEP = 50;   // wheel travel that counts as one photo — lower = more sensitive

    viewport.addEventListener("wheel", function (e) {
      const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      if (wheelLock) return;               // ignore input while a step animates

      wheelAccum += delta;
      if (Math.abs(wheelAccum) < WHEEL_STEP) return;

      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      const target = Math.min(items.length - 1, Math.max(0, activeIndex() + dir));
      wheelLock = true;
      centreOn(target);
      setTimeout(function () { wheelLock = false; }, 260);   // let the smooth scroll land
    }, { passive: false });

    /* drag to pan */
    let down = false, startX = 0, startScroll = 0, moved = false;
    viewport.addEventListener("pointerdown", function (e) {
      down = true; moved = false;
      startX = e.clientX; startScroll = viewport.scrollLeft;
      viewport.classList.add("dragging");
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      viewport.scrollLeft = startScroll - dx;
    });
    function endDrag() {
      if (!down) return;
      down = false;
      viewport.classList.remove("dragging");
      if (moved) centreOn(activeIndex());
    }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    overlay.querySelector(".carousel-nav.prev").addEventListener("click", function () {
      centreOn(Math.max(0, activeIndex() - 1));
    });
    overlay.querySelector(".carousel-nav.next").addEventListener("click", function () {
      centreOn(Math.min(items.length - 1, activeIndex() + 1));
    });

    /* half-viewport of padding either side so the first and last can reach centre */
    function pad() {
      const half = viewport.clientWidth / 2;
      const firstW = items.length ? items[0].offsetWidth / 2 : 0;
      const lastW = items.length ? items[items.length - 1].offsetWidth / 2 : 0;
      track.style.paddingLeft = Math.max(0, half - firstW) + "px";
      track.style.paddingRight = Math.max(0, half - lastW) + "px";
    }

    this.open = function (city) {
      track.innerHTML = city.photos.map(function (src) {
        return '<figure class="carousel-item"><img src="' + src + '" alt="" draggable="false"></figure>';
      }).join("");
      items = Array.prototype.slice.call(track.querySelectorAll(".carousel-item"));

      titleZh.textContent = city.zh;
      titleEn.textContent = city.en;
      if (countAll) countAll.textContent = city.photos.length;

      overlay.classList.add("open");
      document.body.style.overflow = "hidden";

      /* images may not have laid out yet — settle once they have */
      const settle = function () { pad(); viewport.scrollLeft = 0; schedule(); };
      requestAnimationFrame(settle);
      let pending = items.length;
      items.forEach(function (el) {
        const img = el.querySelector("img");
        if (img.complete) { if (--pending === 0) requestAnimationFrame(settle); }
        else img.addEventListener("load", function () { if (--pending === 0) requestAnimationFrame(settle); }, { once: true });
      });
    };

    this.close = function () {
      wheelAccum = 0;
      wheelLock = false;
      overlay.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(function () { track.innerHTML = ""; items = []; }, 300);
    };
    this.isOpen = function () { return overlay.classList.contains("open"); };
    this.step = function (dir) { centreOn(Math.min(items.length - 1, Math.max(0, activeIndex() + dir))); };
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    const data = window.MAP_DATA;
    const cn = document.getElementById("map-china");
    const wd = document.getElementById("map-world");
    if (data) {
      if (cn) {
        cn.innerHTML = chinaSVG(data.china);
        enableMapView(cn.querySelector("svg"), data.china, "china");
      }
      if (wd) {
        wd.innerHTML = worldSVG(data.world);
        enableMapView(wd.querySelector("svg"), data.world, "world");
      }
    }

    const overlay = document.querySelector(".carousel-overlay");
    if (!overlay) return;
    const car = new Carousel(overlay);

    function open(key) {
      const city = window.PLACES[key];
      if (city && city.photos && city.photos.length) car.open(city);
    }

    document.querySelectorAll(".map-pin").forEach(function (pin) {
      pin.addEventListener("click", function () { open(pin.getAttribute("data-city")); });
      pin.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(pin.getAttribute("data-city")); }
      });
    });

    overlay.querySelector(".carousel-close").addEventListener("click", function () { car.close(); });
    document.addEventListener("keydown", function (e) {
      if (!car.isOpen()) return;
      if (e.key === "ArrowRight") car.step(1);
      if (e.key === "ArrowLeft") car.step(-1);
    });
  });
})();