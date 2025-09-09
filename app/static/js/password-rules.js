// Reusable password rules initializer
// Usage:
// initPasswordRules({
//   inputId: 'contrasena',            // required
//   confirmId: 'confirm-password',    // optional
//   formSelector: 'form',             // required: form to block submit
//   submitSelector: 'button[type="submit"]', // optional: to toggle disabled
//   ui: {                             // optional: ids for rule indicators (created if absent)
//     minLengthId: 'pwd-min-length',
//     uppercaseId: 'pwd-uppercase',
//     numberId: 'pwd-number',
//     matchId: 'pwd-match'            // only used if confirmId provided
//   }
// });

(function () {
  function ensureRuleEl(id, parent, label) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'text-gray-400 text-xs';
      el.textContent = `• ${label}`;
      parent.appendChild(el);
    }
    return el;
  }

  function setOk(el, ok) {
    if (!el) return;
    el.classList.toggle('text-gray-400', !ok);
    el.classList.toggle('text-green-400', ok);
  }

  function validPassword(pw) {
    return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
  }

  window.initPasswordRules = function initPasswordRules(opts) {
    const input = document.getElementById(opts.inputId);
    if (!input) return;
    const form = document.querySelector(opts.formSelector);
    if (!form) return;

    const confirm = opts.confirmId ? document.getElementById(opts.confirmId) : null;
    const submitBtn = opts.submitSelector ? form.querySelector(opts.submitSelector) : null;

    // UI container as sibling AFTER the input wrapper, so the eye button
    // (absolute inside wrapper) does not shift vertically when rules show.
    const uiWrap = document.createElement('div');
    uiWrap.className = 'text-xs mt-1 hidden';
    const wrapper = input.closest('.relative') || input.parentElement;
    const cWrapper = confirm ? (confirm.closest && (confirm.closest('.relative') || confirm.parentElement)) : null;
    if (wrapper && wrapper.parentElement) {
      wrapper.insertAdjacentElement('afterend', uiWrap);
    } else {
      input.insertAdjacentElement('afterend', uiWrap);
    }

    const ids = Object.assign({
      minLengthId: 'pwd-min-length',
      uppercaseId: 'pwd-uppercase',
      numberId: 'pwd-number',
      matchId: 'pwd-match'
    }, opts.ui || {});

    const minEl = ensureRuleEl(ids.minLengthId, uiWrap, 'Mínimo 8 caracteres');
    const upEl = ensureRuleEl(ids.uppercaseId, uiWrap, 'Al menos una letra mayúscula');
    const numEl = ensureRuleEl(ids.numberId, uiWrap, 'Al menos un número');
    let matchEl = null;
    if (confirm) {
      matchEl = ensureRuleEl(ids.matchId, uiWrap, 'Las contraseñas deben coincidir');
    }

    function evaluate() {
      const pw = input.value || '';
      const okLen = pw.length >= 8;
      const okUp = /[A-Z]/.test(pw);
      const okNum = /[0-9]/.test(pw);
      setOk(minEl, okLen); setOk(upEl, okUp); setOk(numEl, okNum);
      let okMatch = true;
      if (confirm && matchEl) {
        okMatch = pw.length > 0 && confirm.value.length > 0 && pw === confirm.value;
        matchEl.textContent = okMatch ? '• Las contraseñas coinciden' : '• Las contraseñas deben coincidir';
        setOk(matchEl, okMatch);
      }
      const allOk = okLen && okUp && okNum && okMatch;
      if (submitBtn) {
        submitBtn.disabled = !allOk;
        submitBtn.classList.toggle('opacity-50', !allOk);
        submitBtn.classList.toggle('cursor-not-allowed', !allOk);
      }
      return allOk;
    }

    input.addEventListener('input', evaluate);
    if (confirm) confirm.addEventListener('input', evaluate);

    // Show on focus anywhere inside the password group (input or its toggle button)
    function show() { uiWrap.classList.remove('hidden'); }
    function isInPwGroup(el) {
      if (!el) return false;
      if (wrapper && wrapper.contains(el)) return true;
      if (cWrapper && cWrapper.contains(el)) return true;
      return false;
    }
    function maybeHide() {
      const ae = document.activeElement;
      if (isInPwGroup(ae)) return; // keep visible when interacting with eye button
      const a = (input.value || '').length;
      const b = confirm ? (confirm.value || '').length : 0;
      if (!a && !b) uiWrap.classList.add('hidden');
    }
    // Use focusin/focusout on wrappers so clicks on the eye don't hide rules
    if (wrapper) {
      wrapper.addEventListener('focusin', show);
      wrapper.addEventListener('focusout', () => setTimeout(maybeHide, 0));
    }
    if (cWrapper) {
      cWrapper.addEventListener('focusin', show);
      cWrapper.addEventListener('focusout', () => setTimeout(maybeHide, 0));
    }

    form.addEventListener('submit', function (e) {
      if (!evaluate()) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // initial state
    evaluate();
    // keep hidden initially until focus
    uiWrap.classList.add('hidden');
  };
})();
