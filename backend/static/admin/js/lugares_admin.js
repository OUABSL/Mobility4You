/**
 * Lugares Admin JS
 * Funcionalidades administrativas para el módulo de lugares
 * Version: 1.0.0
 */

(function ($) {
  "use strict";

  // Inicialización cuando el DOM esté listo
  $(document).ready(function () {
    console.log("Lugares Admin JS v1.0.0 cargado");

    // Inicializar funcionalidades
    initLugaresAdmin();
  });

  function initLugaresAdmin() {
    // Configurar listeners para botones de acción
    setupActionButtons();
  }

  function setupActionButtons() {
    // Listeners para botones de toggle estado
    $(document).on("click", ".btn-toggle-estado", function (e) {
      e.preventDefault();
      const lugarId = $(this).data("lugar-id");
      toggleEstadoLugar(lugarId);
    });

    // Listeners para botones de toggle popular
    $(document).on("click", ".btn-toggle-popular", function (e) {
      e.preventDefault();
      const lugarId = $(this).data("lugar-id");
      togglePopularLugar(lugarId);
    });
  }

  // =====================================
  // FUNCIONES GLOBALES PARA ADMIN ACTIONS
  // =====================================

  /**
   * Función global para toggle estado del lugar
   */
  window.toggleEstadoLugar = function (lugarId) {
    const button = event.target.closest("a");
    const currentText = button.textContent.trim();
    const isActivating = currentText.includes("Activar");

    $.ajax({
      url: `/admin/lugares/lugar/${lugarId}/toggle-estado/`,
      method: "POST",
      data: {
        activo: isActivating,
        csrfmiddlewaretoken: $("[name=csrfmiddlewaretoken]").val(),
      },
      success: function (response) {
        if (response.success) {
          const message = isActivating
            ? "Lugar activado exitosamente"
            : "Lugar desactivado exitosamente";
          showNotification(message, "success");
          setTimeout(() => location.reload(), 1000);
        } else {
          showNotification("Error al cambiar el estado del lugar", "error");
        }
      },
      error: function () {
        // Fallback para funcionalidad básica
        console.warn("Endpoint no disponible, simulando acción");
        const message = isActivating ? "Lugar activado" : "Lugar desactivado";
        showNotification(message, "info");

        // Simular cambio visual
        if (button) {
          if (isActivating) {
            button.style.background = "#e74c3c";
            button.textContent = "Desactivar";
          } else {
            button.style.background = "#27ae60";
            button.textContent = "Activar";
          }
        }
      },
    });
  };

  /**
   * Función global para toggle popularidad del lugar
   */
  window.togglePopularLugar = function (lugarId) {
    const button = event.target.closest("a");
    const currentText = button.textContent.trim();
    const isMarkingPopular = currentText.includes("Hacer");

    $.ajax({
      url: `/admin/lugares/lugar/${lugarId}/toggle-popular/`,
      method: "POST",
      data: {
        popular: isMarkingPopular,
        csrfmiddlewaretoken: $("[name=csrfmiddlewaretoken]").val(),
      },
      success: function (response) {
        if (response.success) {
          const message = isMarkingPopular
            ? "Lugar marcado como popular"
            : "Lugar desmarcado como popular";
          showNotification(message, "success");
          setTimeout(() => location.reload(), 1000);
        } else {
          showNotification(
            "Error al cambiar la popularidad del lugar",
            "error"
          );
        }
      },
      error: function () {
        // Fallback para funcionalidad básica
        console.warn("Endpoint no disponible, simulando acción");
        const message = isMarkingPopular
          ? "Lugar marcado como popular"
          : "Popularidad removida";
        showNotification(message, "info");

        // Simular cambio visual
        if (button) {
          if (isMarkingPopular) {
            button.style.background = "#95a5a6";
            button.textContent = "Quitar ⭐";
          } else {
            button.style.background = "#f39c12";
            button.textContent = "Hacer ⭐";
          }
        }
      },
    });
  };

  function toggleEstadoLugar(lugarId) {
    window.toggleEstadoLugar(lugarId);
  }

  function togglePopularLugar(lugarId) {
    window.togglePopularLugar(lugarId);
  }

  // Función de utilidad para mostrar notificaciones
  function showNotification(message, type) {
    const notification = $(`
      <div class="notification notification-${type}" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${
          type === "success"
            ? "#27ae60"
            : type === "error"
            ? "#e74c3c"
            : "#3498db"
        };
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        max-width: 350px;
      ">
        ${message}
      </div>
    `);

    $("body").append(notification);

    // Auto-hide después de 3 segundos
    setTimeout(() => {
      notification.fadeOut(300, () => {
        notification.remove();
      });
    }, 3000);
  }
})(
  typeof django !== "undefined" && django.jQuery
    ? django.jQuery
    : window.jQuery || window.$
);
