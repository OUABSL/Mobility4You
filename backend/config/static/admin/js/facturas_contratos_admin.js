/**
 * Facturas y Contratos Admin JS
 * Funcionalidades administrativas para el módulo de facturas y contratos
 * Version: 1.0.0
 * Autor: Mobility4You
 */

(function ($) {
  "use strict";

  // ===== CONFIGURACIÓN Y CONSTANTES =====
  const CONFIG = {
    urls: {
      generarContratoPDF: "/admin/facturas_contratos/contrato/generar-pdf/",
      generarFacturaPDF: "/admin/facturas_contratos/factura/generar-pdf/",
      verificarEstadoContrato:
        "/admin/facturas_contratos/contrato/verificar-estado/",
      verificarEstadoFactura:
        "/admin/facturas_contratos/factura/verificar-estado/",
      calcularIVA: "/admin/facturas_contratos/factura/calcular-iva/",
    },
    messages: {
      pdfGenerando: "📄 Generando PDF...",
      pdfExito: "✅ PDF generado exitosamente",
      pdfError: "❌ Error al generar PDF",
      confirmacion: "¿Está seguro de realizar esta acción?",
      eliminando: "🗑️ Eliminando...",
      guardando: "💾 Guardando...",
    },
    tiempos: {
      notificationDuration: 5000,
      loadingTimeout: 30000,
      autoRefresh: 60000,
    },
  };

  // ===== INICIALIZACIÓN =====
  $(document).ready(function () {
    console.log("Facturas y Contratos Admin JS v1.0.0 cargado");

    // Verificar que estamos en las páginas correctas
    if (isContratosPage() || isFacturasPage()) {
      initFacturasContratosAdmin();
    }
  });

  // ===== FUNCIÓN PRINCIPAL DE INICIALIZACIÓN =====
  function initFacturasContratosAdmin() {
    try {
      // Funcionalidades para contratos
      if (isContratosPage()) {
        initContratosFeatures();
      }

      // Funcionalidades para facturas
      if (isFacturasPage()) {
        initFacturasFeatures();
      }

      // Funcionalidades comunes
      initCommonFeatures();

      console.log("✅ Facturas y Contratos Admin inicializado correctamente");
    } catch (error) {
      console.error(
        "❌ Error inicializando Facturas y Contratos Admin:",
        error
      );
      showNotification("Error al inicializar la página", "error");
    }
  }

  // ===== FUNCIONALIDADES ESPECÍFICAS DE CONTRATOS =====
  function initContratosFeatures() {
    console.log("Inicializando funcionalidades de contratos...");

    // Funcionalidad para generar PDFs de contratos
    initContratoPDFGeneration();

    // Validaciones específicas de contratos
    initContratoValidations();

    // Calculadora de tiempo transcurrido
    initTimeCalculations();

    // Filtros avanzados para contratos
    initContratoFilters();

    // Auto-refresh de estados
    initContratoStatusRefresh();
  }

  // ===== FUNCIONALIDADES ESPECÍFICAS DE FACTURAS =====
  function initFacturasFeatures() {
    console.log("Inicializando funcionalidades de facturas...");

    // Funcionalidad para generar PDFs de facturas
    initFacturaPDFGeneration();

    // Calculadora de IVA automática
    initIVACalculator();

    // Validaciones específicas de facturas
    initFacturaValidations();

    // Filtros avanzados para facturas
    initFacturaFilters();

    // Reportes de facturación
    initFacturacionReports();
  }

  // ===== FUNCIONALIDADES COMUNES =====
  function initCommonFeatures() {
    console.log("Inicializando funcionalidades comunes...");

    // Sistema de notificaciones
    initNotificationSystem();

    // Confirmaciones de acciones peligrosas
    initDangerousActionConfirmations();

    // Mejoras de UI/UX
    initUIEnhancements();

    // Sistema de loading
    initLoadingSystem();

    // Validaciones en tiempo real
    initRealTimeValidations();

    // Auto-save
    initAutoSave();

    // Tooltips informativos
    initTooltips();

    // Shortcuts de teclado
    initKeyboardShortcuts();
  }

  // ===== GENERACIÓN DE PDF CONTRATOS =====
  function initContratoPDFGeneration() {
    // Hacer función global para que sea accesible desde HTML
    window.generarContratoPDF = function (contratoId) {
      if (!contratoId) {
        showNotification("ID de contrato no válido", "error");
        return;
      }

      const button = $(`button[onclick="generarContratoPDF(${contratoId})"]`);
      const originalText = button.html();

      // Mostrar loading
      button.prop("disabled", true).html("📄 Generando...");
      showNotification(CONFIG.messages.pdfGenerando, "info");

      // Construir URL dinámica
      const url = CONFIG.urls.generarContratoPDF + contratoId + "/";

      // Realizar petición AJAX
      $.ajax({
        url: url,
        method: "POST",
        data: {
          contrato_id: contratoId,
          csrfmiddlewaretoken: getCsrfToken(),
        },
        timeout: CONFIG.tiempos.loadingTimeout,
        success: function (response) {
          if (response.success) {
            showNotification(CONFIG.messages.pdfExito, "success");

            // Actualizar UI con enlace de descarga
            if (response.download_url) {
              button
                .removeClass("btn-primary")
                .addClass("btn-success")
                .html("📥 Descargar PDF")
                .attr(
                  "onclick",
                  `window.open('${response.download_url}', '_blank')`
                );
            }

            // Refrescar la página después de un momento
            setTimeout(() => {
              location.reload();
            }, 2000);
          } else {
            throw new Error(response.error || "Error desconocido");
          }
        },
        error: function (xhr, status, error) {
          console.error("Error generando PDF contrato:", error);
          let errorMessage = CONFIG.messages.pdfError;

          if (xhr.responseJSON && xhr.responseJSON.error) {
            errorMessage += ": " + xhr.responseJSON.error;
          } else {
            errorMessage += ": " + error;
          }

          showNotification(errorMessage, "error");

          // Restaurar botón
          button.prop("disabled", false).html(originalText);
        },
      });
    };

    // Event listeners para botones existentes
    $(document).on("click", ".generar-contrato-pdf", function (e) {
      e.preventDefault();
      const contratoId = $(this).data("contrato-id");
      generarContratoPDF(contratoId);
    });
  }

  // ===== GENERACIÓN DE PDF FACTURAS =====
  function initFacturaPDFGeneration() {
    // Hacer función global para que sea accesible desde HTML
    window.generarFacturaPDF = function (facturaId) {
      if (!facturaId) {
        showNotification("ID de factura no válido", "error");
        return;
      }

      const button = $(`button[onclick="generarFacturaPDF(${facturaId})"]`);
      const originalText = button.html();

      // Mostrar loading
      button.prop("disabled", true).html("📄 Generando...");
      showNotification(CONFIG.messages.pdfGenerando, "info");

      // Construir URL dinámica
      const url = CONFIG.urls.generarFacturaPDF + facturaId + "/";

      // Realizar petición AJAX
      $.ajax({
        url: url,
        method: "POST",
        data: {
          factura_id: facturaId,
          csrfmiddlewaretoken: getCsrfToken(),
        },
        timeout: CONFIG.tiempos.loadingTimeout,
        success: function (response) {
          if (response.success) {
            showNotification(CONFIG.messages.pdfExito, "success");

            // Actualizar UI con enlace de descarga
            if (response.download_url) {
              button
                .removeClass("btn-primary")
                .addClass("btn-success")
                .html("📥 Descargar PDF")
                .attr(
                  "onclick",
                  `window.open('${response.download_url}', '_blank')`
                );
            }

            // Refrescar la página después de un momento
            setTimeout(() => {
              location.reload();
            }, 2000);
          } else {
            throw new Error(response.error || "Error desconocido");
          }
        },
        error: function (xhr, status, error) {
          console.error("Error generando PDF factura:", error);
          let errorMessage = CONFIG.messages.pdfError;

          if (xhr.responseJSON && xhr.responseJSON.error) {
            errorMessage += ": " + xhr.responseJSON.error;
          } else {
            errorMessage += ": " + error;
          }

          showNotification(errorMessage, "error");

          // Restaurar botón
          button.prop("disabled", false).html(originalText);
        },
      });
    };

    // Event listeners para botones existentes
    $(document).on("click", ".generar-factura-pdf", function (e) {
      e.preventDefault();
      const facturaId = $(this).data("factura-id");
      generarFacturaPDF(facturaId);
    });
  }

  // ===== CALCULADORA DE IVA =====
  function initIVACalculator() {
    // Calcular IVA automáticamente cuando cambie la base imponible
    $(document).on("change", "#id_base_imponible", function () {
      const baseImponible = parseFloat($(this).val()) || 0;
      const porcentajeIVA = parseFloat($("#id_porcentaje_iva").val()) || 21; // IVA estándar en España

      // Usar el endpoint AJAX para cálculos precisos
      calcularIVAAjax(baseImponible, porcentajeIVA);
    });

    // Recalcular cuando cambie el porcentaje de IVA (si hay campo personalizable)
    $(document).on("change", "#id_porcentaje_iva", function () {
      const baseImponible = parseFloat($("#id_base_imponible").val()) || 0;
      const porcentajeIVA = parseFloat($(this).val()) || 21;

      calcularIVAAjax(baseImponible, porcentajeIVA);
    });

    // Calcular localmente si no hay servidor disponible
    $(document).on("blur", "#id_base_imponible", function () {
      const baseImponible = parseFloat($(this).val()) || 0;
      const porcentajeIVA = 21;

      if (baseImponible > 0) {
        calcularIVALocal(baseImponible, porcentajeIVA);
      }
    });
  }

  function calcularIVAAjax(baseImponible, porcentajeIVA) {
    if (baseImponible <= 0) return;

    $.ajax({
      url: CONFIG.urls.calcularIVA,
      method: "POST",
      data: JSON.stringify({
        base_imponible: baseImponible,
        porcentaje_iva: porcentajeIVA,
      }),
      contentType: "application/json",
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
      success: function (response) {
        if (response.success) {
          $("#id_iva").val(response.iva);
          $("#id_total").val(response.total);

          showIVACalculation(
            response.base_imponible,
            response.iva,
            response.total,
            response.porcentaje_iva
          );
        } else {
          // Fallback a cálculo local
          calcularIVALocal(baseImponible, porcentajeIVA);
        }
      },
      error: function () {
        // Fallback a cálculo local si falla AJAX
        calcularIVALocal(baseImponible, porcentajeIVA);
      },
    });
  }

  function calcularIVALocal(baseImponible, porcentajeIVA) {
    const iva = (baseImponible * porcentajeIVA) / 100;
    const total = baseImponible + iva;

    $("#id_iva").val(iva.toFixed(2));
    $("#id_total").val(total.toFixed(2));

    showIVACalculation(baseImponible, iva, total, porcentajeIVA);
  }

  // ===== VALIDACIONES EN TIEMPO REAL =====
  function initRealTimeValidations() {
    // Validar números de contrato/factura únicos
    $(document).on(
      "blur",
      "#id_numero_contrato, #id_numero_factura",
      function () {
        const numero = $(this).val();
        const tipo = $(this).attr("id").includes("contrato")
          ? "contrato"
          : "factura";

        if (numero) {
          validateUniqueNumber(numero, tipo, $(this));
        }
      }
    );

    // Validar fechas lógicas
    $(document).on("change", "#id_fecha_firma, #id_fecha_emision", function () {
      validateLogicalDates();
    });

    // Validar importes positivos
    $(document).on(
      "blur",
      "#id_base_imponible, #id_iva, #id_total",
      function () {
        validatePositiveAmount($(this));
      }
    );
  }

  // ===== SISTEMA DE NOTIFICACIONES =====
  function initNotificationSystem() {
    // Crear contenedor de notificaciones si no existe
    if (!$("#notification-container").length) {
      $("body").append(`
        <div id="notification-container" style="
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          max-width: 400px;
        "></div>
      `);
    }
  }

  // ===== MEJORAS DE UI/UX =====
  function initUIEnhancements() {
    // Mejorar visualización de badges de estado
    $(".badge").each(function () {
      const badge = $(this);
      const text = badge.text().toLowerCase();

      if (text.includes("pendiente")) {
        badge.addClass("badge-warning");
      } else if (text.includes("completado") || text.includes("emitida")) {
        badge.addClass("badge-success");
      } else if (text.includes("anulada") || text.includes("cancelado")) {
        badge.addClass("badge-danger");
      }
    });

    // Mejorar tablas con hover
    $(".result_list tbody tr").hover(
      function () {
        $(this).addClass("table-hover-highlight");
      },
      function () {
        $(this).removeClass("table-hover-highlight");
      }
    );

    // Agregar iconos a botones
    $(".btn").each(function () {
      const btn = $(this);
      const text = btn.text().toLowerCase();

      if (text.includes("pdf") && !btn.find("i").length) {
        btn.prepend('<i class="fas fa-file-pdf"></i> ');
      } else if (text.includes("generar") && !btn.find("i").length) {
        btn.prepend('<i class="fas fa-cog"></i> ');
      } else if (text.includes("descargar") && !btn.find("i").length) {
        btn.prepend('<i class="fas fa-download"></i> ');
      }
    });
  }

  // ===== CONFIRMACIONES DE ACCIONES PELIGROSAS =====
  function initDangerousActionConfirmations() {
    // Confirmar eliminaciones
    $(document).on("click", ".deletelink", function (e) {
      if (
        !confirm(
          "¿Está seguro de que desea eliminar este elemento? Esta acción no se puede deshacer."
        )
      ) {
        e.preventDefault();
        return false;
      }
    });

    // Confirmar cambios de estado críticos
    $(document).on("change", 'select[name*="estado"]', function () {
      const nuevoEstado = $(this).val();
      const estadosRiesgosos = ["anulada", "cancelado"];

      if (estadosRiesgosos.includes(nuevoEstado)) {
        if (
          !confirm(
            `¿Está seguro de cambiar el estado a "${nuevoEstado}"? Esta acción puede tener consecuencias importantes.`
          )
        ) {
          $(this).val($(this).data("original-value") || "");
          return false;
        }
      }
    });

    // Guardar valores originales para rollback
    $('select[name*="estado"]').each(function () {
      $(this).data("original-value", $(this).val());
    });
  }

  // ===== AUTO-SAVE =====
  function initAutoSave() {
    let autoSaveTimeout;
    const autoSaveDelay = 10000; // 10 segundos

    // Detectar cambios en formularios
    $("form").on("change", "input, select, textarea", function () {
      clearTimeout(autoSaveTimeout);

      // Mostrar indicador de cambios pendientes
      showAutoSaveIndicator("pending");

      autoSaveTimeout = setTimeout(() => {
        performAutoSave();
      }, autoSaveDelay);
    });
  }

  // ===== SHORTCUTS DE TECLADO =====
  function initKeyboardShortcuts() {
    $(document).on("keydown", function (e) {
      // Ctrl+S para guardar
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        $('input[name="_save"]').click();
        return false;
      }

      // Ctrl+Shift+P para generar PDF
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        $(".generar-pdf:first").click();
        return false;
      }

      // Escape para cancelar
      if (e.key === "Escape") {
        $(".cancel-link").click();
      }
    });
  }

  // ===== TOOLTIPS =====
  function initTooltips() {
    // Agregar tooltips informativos
    $("[title]").each(function () {
      const element = $(this);
      if (!element.attr("data-toggle")) {
        element.attr("data-toggle", "tooltip");
        element.tooltip();
      }
    });

    // Tooltips específicos para campos de facturas
    $("#id_base_imponible").attr("title", "Importe sin IVA incluido");
    $("#id_iva").attr(
      "title",
      "Impuesto sobre el Valor Añadido (normalmente 10%)"
    );
    $("#id_total").attr("title", "Importe total con IVA incluido");
  }

  // ===== FUNCIONES AUXILIARES =====

  function isContratosPage() {
    return (
      window.location.pathname.includes("/contrato/") ||
      $("h1").text().includes("Contrato") ||
      $("#id_numero_contrato").length > 0
    );
  }

  function isFacturasPage() {
    return (
      window.location.pathname.includes("/factura/") ||
      $("h1").text().includes("Factura") ||
      $("#id_numero_factura").length > 0
    );
  }

  function getCsrfToken() {
    return (
      $("[name=csrfmiddlewaretoken]").val() ||
      $("meta[name=csrf-token]").attr("content") ||
      document.querySelector("[name=csrfmiddlewaretoken]")?.value
    );
  }

  function showNotification(message, type = "info", duration = null) {
    const types = {
      success: { class: "alert-success", icon: "✅" },
      error: { class: "alert-danger", icon: "❌" },
      warning: { class: "alert-warning", icon: "⚠️" },
      info: { class: "alert-info", icon: "ℹ️" },
    };

    const config = types[type] || types.info;
    const id = "notification-" + Date.now();
    const autoHide =
      duration !== null ? duration : CONFIG.tiempos.notificationDuration;

    const notification = $(`
      <div id="${id}" class="alert ${config.class} alert-dismissible fade show" role="alert" style="
        margin-bottom: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-left: 4px solid var(--mobility-primary);
      ">
        <strong>${config.icon}</strong> ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    `);

    $("#notification-container").append(notification);

    // Auto-hide
    if (autoHide > 0) {
      setTimeout(() => {
        $(`#${id}`).fadeOut(() => {
          $(`#${id}`).remove();
        });
      }, autoHide);
    }

    return id;
  }

  function showIVACalculation(base, iva, total, porcentaje = 21) {
    const calculation = $(`
      <div class="iva-calculation-display" style="
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
        font-size: 12px;
      ">
        <strong>📊 Cálculo automático:</strong><br>
        Base imponible: €${base.toFixed(2)}<br>
        IVA (${porcentaje}%): €${iva.toFixed(2)}<br>
        <hr style="margin: 5px 0;">
        <strong>Total: €${total.toFixed(2)}</strong>
      </div>
    `);

    $(".iva-calculation-display").remove();
    $("#id_total").closest(".form-group, .field-total").after(calculation);

    // Auto-hide después de 5 segundos
    setTimeout(() => {
      calculation.fadeOut();
    }, 5000);
  }

  function validateUniqueNumber(numero, tipo, field) {
    // Validación de formato local primero
    const regex = tipo === "contrato" ? /^CON-\d{4}-\d+$/ : /^FAC-\d{4}-\d+$/;

    if (!regex.test(numero)) {
      field.addClass("is-invalid").removeClass("is-valid");
      showNotification(`Formato de número de ${tipo} inválido`, "error");
      return;
    }

    // Validación de unicidad vía AJAX (placeholder - implementar si es necesario)
    // Por ahora solo validamos formato
    field.removeClass("is-invalid").addClass("is-valid");

    // Mostrar formato válido
    showNotification(`Formato de ${tipo} válido: ${numero}`, "success", 2000);
  }

  function validateLogicalDates() {
    const fechaFirma = $("#id_fecha_firma").val();
    const fechaEmision = $("#id_fecha_emision").val();

    if (fechaFirma && fechaEmision) {
      const firma = new Date(fechaFirma);
      const emision = new Date(fechaEmision);

      if (emision < firma) {
        showNotification(
          "La fecha de emisión no puede ser anterior a la fecha de firma",
          "warning"
        );
      }
    }
  }

  function validatePositiveAmount(field) {
    const value = parseFloat(field.val()) || 0;

    if (value < 0) {
      field.addClass("is-invalid");
      showNotification("Los importes deben ser positivos", "error");
    } else {
      field.removeClass("is-invalid").addClass("is-valid");
    }
  }

  function showAutoSaveIndicator(status) {
    let indicator = $("#auto-save-indicator");

    if (!indicator.length) {
      indicator = $(`
        <div id="auto-save-indicator" style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 9999;
        "></div>
      `);
      $("body").append(indicator);
    }

    if (status === "pending") {
      indicator
        .html("💾 Cambios pendientes...")
        .css({
          background: "#ffc107",
          color: "#212529",
        })
        .show();
    } else if (status === "saving") {
      indicator.html("💾 Guardando...").css({
        background: "#17a2b8",
        color: "white",
      });
    } else if (status === "saved") {
      indicator.html("✅ Guardado").css({
        background: "#28a745",
        color: "white",
      });

      setTimeout(() => {
        indicator.fadeOut();
      }, 2000);
    }
  }

  function performAutoSave() {
    showAutoSaveIndicator("saving");

    // Aquí iría la lógica real de auto-save
    // Por ahora, solo simulamos
    setTimeout(() => {
      showAutoSaveIndicator("saved");
    }, 1000);
  }

  // Inicialización adicional de estilos
  function initTimeCalculations() {
    // Actualizar tiempos transcurridos cada minuto
    setInterval(() => {
      $(".tiempo-transcurrido").each(function () {
        // Actualizar cálculos de tiempo si es necesario
      });
    }, 60000);
  }

  function initContratoFilters() {
    // Filtros específicos para contratos
    console.log("Filtros de contratos inicializados");
  }

  function initContratoStatusRefresh() {
    // Auto-refresh de estados cada 5 minutos
    setInterval(() => {
      if (isContratosPage()) {
        // Actualizar estados si es necesario
      }
    }, 300000);
  }

  function initContratoValidations() {
    // Validaciones específicas de contratos
    console.log("Validaciones de contratos inicializadas");
  }

  function initFacturaFilters() {
    // Filtros específicos para facturas
    console.log("Filtros de facturas inicializados");
  }

  function initFacturacionReports() {
    // Reportes específicos de facturación
    console.log("Reportes de facturación inicializados");
  }

  function initFacturaValidations() {
    // Validaciones específicas de facturas
    console.log("Validaciones de facturas inicializadas");
  }

  function initLoadingSystem() {
    // Sistema de loading para operaciones largas
    $(document)
      .ajaxStart(function () {
        $("body").addClass("loading");
      })
      .ajaxStop(function () {
        $("body").removeClass("loading");
      });
  }
})(django.jQuery || jQuery);
