/* Maryland Property Group — shared behavior for standalone pages.
   Year stamp, mobile nav toggle, and progressive lead-form submission
   (POST /api/lead, then FormSubmit.co AJAX fallback) — mirrors index.html. */
(function () {
  "use strict";
  var CONTACT_EMAIL = "ben@marylandpropertygroup.com";
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/" + CONTACT_EMAIL;
  var $ = function (s, c) {
    return (c || document).querySelector(s);
  };

  /* year */
  var yr = $("#yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* mobile nav */
  var hamb = $("#hamb");
  var nav = $("#sitenav");
  if (hamb && nav) {
    hamb.addEventListener("click", function () {
      var open = nav.classList.toggle("show");
      hamb.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* progressive lead forms: add data-lead to a <form>, mark required fields
     with `required`, and provide an .ok-msg sibling with id = form id + "-ok". */
  function buildBody(f) {
    var lines = [];
    Array.prototype.forEach.call(
      f.querySelectorAll("input,select,textarea"),
      function (el) {
        if (!el.name || el.type === "checkbox" || el.name === "company") return;
        var label = "";
        var lab = f.querySelector('label[for="' + el.id + '"]');
        if (lab) label = lab.textContent.replace(/\s*\*$/, "").trim();
        if (el.value) lines.push((label || el.name) + ": " + el.value);
      },
    );
    return lines.join("\n");
  }

  Array.prototype.forEach.call(
    document.querySelectorAll("form[data-lead]"),
    function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var hp = f.querySelector("[name=company]");
        if (hp && hp.value) return; /* honeypot */
        var reqs = f.querySelectorAll("[required]");
        for (var i = 0; i < reqs.length; i++) {
          var rq = reqs[i];
          if (rq.type === "checkbox" ? !rq.checked : !rq.value) {
            rq.focus();
            return;
          }
        }
        var btn = f.querySelector('[type="submit"]');
        var ot = btn ? btn.textContent : "";
        var subject =
          f.getAttribute("data-subject") ||
          "Website lead — Maryland Property Group";
        var body = buildBody(f);
        var okId = f.id + "-ok";
        function reset() {
          if (btn) {
            btn.disabled = false;
            btn.textContent = ot;
          }
        }
        function done() {
          var m = document.getElementById(okId);
          if (m) {
            m.style.display = "block";
            m.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          reset();
          if (typeof f.reset === "function") f.reset();
        }
        function fail() {
          reset();
          var er = f.querySelector(".form-err");
          if (!er) {
            er = document.createElement("div");
            er.className = "form-err";
            er.setAttribute("role", "alert");
            er.style.cssText =
              "margin-top:12px;color:#962d22;background:#fdf2f1;border:1px solid #e3b7b1;border-radius:8px;padding:10px 14px;font-size:.9rem";
            f.appendChild(er);
          }
          er.textContent =
            "Sorry — we couldn't send your message just now. Please email " +
            CONTACT_EMAIL +
            " and we'll respond promptly.";
        }
        function sendDirect() {
          fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              _subject: subject,
              _template: "table",
              _captcha: "false",
              message: body,
            }),
          })
            .then(function (r) {
              return r.json();
            })
            .then(function (j) {
              if (j && (j.success === true || j.success === "true")) done();
              else fail();
            })
            .catch(fail);
        }
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Sending…";
        }
        var meta = {
          pageSource: location.pathname,
          timestamp: new Date().toISOString(),
        };
        fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            form: f.id,
            subject: subject,
            body: body,
            meta: meta,
          }),
        })
          .then(function (r) {
            if (r.ok) done();
            else sendDirect();
          })
          .catch(sendDirect);
      });
    },
  );
})();
