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

