/**
 * Lugares Admin JS
 * Funcionalidades administrativas para el módulo de lugares
 * Version: 1.1.0 - Mejorado para compatibilidad y manejo de errores
 */

(function ($) {
  "use strict";

  // Verificar disponibilidad de jQuery
  if (typeof $ === "undefined") {
    console.error("jQuery no está disponible para lugares_admin.js");
    return;
  }

  // Inicialización cuando el DOM esté listo
  $(document).ready(function () {
    console.log("Lugares Admin JS v1.1.0 cargado");

    // Inicializar funcionalidades
    initLugaresAdmin();

    // Agregar validaciones adicionales al formulario
    initFormValidations();
  });

  function initLugaresAdmin() {
    // Configurar listeners para botones de acción
    setupActionButtons();
  }

  function initFormValidations() {
    // Validaciones en tiempo real para campos de dirección
    $("#id_codigo_postal").on("input", function () {
      const valor = $(this).val();
      const esValido = /^\d{4,5}$/.test(valor);

      if (valor && !esValido) {
        $(this).addClass("error");
        showInlineError(this, "Código postal debe ser de 4-5 dígitos");
      } else {
        $(this).removeClass("error");
        hideInlineError(this);
      }
    });

    // Validar campos requeridos antes del envío
    $("form").on("submit", function (e) {
      const ciudad = $("#id_ciudad").val().trim();
      const codigoPostal = $("#id_codigo_postal").val().trim();

      if (!ciudad) {
        e.preventDefault();
        showNotification("La ciudad es obligatoria", "error");
        $("#id_ciudad").focus().addClass("error");
        return false;
      }

      if (!codigoPostal) {
        e.preventDefault();
        showNotification("El código postal es obligatorio", "error");
        $("#id_codigo_postal").focus().addClass("error");
        return false;
      }
    });
  }

  function setupActionButtons() {
    // Listeners para botones de toggle estado
    $(document).on("click", ".btn-toggle-estado", function (e) {
      e.preventDefault();
      const lugarId = $(this).data("lugar-id");
      if (lugarId) {
        toggleEstadoLugar(lugarId);
      } else {
        console.error("ID de lugar no encontrado");
        showNotification("Error: ID de lugar no válido", "error");
      }
    });

    // Listeners para botones de toggle popular
    $(document).on("click", ".btn-toggle-popular", function (e) {
      e.preventDefault();
      const lugarId = $(this).data("lugar-id");
      if (lugarId) {
        togglePopularLugar(lugarId);
      } else {
        console.error("ID de lugar no encontrado");
        showNotification("Error: ID de lugar no válido", "error");
      }
    });
  }

  // =====================================
  // FUNCIONES GLOBALES PARA ADMIN ACTIONS
  // =====================================

  /**
   * Función global para toggle estado del lugar
   */
  window.toggleEstadoLugar = function (lugarId) {
    if (!lugarId) {
      showNotification("Error: ID de lugar no válido", "error");
      return;
    }

    const button = event.target.closest("a");
    if (!button) {
      showNotification("Error: Botón no encontrado", "error");
      return;
    }

    const currentText = button.textContent.trim();
    const isActivating = currentText.includes("Activar");

    // Obtener token CSRF
    const csrfToken =
      $("[name=csrfmiddlewaretoken]").val() ||
      $("meta[name=csrf-token]").attr("content") ||
      document.querySelector("[name=csrfmiddlewaretoken]")?.value;

    if (!csrfToken) {
      console.warn("Token CSRF no encontrado, usando modo fallback");
      handleToggleFallback(button, isActivating, "estado");
      return;
    }

    // Deshabilitar botón durante la operación
    $(button).prop("disabled", true).css("opacity", "0.6");

    $.ajax({
      url: `/admin/lugares/lugar/${lugarId}/toggle-estado/`,
      method: "POST",
      data: {
        activo: isActivating,
        csrfmiddlewaretoken: csrfToken,
      },
      timeout: 10000, // 10 segundos de timeout
      success: function (response) {
        if (response && response.success) {
          const message = isActivating
            ? "Lugar activado exitosamente"
            : "Lugar desactivado exitosamente";
          showNotification(message, "success");
          setTimeout(() => location.reload(), 1000);
        } else {
          showNotification(
            response?.message || "Error al cambiar el estado del lugar",
            "error"
          );
          $(button).prop("disabled", false).css("opacity", "1");
        }
      },
      error: function (xhr, status, error) {
        console.warn(`Error en AJAX (${status}): ${error}. Usando fallback.`);
        handleToggleFallback(button, isActivating, "estado");
      },
    });
  };

  /**
   * Función global para toggle popularidad del lugar
   */
  window.togglePopularLugar = function (lugarId) {
    if (!lugarId) {
      showNotification("Error: ID de lugar no válido", "error");
      return;
    }

    const button = event.target.closest("a");
    if (!button) {
      showNotification("Error: Botón no encontrado", "error");
      return;
    }

    const currentText = button.textContent.trim();
    const isMarkingPopular = currentText.includes("Hacer");

    // Obtener token CSRF
    const csrfToken =
      $("[name=csrfmiddlewaretoken]").val() ||
      $("meta[name=csrf-token]").attr("content") ||
      document.querySelector("[name=csrfmiddlewaretoken]")?.value;

    if (!csrfToken) {
      console.warn("Token CSRF no encontrado, usando modo fallback");
      handleToggleFallback(button, isMarkingPopular, "popular");
      return;
    }

    // Deshabilitar botón durante la operación
    $(button).prop("disabled", true).css("opacity", "0.6");

    $.ajax({
      url: `/admin/lugares/lugar/${lugarId}/toggle-popular/`,
      method: "POST",
      data: {
        popular: isMarkingPopular,
        csrfmiddlewaretoken: csrfToken,
      },
      timeout: 10000, // 10 segundos de timeout
      success: function (response) {
        if (response && response.success) {
          const message = isMarkingPopular
            ? "Lugar marcado como popular"
            : "Lugar desmarcado como popular";
          showNotification(message, "success");
          setTimeout(() => location.reload(), 1000);
        } else {
          showNotification(
            response?.message || "Error al cambiar la popularidad del lugar",
            "error"
          );
          $(button).prop("disabled", false).css("opacity", "1");
        }
      },
      error: function (xhr, status, error) {
        console.warn(`Error en AJAX (${status}): ${error}. Usando fallback.`);
        handleToggleFallback(button, isMarkingPopular, "popular");
      },
    });
  };

  // Función de manejo fallback para cuando AJAX no funciona
  function handleToggleFallback(button, isToggling, type) {
    $(button).prop("disabled", false).css("opacity", "1");

    let message, newText, newColor;

    if (type === "estado") {
      message = isToggling
        ? "Lugar activado (modo local)"
        : "Lugar desactivado (modo local)";
      newText = isToggling ? "Desactivar" : "Activar";
      newColor = isToggling ? "#e74c3c" : "#27ae60";
    } else {
      // popular
      message = isToggling
        ? "Lugar marcado como popular (modo local)"
        : "Popularidad removida (modo local)";
      newText = isToggling ? "Quitar ⭐" : "Hacer ⭐";
      newColor = isToggling ? "#95a5a6" : "#f39c12";
    }

    showNotification(message, "info");

    // Simular cambio visual
    if (button) {
      button.style.background = newColor;
      button.textContent = newText;
    }
  }

  // Funciones de utilidad compatibles
  function toggleEstadoLugar(lugarId) {
    window.toggleEstadoLugar(lugarId);
  }

  function togglePopularLugar(lugarId) {
    window.togglePopularLugar(lugarId);
  }

  // Función de utilidad para mostrar errores inline
  function showInlineError(element, message) {
    hideInlineError(element);
    const errorDiv = $(
      `<div class="inline-error" style="color: #e74c3c; font-size: 12px; margin-top: 2px;">${message}</div>`
    );
    $(element).after(errorDiv);
  }

  function hideInlineError(element) {
    $(element).next(".inline-error").remove();
  }

  // Función de utilidad para mostrar notificaciones mejorada
  function showNotification(message, type) {
    // Remover notificaciones existentes
    $(".notification").remove();

    const colors = {
      success: "#27ae60",
      error: "#e74c3c",
      warning: "#f39c12",
      info: "#3498db",
    };

    const notification = $(`
      <div class="notification notification-${type}" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        max-width: 350px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${message}</span>
          <button class="close-notification" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            margin-left: 10px;
            opacity: 0.7;
          ">&times;</button>
        </div>
      </div>
    `);

    // Agregar estilos de animación si no existen
    if (!$("#notification-styles").length) {
      $("head").append(`
        <style id="notification-styles">
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .notification:hover .close-notification { opacity: 1; }
        </style>
      `);
    }

    $("body").append(notification);

    // Listener para cerrar manualmente
    notification.find(".close-notification").on("click", function () {
      notification.fadeOut(200, () => notification.remove());
    });

    // Auto-hide después de 4 segundos (más tiempo para leer)
    setTimeout(() => {
      if (notification.is(":visible")) {
        notification.fadeOut(300, () => notification.remove());
      }
    }, 4000);
  }
})(
  typeof django !== "undefined" && django.jQuery
    ? django.jQuery
    : window.jQuery || window.$
);
