/**
 * ═══════════════════════════════════════════════════════
 *  PokerRoyale — Global Currency Override (USD)
 *  File: currency-override.js  (ROOT folder)
 *
 *  Kaam:
 *  - PKR / Rs / Rs. → $ (USD)
 *  - Pakistani payment labels ko optional international banata hai
 *  - formatCurrency / APP.currency ko USD pe force karta hai
 *
 *  Usage: har HTML ke </body> se PEHLE:
 *  <script src="currency-override.js"></script>
 *  admin pages ke liye:
 *  <script src="../currency-override.js"></script>
 * ═══════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─── CONFIG (USA Client) ───
  const CURRENCY = {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    name: 'US Dollar'
  };

  // Global access
  window.POKER_CURRENCY = CURRENCY;
  window.APP = window.APP || {};
  window.APP.currency = CURRENCY.code;
  window.APP.currencySymbol = CURRENCY.symbol;

  // ─── Format helper (sab jagah use ho sakta hai) ───
  window.formatCurrency = function (amount, showCode) {
    const n = Number(amount) || 0;
    try {
      const formatted = new Intl.NumberFormat(CURRENCY.locale, {
        style: 'currency',
        currency: CURRENCY.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(n);
      return showCode ? formatted + ' ' + CURRENCY.code : formatted;
    } catch (e) {
      return CURRENCY.symbol + n.toLocaleString(CURRENCY.locale);
    }
  };

  window.formatChips = function (amount) {
    const n = Number(amount) || 0;
    if (n >= 1000000) return CURRENCY.symbol + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return CURRENCY.symbol + (n / 1000).toFixed(1) + 'K';
    return CURRENCY.symbol + n.toLocaleString(CURRENCY.locale);
  };

  // ─── Text replace rules (order matter karta hai) ───
  function convertCurrencyText(text) {
    if (!text || typeof text !== 'string') return text;
    if (!/PKR|Rs\.?|₨|pkr/i.test(text) && !/Pakistan/i.test(text)) {
      // phir bhi common labels fix
    }

    let t = text;

    // Full forms pehle
    t = t.replace(/PKR\s*/gi, CURRENCY.symbol);
    t = t.replace(/Rs\.?\s*/gi, CURRENCY.symbol);
    t = t.replace(/₨\s*/g, CURRENCY.symbol);

    // "Prize Pool PKR" etc.
    t = t.replace(/Prize Pool PKR/gi, 'Prize Pool USD');
    t = t.replace(/in PKR/gi, 'in USD');
    t = t.replace(/\(PKR\)/gi, '(USD)');
    t = t.replace(/\bPKR\b/gi, 'USD');

    // Optional: Pakistan-specific marketing → global (sirf text nodes)
    t = t.replace(/Pakistan'?s?\s*#?\s*1/gi, "World's #1");
    t = t.replace(/Pakistan'?s most trusted/gi, "World's most trusted");
    t = t.replace(/in Pakistan and beyond/gi, 'worldwide');
    t = t.replace(/Pakistani and international payment methods/gi, 'major international payment methods');
    t = t.replace(/EasyPaisa, JazzCash(?:\s*&\s*bank transfer)?/gi, 'PayPal, Skrill, Cards & Crypto');
    t = t.replace(/EasyPaisa\s*&\s*JazzCash/gi, 'PayPal & Skrill');
    t = t.replace(/\bEasyPaisa\b/gi, 'PayPal');
    t = t.replace(/\bJazzCash\b/gi, 'Skrill');

    return t;
  }

  // ─── Walk all text nodes & replace ───
  function walkAndReplace(root) {
    const walker = document.createTreeWalker(
      root || document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          // skip script/style
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          const tag = p.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          // only touch nodes that look currency-related or local market text
          if (/PKR|Rs\.?|₨|EasyPaisa|JazzCash|Pakistan/i.test(node.nodeValue)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function (node) {
      const next = convertCurrencyText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  // ─── attributes: placeholder, title, aria-label, value (buttons) ───
  function replaceAttributes(root) {
    const el = root || document;
    el.querySelectorAll('[placeholder], [title], [aria-label], [data-tooltip]').forEach(function (node) {
      ['placeholder', 'title', 'aria-label', 'data-tooltip'].forEach(function (attr) {
        if (node.hasAttribute(attr)) {
          const v = node.getAttribute(attr);
          const nv = convertCurrencyText(v);
          if (nv !== v) node.setAttribute(attr, nv);
        }
      });
    });
  }

  // ─── input values that show PKR ───
  function replaceInputValues(root) {
    (root || document).querySelectorAll('input, textarea, button').forEach(function (el) {
      if (el.value && /PKR|Rs\.?/i.test(el.value)) {
        el.value = convertCurrencyText(el.value);
      }
    });
  }

  // ─── Run full conversion ───
  function applyUsdEverywhere(root) {
    try {
      walkAndReplace(root || document.body);
      replaceAttributes(root || document);
      replaceInputValues(root || document);
    } catch (e) {
      console.warn('Currency override error:', e);
    }
  }

  // ─── Watch dynamic content (lobby tables, admin stats, etc.) ───
  function observeDom() {
    if (!window.MutationObserver || !document.body) return;

    let timer = null;
    const obs = new MutationObserver(function (mutations) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              applyUsdEverywhere(node);
            } else if (node.nodeType === 3) {
              const next = convertCurrencyText(node.nodeValue);
              if (next !== node.nodeValue) node.nodeValue = next;
            }
          });
        });
      }, 50);
    });

    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ─── Patch common page functions if they exist later ───
  function patchGlobals() {
    // If main.js APP exists
    if (window.APP) {
      window.APP.currency = 'USD';
      window.APP.currencySymbol = '$';
    }
  }

  // ─── INIT ───
  function init() {
    patchGlobals();
    applyUsdEverywhere();
    observeDom();
    console.log('%c💵 Currency Override Active → USD ($)', 'color:#FFD700;font-weight:bold;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose manual re-run (optional)
  window.applyUsdCurrency = applyUsdEverywhere;
})();