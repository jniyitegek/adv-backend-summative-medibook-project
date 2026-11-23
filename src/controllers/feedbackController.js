const fs = require('fs');
const path = require('path');
const { SUPPORTED_LANGS, DEFAULT_LANG } = require('../config/constants');

/**
 * Escapes HTML characters to prevent XSS injection
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GET /feedback - Render localized HTML feedback & reflection page
 * Displays exactly 5 essay questions each answered in a textarea.
 * Accepts ?lang=en|rw, defaults and falls back to en.
 * Contains no submit button.
 */
async function renderFeedbackPage(req, res, next) {
  try {
    let lang = req.query.lang ? String(req.query.lang).toLowerCase().trim() : DEFAULT_LANG;

    if (!SUPPORTED_LANGS.includes(lang)) {
      lang = DEFAULT_LANG;
    }

    const localeFilePath = path.join(__dirname, `../../locales/${lang}.json`);
    let localeRaw;
    try {
      localeRaw = await fs.promises.readFile(localeFilePath, 'utf8');
    } catch (readErr) {
      // Fallback to default language file if reading fails
      const fallbackPath = path.join(__dirname, `../../locales/${DEFAULT_LANG}.json`);
      localeRaw = await fs.promises.readFile(fallbackPath, 'utf8');
      lang = DEFAULT_LANG;
    }

    const locale = JSON.parse(localeRaw);

    // Format current date in selected locale
    let formattedDate;
    try {
      formattedDate = new Intl.DateTimeFormat(lang, { dateStyle: 'full' }).format(new Date());
    } catch (dateErr) {
      formattedDate = new Intl.DateTimeFormat(DEFAULT_LANG, { dateStyle: 'full' }).format(new Date());
    }

    const html = `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(locale.title)}</title>
  <style>
    :root {
      --primary: #0284c7;
      --primary-hover: #0369a1;
      --bg-page: #f8fafc;
      --card-bg: #ffffff;
      --border-color: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #475569;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: var(--text-main);
      background-color: var(--bg-page);
      margin: 0;
      padding: 2.5rem 1rem;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: var(--card-bg);
      padding: 2.5rem 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--border-color);
    }
    .header {
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    h1 {
      color: var(--text-main);
      margin: 0;
      font-size: 1.85rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .lang-switcher {
      display: inline-flex;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .lang-switcher a {
      color: var(--text-muted);
      text-decoration: none;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    .lang-switcher a.active {
      background: #ffffff;
      color: var(--primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .date-badge {
      display: inline-block;
      background: #e0f2fe;
      color: var(--primary-hover);
      padding: 0.3rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      margin-top: 0.5rem;
    }
    .instructions {
      color: var(--text-muted);
      font-size: 1.05rem;
      margin-top: 1rem;
      margin-bottom: 0;
    }
    .qa-card {
      margin-bottom: 2rem;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .question-title {
      display: block;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.75rem;
      font-size: 1.05rem;
      line-height: 1.5;
    }
    textarea.answer-box {
      width: 100%;
      min-height: 130px;
      padding: 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.975rem;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      box-sizing: border-box;
      resize: vertical;
      outline: none;
    }
    textarea.answer-box:focus {
      background-color: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .footer-note {
      text-align: center;
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
      color: var(--text-muted);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="top-bar">
        <h1>${escapeHtml(locale.title)}</h1>
        <div class="lang-switcher">
          <a href="/feedback?lang=en" class="${lang === 'en' ? 'active' : ''}">English</a>
          <a href="/feedback?lang=rw" class="${lang === 'rw' ? 'active' : ''}">Kinyarwanda</a>
        </div>
      </div>
      <span class="date-badge">${escapeHtml(locale.dateLabel)}: ${escapeHtml(formattedDate)}</span>
      <p class="instructions">${escapeHtml(locale.instructions)}</p>
    </div>

    <div class="qa-card">
      <label class="question-title" for="q1">${escapeHtml(locale.q1)}</label>
      <textarea id="q1" class="answer-box" readonly rows="5">${escapeHtml(locale.a1)}</textarea>
    </div>

    <div class="qa-card">
      <label class="question-title" for="q2">${escapeHtml(locale.q2)}</label>
      <textarea id="q2" class="answer-box" readonly rows="5">${escapeHtml(locale.a2)}</textarea>
    </div>

    <div class="qa-card">
      <label class="question-title" for="q3">${escapeHtml(locale.q3)}</label>
      <textarea id="q3" class="answer-box" readonly rows="5">${escapeHtml(locale.a3)}</textarea>
    </div>

    <div class="qa-card">
      <label class="question-title" for="q4">${escapeHtml(locale.q4)}</label>
      <textarea id="q4" class="answer-box" readonly rows="5">${escapeHtml(locale.a4)}</textarea>
    </div>

    <div class="qa-card">
      <label class="question-title" for="q5">${escapeHtml(locale.q5)}</label>
      <textarea id="q5" class="answer-box" readonly rows="5">${escapeHtml(locale.a5)}</textarea>
    </div>

    <div class="footer-note">
      MediBook — Advanced Backend Summative Assessment
    </div>
  </div>
</body>
</html>`;

    res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(html);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  renderFeedbackPage
};
