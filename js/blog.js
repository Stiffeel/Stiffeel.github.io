/* ═══════════════════════════════════════════════════════════
   语言学习博客加载器 / Language-blog loader
   ═══════════════════════════════════════════════════════════

   每篇博文 = posts/ 目录下的一个 .md 文件：
   One post = one .md file in posts/ :

   ---
   title: 中文标题
   title_en: English title
   date: 2026-01-10
   link: https://完整博文的外部地址
   cover: assets/images/example.jpg      (可选 / optional)
   tags: 语言学习, Yulengua                (可选 / optional)
   ---
   下面是卡片上显示的概括正文，支持 **加粗** *斜体* `代码`
   [链接](url) 和 ![图片](url)。

   写新博文 / To publish:
     1. 在 posts/ 新建一个 .md 文件
     2. 把文件名加到 posts/index.json 的数组最前面（最新的排最前）
   完成，不用碰任何代码。 That's it — no code to touch.

   注意：读取 .md 需要通过 http 服务访问。本地直接双击 html 看不到列表，
   用 `python3 -m http.server` 即可；发布到 GitHub Pages 后自动正常。
   Note: fetching .md needs an http server; file:// previews show a hint
   instead. GitHub Pages works out of the box.
   ═══════════════════════════════════════════════════════════ */

(function () {
  function parseFrontmatter(raw) {
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!m) return { meta: {}, body: raw.trim() };
    const meta = {};
    m[1].split("\n").forEach(function (line) {
      const i = line.indexOf(":");
      if (i === -1) return;
      meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
    return { meta: meta, body: m[2].trim() };
  }

  function mdInline(text) {
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function mdToHtml(md) {
    return md.split(/\n\s*\n/).map(function (b) {
      const t = b.trim();
      if (!t) return "";
      if (/^!\[/.test(t)) return mdInline(t);
      return "<p>" + mdInline(t).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function renderCard(post) {
    const m = post.meta;
    const tags = (m.tags || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    const cover = m.cover ? '<div class="cover"><img src="' + m.cover + '" alt="" loading="lazy"></div>' : "";
    const zh = m.title || m.title_en || "Untitled";
    const en = m.title_en || m.title || "Untitled";
    return '<article class="blog-card">' + cover + '<div>' +
      '<div class="meta">' + (m.date || "") + '</div>' +
      '<h4><a href="' + (m.link || "#") + '" target="_blank" rel="noopener">' +
      '<span lang-zh>' + zh + '</span><span lang-en>' + en + '</span></a></h4>' +
      '<div class="preview">' + post.html + '</div>' +
      (tags.length
        ? '<div class="tags">' + tags.map(function (t) { return '<span class="pixel-tag">' + t + "</span>"; }).join("") + "</div>"
        : "") +
      "</div></article>";
  }

  function hint() {
    return '<div class="notice">' +
      "<span lang-en>Posts load over http — for a local preview run <code>python3 -m http.server</code> in this folder. On GitHub Pages this works automatically.</span>" +
      "<span lang-zh>博文需要通过 http 读取 —— 本地预览请在此目录运行 <code>python3 -m http.server</code>。发布到 GitHub Pages 后会自动正常。</span>" +
      "</div>";
  }

  async function load() {
    const full = document.getElementById("blog-list");     // language.html — all posts
    const latest = document.getElementById("blog-latest"); // index.html — newest 2
    if (!full && !latest) return;

    try {
      const files = await (await fetch("posts/index.json")).json();
      const posts = [];
      for (const file of files) {
        try {
          const raw = await (await fetch("posts/" + file)).text();
          const p = parseFrontmatter(raw);
          posts.push({ meta: p.meta, html: mdToHtml(p.body) });
        } catch (e) { /* skip unreadable post */ }
      }
      if (!posts.length) throw new Error("empty");
      if (full) full.innerHTML = posts.map(renderCard).join("");
      if (latest) latest.innerHTML = posts.slice(0, 2).map(renderCard).join("");
    } catch (e) {
      if (full) full.innerHTML = hint();
      if (latest) latest.innerHTML = hint();
    }
  }

  document.addEventListener("DOMContentLoaded", load);
})();
