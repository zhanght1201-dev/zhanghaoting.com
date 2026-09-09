const filterButtons = document.querySelectorAll("[data-filter]");
const notes = document.querySelectorAll("[data-note]");
const emptyMessage = document.querySelector("[data-empty-message]");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedCategory = button.dataset.filter;
    let visibleCount = 0;

    filterButtons.forEach((item) => {
      const isCurrent = item === button;
      item.classList.toggle("is-active", isCurrent);
      item.setAttribute("aria-pressed", String(isCurrent));
    });

    notes.forEach((note) => {
      const isVisible =
        selectedCategory === "all" || note.dataset.category === selectedCategory;
      note.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (emptyMessage) emptyMessage.hidden = visibleCount !== 0;
  });
});

// Navigation is visible without JavaScript; collapse only when enhancement is ready.
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-nav");
const compactNavigation = window.matchMedia("(max-width: 820px)");
if (menuToggle && navigation) {
  const syncMenu = () => {
    menuToggle.hidden = !compactNavigation.matches;
    menuToggle.setAttribute("aria-expanded", "false");
    navigation.hidden = compactNavigation.matches;
  };
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    navigation.hidden = !isOpen;
  });
  navigation.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && compactNavigation.matches) {
      syncMenu();
      menuToggle.focus();
    }
  });
  compactNavigation.addEventListener("change", syncMenu);
  syncMenu();
}

// Real links perform navigation. This layer only connects the character to an object.
const scene = document.querySelector("[data-scene]");
if (scene) {
  const hint = scene.querySelector("[data-character-hint]");
  const trail = scene.querySelector("[data-scene-trail]");
  const links = [...scene.querySelectorAll("[data-scene-link]")];
  const paths = {
    about: "M 425 300 L 350 275 L 245 245",
    school: "M 510 280 L 620 225 L 715 205",
    work: "M 510 360 L 620 425 L 780 445",
    notes: "M 425 365 L 335 420 L 210 450",
  };
  let hoveredLink = null;
  const showLink = () => {
    const focusedLink = links.find((link) => link === document.activeElement);
    const link = focusedLink || hoveredLink;
    if (!link) {
      delete scene.dataset.active;
      trail.setAttribute("d", "");
      return;
    }
    scene.dataset.active = link.dataset.sceneLink;
    hint.textContent = `${link.dataset.hint} →`;
    trail.setAttribute("d", paths[link.dataset.sceneLink] || "");
  };
  links.forEach((link) => {
    link.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") { hoveredLink = link; showLink(); }
    });
    link.addEventListener("pointerleave", () => { hoveredLink = null; showLink(); });
    link.addEventListener("focus", showLink);
    link.addEventListener("blur", () => queueMicrotask(showLink));
  });
}

