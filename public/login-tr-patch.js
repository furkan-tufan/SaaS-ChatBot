// Auth ekranlarını (login / signup / request-password-reset / password-reset / email-verification)
// uygulama koduna dokunmadan TR’ye çevirir. SPA route değişimlerini de dinler.

(function () {
  const ROUTES = [
    /^\/login\/?$/i,
    /^\/signup\/?$/i,
    /^\/request-password-reset\/?$/i,
    /^\/password-reset\/?$/i,
    /^\/email-verification\/?$/i
  ];
  const isAuthRoute = (p = location.pathname) =>
    ROUTES.some(r => r.test(p.replace(/\/+$/, "")));

  // ---- reveal (FOUC engelini kaldır) -------------------------------------
  function reveal() {
    const html = document.documentElement;
    if (html.getAttribute("data-tr") !== "1") {
      html.setAttribute("data-tr", "1");
      const style = document.getElementById("tr-hide");
      if (style && style.parentNode) style.parentNode.removeChild(style);
    }
  }

  // ---- Utils --------------------------------------------------------------
  let debounced;
  const debounce = (fn, ms) => () => { clearTimeout(debounced); debounced = setTimeout(fn, ms); };

  const priorityRules = [
    [/^\s*(Log in|Sign in)\s+to your account\s*$/i, "Hesabına Giriş Yap"],
    [/^\s*Create a new account\s*$/i, "Yeni bir hesap oluştur"],
    [/^\s*Forgot your password\?\s*$/i, "Şifreni mi unuttun?"],
    [/^\s*Send password reset email\s*$/i, "Şifre sıfırlama e-postası gönder"],
  ];

  const commonRules = [
    // temel
    [/^Log in$/i, "Giriş Yap"], [/^Login$/i, "Giriş Yap"], [/^Sign in$/i, "Giriş Yap"],
    [/^Sign up$/i, "Kayıt Ol"], [/^Create account$/i, "Hesap Oluştur"], [/^Continue$/i, "Devam et"],
    [/^Or$/i, "veya"], [/^Email$/i, "E-posta"], [/^E-mail$/i, "E-posta"],
    [/^Password$/i, "Şifre"], [/^New password$/i, "Yeni şifre"], [/^Confirm new password$/i, "Yeni şifre (tekrar)"],
    [/^Email verification$/i, "E-posta doğrulama"], [/^Verification code$/i, "Doğrulama kodu"],
    [/^Verify email$/i, "E-postayı doğrula"], [/^Resend verification$/i, "Doğrulamayı tekrar gönder"],

    // statü / hata
    [/^Email verification failed, invalid token$/i, "E-posta doğrulaması başarısız, geçersiz kod"],
    [/^Password reset failed, invalid token$/i, "Şifre sıfırlama başarısız, geçersiz kod"],
    [/^You need to have an email address associated with your GitHub account to sign up\.$/i,
      "Kayıt olmak için GitHub hesabınıza bağlı bir e-posta adresiniz olmalıdır."],
    [/^Failed to send password reset email\.?$/i, "Şifre sıfırlama e-postası gönderilemedi."],
    [/^Failed to send email verification email\.?$/i, "E-posta doğrulama e-postası gönderilemedi."],
    [/^Failed to send email\.?$/i, "E-posta gönderilemedi."],

    // dinamik
    [/^User with email:\s*(.+?)\s*not found\.?$/i, (_m, email) => `${email} adresiyle kullanıcı bulunamadı`],
    [/^Please wait\s+(\d+)\s+secs?\s+before trying again\.?$/i,
      (_m, s) => `Tekrar denemeden önce ${s} saniye bekleyiniz.`],

    // cümle içinde varyasyonlar + linkli kalıplar
    [/\bLog in\b/gi, "Giriş Yap"], [/\bSign in\b/gi, "Giriş Yap"], [/\bSign up\b/gi, "Kayıt Ol"],
    [/\bCreate account\b/gi, "Hesap Oluştur"], [/\bRemember me\b/gi, "Beni hatırla"],
    [/\bOr\b/gi, "veya"], [/\bE-mail\b/gi, "E-posta"],

    // linkler
    [/\(?\s*go to signup\s*\)?\.?/gi, "kayıt ol"],
    [/\(?\s*go to login\s*\)?\.?/gi, "giriş yap"],
    [/\breset it\b\.?/gi, "sıfırla"],

    // birleşik cümleler
    [/I already have an account\s*\(?/gi, "Zaten hesabım var ("],
    [/Don'?t have an account yet\?\s*/gi, "Hesabın yok mu? "],
  ];

  function replaceTextNodes(root, rules) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentNode && node.parentNode.nodeName;
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((n) => {
      let v = n.nodeValue;
      [...priorityRules, ...rules].forEach(([re, tr]) => {
        v = (typeof tr === "function") ? v.replace(re, tr) : v.replace(re, tr);
      });
      if (v !== n.nodeValue) n.nodeValue = v;
    });
  }

  function replaceAttributes() {
    document
      .querySelectorAll("input[placeholder],button[title],a[title],input[type='submit'][value]")
      .forEach((el) => {
        const get = (a) => el.getAttribute(a);

        const ph = get("placeholder");
        if (ph) {
          let np = ph;
          np = np.replace(/^Email$/i, "E-posta")
            .replace(/^E-mail$/i, "E-posta")
            .replace(/^Password$/i, "Şifre")
            .replace(/^New password$/i, "Yeni şifre")
            .replace(/^Confirm new password$/i, "Yeni şifre (tekrar)")
            .replace(/^Verification code$/i, "Doğrulama kodu");
          if (np !== ph) el.setAttribute("placeholder", np);
        }

        const title = get("title");
        if (title) {
          let nt = title.replace(/^Log in$/i, "Giriş Yap")
            .replace(/^Sign up$/i, "Kayıt Ol")
            .replace(/^Reset password$/i, "Şifreyi Sıfırla");
          if (nt !== title) el.setAttribute("title", nt);
        }

        const val = get("value");
        if (val) {
          let nv = val.replace(/^Log in$/i, "Giriş Yap")
            .replace(/^Sign up$/i, "Kayıt Ol")
            .replace(/^Continue$/i, "Devam et")
            .replace(/^\s*Send password reset (email|link)\s*$/i, "Şifre sıfırlama e-postası gönder")
            .replace(/^Reset password$/i, "Şifreyi Sıfırla")
            .replace(/^Verify email$/i, "E-postayı doğrula");
          if (nv !== val) el.setAttribute("value", nv);
        }
      });
  }

  function replaceLinks() {
    document.querySelectorAll("a").forEach((a) => {
      const txt = (a.textContent || "").trim();
      const href = (a.getAttribute("href") || "").toLowerCase();

      let nt = txt
        .replace(/^\(?\s*go to signup\s*\)?\.?$/i, "kayıt ol")
        .replace(/^\(?\s*go to login\s*\)?\.?$/i, "giriş yap")
        .replace(/^\s*reset it\.?\s*$/i, "sıfırla");
      if (nt !== txt) { a.textContent = nt; return; }

      if (href.endsWith("/signup")) a.textContent = "Kayıt Ol";
      else if (href.endsWith("/login")) a.textContent = "Giriş Yap";
      else if (href.includes("request-password") || href.includes("password-reset")) a.textContent = "Sıfırla";
    });
  }

  function patchIfNeeded() {
    if (!isAuthRoute()) { reveal(); return; }
    document.documentElement.lang = "tr";
    replaceTextNodes(document.body, commonRules);
    replaceAttributes();
    replaceLinks();
    reveal();
  }

  // ---- SPA route değişimleri ---------------------------------------------
  function hookHistory() {
    const fire = () => setTimeout(patchIfNeeded, 0);
    const _push = history.pushState;
    history.pushState = function () { const r = _push.apply(this, arguments); fire(); return r; };
    const _replace = history.replaceState;
    history.replaceState = function () { const r = _replace.apply(this, arguments); fire(); return r; };
    window.addEventListener("popstate", fire);
  }

  // ---- DOM gözlemcisi -----------------------------------------------------
  function setupObserver() {
    const mo = new MutationObserver(debounce(patchIfNeeded, 50));
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  function init() {
    hookHistory();
    setupObserver();
    patchIfNeeded();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
