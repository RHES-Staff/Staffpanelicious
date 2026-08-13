var Theme = (function () {
  var KEY = "staffpanelicious:theme";

  function current() {
    return localStorage.getItem(KEY) || "light";
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }

  function toggle() {
    apply(current() === "light" ? "dark" : "light");
  }

  function init() {
    apply(current());
  }

  return { current: current, apply: apply, toggle: toggle, init: init };
})();
