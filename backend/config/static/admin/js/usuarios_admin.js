/**
 * Usuarios Admin JS
 * Funcionalidades administrativas para el módulo de usuarios
 * Version: 2.0.0
 */

(function ($) {
  "use strict";

  // Inicialización cuando el DOM esté listo
  $(document).ready(function () {
    console.log("Usuarios Admin JS v2.0.0 cargado");

    // Inicializar funcionalidades del admin de usuarios
    initUsuariosAdmin();
  });

  function initUsuariosAdmin() {
    // Funcionalidad para el formulario de usuarios
    initUsuarioForm();

    // Funcionalidad para gestión de permisos
    initPermissionsManagement();

    // Funcionalidad para filtros avanzados
    initAdvancedFilters();

    // Funcionalidad para acciones en lote
    initBulkActions();

    // Validaciones en tiempo real
    initRealTimeValidation();
  }

  function initUsuarioForm() {
    // Generar username automáticamente desde nombres
    $("#id_first_name, #id_last_name").on("input", function () {
      generateUsername();
    });

    // Validar email en tiempo real
    $("#id_email").on("blur", function () {
      validateEmailUnique($(this).val());
    });

    // Gestión de foto de perfil
    $("#id_foto_perfil").on("change", function () {
      previewProfileImage(this);
    });

    // Validar número de teléfono
    $("#id_telefono").on("input", function () {
      formatPhoneNumber(this);
    });

    // Validar documento de identidad
    $("#id_numero_identificacion").on("blur", function () {
      validateDocumento(this);
    });

    // Gestión de direcciones múltiples
    initAddressManagement();
  }

  function initPermissionsManagement() {
    // Toggle para seleccionar todos los permisos de un grupo
    $(".group-permissions-toggle").on("change", function () {
      var groupId = $(this).data("group-id");
      var isChecked = $(this).is(":checked");

      $('.permission-checkbox[data-group="' + groupId + '"]').prop(
        "checked",
        isChecked
      );
    });

    // Filtrar permisos por categoría
    $("#permission-filter").on("change", function () {
      var category = $(this).val();
      filterPermissionsByCategory(category);
    });

    // Mostrar/ocultar permisos avanzados
    $("#show-advanced-permissions").on("change", function () {
      $(".advanced-permission").toggle($(this).is(":checked"));
    });
  }

  function initAdvancedFilters() {
    // Filtro por fecha de registro
    $("#date-range-filter").on("change", function () {
      filterByDateRange();
    });

    // Filtro por estado del usuario
    $("#status-filter").on("change", function () {
      filterByStatus($(this).val());
    });

    // Filtro por grupo de usuarios
    $("#group-filter").on("change", function () {
      filterByGroup($(this).val());
    });

    // Búsqueda avanzada
    $("#advanced-search").on("input", function () {
      performAdvancedSearch($(this).val());
    });
  }

  function initBulkActions() {
    // Activar/desactivar usuarios en lote
    $("#bulk-toggle-active").on("click", function (e) {
      e.preventDefault();
      var selectedIds = getSelectedUserIds();
      if (selectedIds.length > 0) {
        bulkToggleActiveStatus(selectedIds);
      } else {
        showNotification("Seleccione al menos un usuario", "warning");
      }
    });

    // Enviar email de bienvenida en lote
    $("#bulk-send-welcome").on("click", function (e) {
      e.preventDefault();
      var selectedIds = getSelectedUserIds();
      if (selectedIds.length > 0) {
        bulkSendWelcomeEmail(selectedIds);
      } else {
        showNotification("Seleccione al menos un usuario", "warning");
      }
    });

    // Asignar grupo en lote
    $("#bulk-assign-group").on("click", function (e) {
      e.preventDefault();
      var selectedIds = getSelectedUserIds();
      if (selectedIds.length > 0) {
        showBulkGroupAssignModal(selectedIds);
      } else {
        showNotification("Seleccione al menos un usuario", "warning");
      }
    });
  }

  function initRealTimeValidation() {
    // Validación de contraseña
    $("#id_password1").on("input", function () {
      validatePasswordStrength($(this).val());
    });

    // Confirmación de contraseña
    $("#id_password2").on("input", function () {
      validatePasswordConfirmation();
    });

    // Validación de edad mínima
    $("#id_fecha_nacimiento").on("change", function () {
      validateMinimumAge($(this).val());
    });
  }

  function initAddressManagement() {
    // Agregar nueva dirección
    $("#add-address").on("click", function (e) {
      e.preventDefault();
      addAddressForm();
    });

    // Remover dirección
    $(document).on("click", ".remove-address", function (e) {
      e.preventDefault();
      $(this).closest(".address-form").remove();
    });

    // Marcar dirección como principal
    $(document).on("change", ".address-primary", function () {
      if ($(this).is(":checked")) {
        $(".address-primary").not(this).prop("checked", false);
      }
    });
  }

  // Funciones de utilidad
  function generateUsername() {
    var firstName = $("#id_first_name").val().toLowerCase();
    var lastName = $("#id_last_name").val().toLowerCase();

    if (firstName && lastName) {
      var username = firstName + "." + lastName;
      username = username.replace(/[^a-z0-9.]/g, "");
      $("#id_username").val(username);

      // Verificar disponibilidad
      validateUsernameUnique(username);
    }
  }

  function validateEmailUnique(email) {
    if (!email || !isValidEmail(email)) {
      return;
    }

    $.ajax({
      url: "/admin/usuarios/validate-email/",
      method: "GET",
      data: { email: email },
      success: function (data) {
        if (!data.unique) {
          showFieldError("#id_email", "Este email ya está registrado");
        } else {
          clearFieldError("#id_email");
        }
      },
    });
  }

  function validateUsernameUnique(username) {
    if (!username) {
      return;
    }

    $.ajax({
      url: "/admin/usuarios/validate-username/",
      method: "GET",
      data: { username: username },
      success: function (data) {
        if (!data.unique) {
          showFieldError(
            "#id_username",
            "Este nombre de usuario no está disponible"
          );
        } else {
          clearFieldError("#id_username");
          showFieldSuccess("#id_username", "Nombre de usuario disponible");
        }
      },
    });
  }

  function previewProfileImage(input) {
    if (input.files && input.files[0]) {
      var reader = new FileReader();

      reader.onload = function (e) {
        var preview = $("#profile-image-preview");
        if (preview.length === 0) {
          preview = $('<div id="profile-image-preview" class="mt-2"></div>');
          $(input).after(preview);
        }

        preview.html(
          '<img src="' +
            e.target.result +
            '" style="max-width: 150px; max-height: 150px; border-radius: 50%;">'
        );
      };

      reader.readAsDataURL(input.files[0]);
    }
  }

  function formatPhoneNumber(input) {
    var value = $(input).val().trim();

    // Permitir formatos flexibles sin forzar prefijo específico
    // Solo limpiar caracteres especiales excepto + al inicio
    value = value.replace(/[^\d\+]/g, "");

    // Si hay un + debe estar al inicio
    if (value.includes("+") && !value.startsWith("+")) {
      value = value.replace(/\+/g, "");
    }

    // Si tiene solo números y más de 15 dígitos, truncar
    if (value.replace(/\+/g, "").length > 15) {
      if (value.startsWith("+")) {
        value = "+" + value.substring(1, 16);
      } else {
        value = value.substring(0, 15);
      }
    }

    $(input).val(value);
  }

  function validateDocumento(input) {
    var documento = $(input).val();
    var tipoDoc = $("#id_tipo_identificacion").val();

    if (!documento || !tipoDoc) {
      return;
    }

    // Validaciones específicas por tipo de documento
    var isValid = false;
    switch (tipoDoc) {
      case "CC": // Cédula de ciudadanía
        isValid = /^\d{8,10}$/.test(documento);
        break;
      case "CE": // Cédula de extranjería
        isValid = /^\d{6,10}$/.test(documento);
        break;
      case "PA": // Pasaporte
        isValid = /^[A-Z0-9]{6,12}$/.test(documento);
        break;
      case "TI": // Tarjeta de identidad
        isValid = /^\d{10,11}$/.test(documento);
        break;
    }

    if (!isValid) {
      showFieldError(
        input,
        "Formato de documento inválido para el tipo seleccionado"
      );
    } else {
      clearFieldError(input);
      // Verificar si el documento ya existe
      validateDocumentoUnique(documento, tipoDoc);
    }
  }

  function validateDocumentoUnique(documento, tipo) {
    $.ajax({
      url: "/admin/usuarios/validate-documento/",
      method: "GET",
      data: { documento: documento, tipo: tipo },
      success: function (data) {
        if (!data.unique) {
          showFieldError(
            "#id_numero_identificacion",
            "Este documento ya está registrado"
          );
        } else {
          clearFieldError("#id_numero_identificacion");
        }
      },
    });
  }

  function validatePasswordStrength(password) {
    var strength = 0;
    var feedback = [];

    // Criterios de fortaleza
    if (password.length >= 8) strength += 1;
    else feedback.push("Al menos 8 caracteres");

    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push("Al menos una mayúscula");

    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push("Al menos una minúscula");

    if (/\d/.test(password)) strength += 1;
    else feedback.push("Al menos un número");

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    else feedback.push("Al menos un carácter especial");

    // Mostrar indicador de fortaleza
    var strengthText = ["Muy débil", "Débil", "Regular", "Buena", "Muy fuerte"];
    var strengthClass = ["danger", "warning", "info", "success", "success"];

    var indicator = $("#password-strength");
    if (indicator.length === 0) {
      indicator = $('<div id="password-strength" class="mt-1"></div>');
      $("#id_password1").after(indicator);
    }

    indicator.html(
      '<small class="text-' +
        strengthClass[strength] +
        '">Fortaleza: ' +
        strengthText[strength] +
        "</small>"
    );

    if (feedback.length > 0) {
      indicator.append(
        '<br><small class="text-muted">' + feedback.join(", ") + "</small>"
      );
    }
  }

  function validatePasswordConfirmation() {
    var password1 = $("#id_password1").val();
    var password2 = $("#id_password2").val();

    if (password2 && password1 !== password2) {
      showFieldError("#id_password2", "Las contraseñas no coinciden");
    } else if (password2) {
      clearFieldError("#id_password2");
    }
  }

  function validateMinimumAge(fechaNacimiento) {
    if (!fechaNacimiento) return;

    var birthDate = new Date(fechaNacimiento);
    var today = new Date();
    var age = today.getFullYear() - birthDate.getFullYear();
    var monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      showFieldError(
        "#id_fecha_nacimiento",
        "El usuario debe ser mayor de edad"
      );
    } else {
      clearFieldError("#id_fecha_nacimiento");
    }
  }

  function addAddressForm() {
    var formCount = $(".address-form").length;
    var newForm = $(".address-form:first").clone();

    // Limpiar valores del formulario clonado
    newForm.find("input, select, textarea").val("");
    newForm.find(".address-primary").prop("checked", false);

    // Actualizar nombres de los campos
    newForm.find("input, select, textarea").each(function () {
      var name = $(this).attr("name");
      if (name) {
        $(this).attr("name", name.replace(/\d+/, formCount));
      }
    });

    $("#addresses-container").append(newForm);
  }

  function getSelectedUserIds() {
    var ids = [];
    $(".action-checkbox:checked").each(function () {
      ids.push($(this).val());
    });
    return ids;
  }

  function bulkToggleActiveStatus(ids) {
    if (
      confirm(
        "¿Está seguro de cambiar el estado de los usuarios seleccionados?"
      )
    ) {
      $.ajax({
        url: "/admin/usuarios/bulk-toggle-active/",
        method: "POST",
        data: {
          ids: ids,
          csrfmiddlewaretoken: $("[name=csrfmiddlewaretoken]").val(),
        },
        success: function (data) {
          showNotification(
            "Estado de usuarios actualizado exitosamente",
            "success"
          );
          location.reload();
        },
        error: function () {
          showNotification("Error al actualizar estado de usuarios", "error");
        },
      });
    }
  }

  function bulkSendWelcomeEmail(ids) {
    if (confirm("¿Enviar email de bienvenida a los usuarios seleccionados?")) {
      $.ajax({
        url: "/admin/usuarios/bulk-send-welcome/",
        method: "POST",
        data: {
          ids: ids,
          csrfmiddlewaretoken: $("[name=csrfmiddlewaretoken]").val(),
        },
        success: function (data) {
          showNotification("Emails enviados exitosamente", "success");
        },
        error: function () {
          showNotification("Error al enviar emails", "error");
        },
      });
    }
  }

  // Funciones de utilidad compartidas
  function isValidEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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

  function showFieldSuccess(field, message) {
    var $field = $(field);
    $field.addClass("is-valid");

    var successDiv = $field.next(".valid-feedback");
    if (successDiv.length === 0) {
      successDiv = $('<div class="valid-feedback"></div>');
      $field.after(successDiv);
    }
    successDiv.text(message);
  }

  function clearFieldError(field) {
    var $field = $(field);
    $field.removeClass("is-invalid is-valid");
    $field.next(".invalid-feedback, .valid-feedback").remove();
  }
})(
  typeof django !== "undefined" && django.jQuery
    ? django.jQuery
    : window.jQuery || window.$
);
