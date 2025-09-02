(() => {
  const input = document.getElementById("contrasena");
  const btn = document.getElementById("togglePassword");
  if (!input || !btn) return;

  const eyeOpen = btn.querySelector("#eyeOpen");
  const eyeClosed = btn.querySelector("#eyeClosed");

  const setState = (show) => {
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-pressed", show ? "true" : "false");

    eyeOpen.classList.toggle("opacity-0", show);
    eyeOpen.classList.toggle("scale-0", show);
    eyeOpen.classList.toggle("opacity-100", !show);
    eyeOpen.classList.toggle("scale-100", !show);

    eyeClosed.classList.toggle("opacity-100", show);
    eyeClosed.classList.toggle("scale-100", show);
    eyeClosed.classList.toggle("opacity-0", !show);
    eyeClosed.classList.toggle("scale-0", !show);
  };

  let showing = false;
  setState(showing);

  btn.addEventListener("click", () => {
    showing = !showing;
    setState(showing);
  });
})();
