/* ═══════════════════════════════════════════════════════════
   语言学习博客加载器 / Language-blog loader
   ═══════════════════════════════════════════════════════════

   ⚠ 部署到 GitHub Pages 必读 / REQUIRED for GitHub Pages:
   仓库根目录必须有一个名为 .nojekyll 的空文件。
   没有它，GitHub 会用 Jekyll 把 posts/*.md 编译成 .html 并删掉
   原始 .md，导致本文件抓取 .md 时拿到 404 页面。
   Your repo root must contain an empty file named `.nojekyll`.
   Without it GitHub's Jekyll converts posts/*.md into .html and
   removes the original .md, so fetching the .md returns a 404 page.

   ───────────────────────────────────────────────────────────
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

   本地预览需要 http 服务：`python3 -m http.server`。
   Local preview needs an http server: `python3 -m http.server`.
   ═══════════════════════════════════════════════════════════ */

(function () {

  /* A response that is really a 404/redirect HTML page must never be
     treated as post content — that is what produced the "Untitled"
     card full of GitHub 404 markup. */
  function looksLikeHtmlPage(text) {
    return /^\s*(<!doctype html|<html[\s>])/i.test(text);
  }

  function parseFrontmatter(raw) {
    const m = raw.match(/^﻿?---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
    if (!m) return null;                       // no frontmatter → not a valid post
    const meta = {};
    m[1].split(/\r?\n/).forEach(function (line) {
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
    const href = m.link || "#";
    return '<article class="blog-card">' + cover + "<div>" +
      '<div class="meta">' + (m.date || "") + "</div>" +
      '<h4><a href="' + href + '" target="_blank" rel="noopener">' +
      "<span lang-zh>" + zh + "</span><span lang-en>" + en + "</span></a></h4>" +
      '<div class="preview">' + post.html + "</div>" +
      (tags.length
        ? '<div class="tags">' + tags.map(function (t) { return '<span class="pixel-tag">' + t + "</span>"; }).join("") + "</div>"
        : "") +
      "</div></article>";
  }

  function hint(detail) {
    return '<div class="notice">' +
      "<span lang-en>Couldn't load posts" + (detail ? " (" + detail + ")" : "") +
      ". On GitHub Pages, make sure an empty <code>.nojekyll</code> file exists in the repo root — otherwise Jekyll turns <code>posts/*.md</code> into <code>.html</code> and the originals 404. Locally, serve the folder with <code>python3 -m http.server</code>.</span>" +
      "<span lang-zh>博文加载失败" + (detail ? "（" + detail + "）" : "") +
      "。部署在 GitHub Pages 时，请确认仓库根目录有一个空的 <code>.nojekyll</code> 文件 —— 否则 Jekyll 会把 <code>posts/*.md</code> 编译成 <code>.html</code>，原始 .md 就 404 了。本地预览请用 <code>python3 -m http.server</code> 打开。</span>" +
      "</div>";
  }

  async function load() {
    const full = document.getElementById("blog-list");     // language.html — all posts
    const latest = document.getElementById("blog-latest"); // index.html — newest 2
    if (!full && !latest) return;

    const show = function (html) {
      if (full) full.innerHTML = html;
      if (latest) latest.innerHTML = html;
    };

    let files;
    try {
      const res = await fetch("posts/index.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("index.json " + res.status);
      files = await res.json();
      if (!Array.isArray(files)) throw new Error("index.json is not a list");
    } catch (e) {
      show(hint(e.message));
      return;
    }

    const posts = [];
    let jekyllSuspected = false;

    for (const file of files) {
      try {
        const res = await fetch("posts/" + file, { cache: "no-cache" });
        if (!res.ok) {
          if (res.status === 404 && /\.md$/i.test(file)) jekyllSuspected = true;
          continue;
        }
        const raw = await res.text();
        /* a 200 that is actually an HTML page (SPA fallback, custom 404) */
        if (looksLikeHtmlPage(raw)) { jekyllSuspected = true; continue; }
        const parsed = parseFrontmatter(raw);
        if (!parsed) continue;                 // no frontmatter → skip, never render raw
        posts.push({ meta: parsed.meta, html: mdToHtml(parsed.body) });
      } catch (e) { /* skip unreachable post */ }
    }

    if (!posts.length) {
      show(hint(jekyllSuspected ? "posts/*.md returned 404 — missing .nojekyll" : "no readable posts"));
      return;
    }

    if (full) full.innerHTML = posts.map(renderCard).join("");
    if (latest) latest.innerHTML = posts.slice(0, 2).map(renderCard).join("");
  }

  document.addEventListener("DOMContentLoaded", load);
})();
