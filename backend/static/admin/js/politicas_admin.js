/**
 * Politicas Admin JS
 * Funcionalidades administrativas para el módulo de políticas
 * Version: 2.0.0
 */

(function ($) {
  "use strict";

  // Inicialización cuando el DOM esté listo
  $(document).ready(function () {
    console.log("Politicas Admin JS v2.0.0 cargado");

    // Inicializar funcionalidades del admin de políticas
    initPoliticasAdmin();
  });

  function initPoliticasAdmin() {
    // Funcionalidad para el formulario de políticas
    initPoliticaForm();

    // Funcionalidad para el editor de contenido
    initContentEditor();

    // Funcionalidad para versionado de políticas
    initVersionControl();

    // Funcionalidad para previsualización
    initPreview();
  }

  function initPoliticaForm() {
    // Auto-generar slug basado en el título
    $("#id_titulo").on("input", function () {
      var titulo = $(this).val();
      var slug = generateSlug(titulo);
      $("#id_slug").val(slug);
    });

    // Validar fechas de vigencia
    $("#id_fecha_inicio, #id_fecha_fin").on("change", function () {
      validateFechasVigencia();
    });

    // Gestión de categorías
    $("#id_categoria").on("change", function () {
      updateSubcategorias($(this).val());
    });

    // Contador de caracteres para resumen
    $("#id_resumen").on("input", function () {
      updateCharacterCount(this, 500);
    });
  }

  function initContentEditor() {
    // Funcionalidad para el editor de texto enriquecido
    if ($("#id_contenido").length) {
      initRichTextEditor("#id_contenido");
    }

    // Botones de formato rápido
    $(".format-button").on("click", function (e) {
      e.preventDefault();
      var format = $(this).data("format");
      applyTextFormat(format);
    });

    // Insertar plantillas predefinidas
    $("#insert-template").on("change", function () {
      var template = $(this).val();
      if (template) {
        insertTemplate(template);
        $(this).val("");
      }
    });
  }

  function initVersionControl() {
    // Guardar borrador automáticamente
    var autoSaveTimer;
    $(
      "#politica-form input, #politica-form textarea, #politica-form select"
    ).on("input change", function () {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(function () {
        autoSaveDraft();
      }, 30000); // Auto-guardar cada 30 segundos
    });

    // Comparar versiones
    $("#compare-versions").on("click", function (e) {
      e.preventDefault();
      showVersionComparisonModal();
    });

    // Restaurar versión anterior
    $(".restore-version").on("click", function (e) {
      e.preventDefault();
      var versionId = $(this).data("version-id");
      restoreVersion(versionId);
    });
  }

  function initPreview() {
    // Botón de previsualización
    $("#preview-politica").on("click", function (e) {
      e.preventDefault();
      showPreviewModal();
    });

    // Previsualización en tiempo real
    $("#id_contenido").on("input", function () {
      updateLivePreview($(this).val());
    });
  }

  // Funciones de utilidad
  function generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[áàäâ]/g, "a")
      .replace(/[éèëê]/g, "e")
      .replace(/[íìïî]/g, "i")
      .replace(/[óòöô]/g, "o")
      .replace(/[úùüû]/g, "u")
      .replace(/[ñ]/g, "n")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }

  function validateFechasVigencia() {
    var fechaInicio = new Date($("#id_fecha_inicio").val());
    var fechaFin = new Date($("#id_fecha_fin").val());
    var today = new Date();

    // Limpiar errores previos
    clearFieldError("#id_fecha_inicio");
    clearFieldError("#id_fecha_fin");

    if (fechaInicio < today) {
      showFieldError(
        "#id_fecha_inicio",
        "La fecha de inicio no puede ser anterior a hoy"
      );
    }

    if (fechaFin && fechaFin <= fechaInicio) {
      showFieldError(
        "#id_fecha_fin",
        "La fecha de fin debe ser posterior a la fecha de inicio"
      );
    }

    // Advertir si la vigencia es muy larga
    if (fechaFin && fechaInicio) {
      var diffTime = Math.abs(fechaFin - fechaInicio);
      var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 365) {
        showNotification(
          "La vigencia es superior a un año. ¿Es esto correcto?",
          "warning"
        );
      }
    }
  }

  function updateSubcategorias(categoriaId) {
    if (!categoriaId) {
      $("#id_subcategoria")
        .empty()
        .append('<option value="">---------</option>');
      return;
    }

    $.ajax({
      url: "/admin/politicas/subcategorias/",
      method: "GET",
      data: { categoria_id: categoriaId },
      success: function (data) {
        var $subcategoria = $("#id_subcategoria");
        $subcategoria.empty().append('<option value="">---------</option>');

        $.each(data.subcategorias, function (i, sub) {
          $subcategoria.append(
            '<option value="' + sub.id + '">' + sub.nombre + "</option>"
          );
        });
      },
      error: function () {
        console.log("Error al cargar subcategorías");
      },
    });
  }

  function updateCharacterCount(element, maxLength) {
    var currentLength = $(element).val().length;
    var remaining = maxLength - currentLength;

    var countElement = $(element).siblings(".character-count");
    if (countElement.length === 0) {
      countElement = $('<small class="character-count text-muted"></small>');
      $(element).after(countElement);
    }

    countElement.text(remaining + " caracteres restantes");

    if (remaining < 0) {
      countElement.addClass("text-danger").removeClass("text-muted");
      $(element).addClass("is-invalid");
    } else {
      countElement.removeClass("text-danger").addClass("text-muted");
      $(element).removeClass("is-invalid");
    }
  }

  function initRichTextEditor(selector) {
    // Configuración básica de editor de texto enriquecido
    $(selector).summernote({
      height: 400,
      toolbar: [
        ["style", ["style"]],
        ["font", ["bold", "underline", "clear"]],
        ["fontname", ["fontname"]],
        ["color", ["color"]],
        ["para", ["ul", "ol", "paragraph"]],
        ["table", ["table"]],
        ["insert", ["link", "picture", "video"]],
        ["view", ["fullscreen", "codeview", "help"]],
      ],
      callbacks: {
        onChange: function (contents) {
          updateLivePreview(contents);
        },
      },
    });
  }

  function applyTextFormat(format) {
    var textarea = document.getElementById("id_contenido");
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var selectedText = textarea.value.substring(start, end);

    var formattedText = "";
    switch (format) {
      case "bold":
        formattedText = "**" + selectedText + "**";
        break;
      case "italic":
        formattedText = "*" + selectedText + "*";
        break;
      case "heading":
        formattedText = "## " + selectedText;
        break;
      case "list":
        formattedText = "- " + selectedText;
        break;
    }

    textarea.value =
      textarea.value.substring(0, start) +
      formattedText +
      textarea.value.substring(end);
    textarea.focus();
    textarea.setSelectionRange(
      start + formattedText.length,
      start + formattedText.length
    );
  }

  function insertTemplate(templateName) {
    var templates = {
      terminos:
        "## Términos y Condiciones\n\n1. Aceptación de términos\n2. Uso del servicio\n3. Responsabilidades del usuario\n4. Limitaciones de responsabilidad\n\n",
      privacidad:
        "## Política de Privacidad\n\n### Recopilación de datos\n### Uso de la información\n### Protección de datos\n### Derechos del usuario\n\n",
      cancelacion:
        "## Política de Cancelación\n\n### Cancelación gratuita\n### Cancelación con cargo\n### Reembolsos\n### Procedimiento de cancelación\n\n",
    };

    if (templates[templateName]) {
      var currentContent = $("#id_contenido").val();
      $("#id_contenido").val(currentContent + templates[templateName]);
      updateLivePreview($("#id_contenido").val());
    }
  }

  function autoSaveDraft() {
    var formData = $("#politica-form").serialize();

    $.ajax({
      url: "/admin/politicas/auto-save/",
      method: "POST",
      data: formData,
      success: function (data) {
        if (data.success) {
          showNotification("Borrador guardado automáticamente", "info");
        }
      },
      error: function () {
        console.log("Error al guardar borrador automáticamente");
      },
    });
  }

  function showPreviewModal() {
    var titulo = $("#id_titulo").val();
    var contenido = $("#id_contenido").val();

    var modal = $(
      '<div class="modal fade" tabindex="-1">' +
        '<div class="modal-dialog modal-lg">' +
        '<div class="modal-content">' +
        '<div class="modal-header">' +
        '<h5 class="modal-title">Previsualización: ' +
        titulo +
        "</h5>" +
        '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
        "</div>" +
        '<div class="modal-body">' +
        '<div class="preview-content">' +
        formatContent(contenido) +
        "</div>" +
        "</div>" +
        '<div class="modal-footer">' +
        '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>' +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>"
    );

    $("body").append(modal);
    modal.modal("show");

    modal.on("hidden.bs.modal", function () {
      modal.remove();
    });
  }

  function updateLivePreview(content) {
    var preview = $(".live-preview");
    if (preview.length) {
      preview.html(formatContent(content));
    }
  }

  function formatContent(content) {
    // Convertir markdown básico a HTML
    return content
      .replace(/## (.*)/g, "<h2>$1</h2>")
      .replace(/# (.*)/g, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.*)/gm, "<li>$1</li>")
      .replace(/\n/g, "<br>");
  }

  function showNotification(message, type) {
    var alertClass = "alert-" + (type === "error" ? "danger" : type);
    var notification = $(
      '<div class="alert ' +
        alertClass +
        ' alert-dismissible fade show" role="alert">' +
        message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>' +
        "</div>"
    );

    $(".messages").append(notification);

    // Auto-hide after 5 seconds
    setTimeout(function () {
      notification.alert("close");
    }, 5000);
  }

  function showFieldError(field, message) {
    var $field = $(field);
    $field.addClass("is-invalid");

    var errorDiv = $field.next(".invalid-feedback");
    if (errorDiv.length === 0) {
      errorDiv = $('<div class="invalid-feedback"></div>');
      $field.after(errorDiv);
    }
    errorDiv.text(message);
  }

  function clearFieldError(field) {
    var $field = $(field);
    $field.removeClass("is-invalid");
    $field.next(".invalid-feedback").remove();
  }
})(
  typeof django !== "undefined" && django.jQuery
    ? django.jQuery
    : window.jQuery || window.$
);
