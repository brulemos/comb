/** Operações de DOM compartilhadas, sem estado nem dependência do motor. */
export const selecionar = (selector, root = document) => root.querySelector(selector);
export const selecionarTodos = (selector, root = document) => [...root.querySelectorAll(selector)];
export const escaparHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
  );
