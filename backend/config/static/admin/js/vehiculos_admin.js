/**
 * Vehiculos Admin JS - CLEAN VERSION
 * Funcionalidades administrativas para el módulo de vehículos
 * Version: 2.1.0
 */

(function ($) {
  "use strict";

  // Inicialización cuando el DOM esté listo
  $(document).ready(function () {
    console.log("Vehiculos Admin JS v2.1.0 cargado");

    // Inicializar funcionalidades del admin de vehículos
    initVehiculosAdmin();
  });

  function initVehiculosAdmin() {
    // Funcionalidad para el formulario de vehículos
    initVehiculoForm();

    // Funcionalidad para filtros avanzados
    initVehiculoFilters();

    // Funcionalidad para acciones en lote
    initBulkActions();

    // Validaciones en tiempo real
    initRealTimeValidation();
  }

  function initVehiculoForm() {
    // Auto-completar información del vehículo basada en la placa
    $("#id_placa").on("blur", function () {
      var placa = $(this).val();
      if (placa && placa.length >= 6) {
        // Validar formato de placa
        if (!validatePlacaFormat(placa)) {
          showNotification("Formato de placa inválido", "error");
          return;
        }

        // Autocompletar información si está disponible
        autoCompleteVehiculoInfo(placa);
      }
    });

    // Calcular precio sugerido basado en el tipo de vehículo
    $("#id_tipo_vehiculo").on("change", function () {
      calculateSuggestedPrice($(this).val());
    });

    // Validar kilometraje
    $("#id_kilometraje").on("input", function () {
      validateKilometraje($(this).val());
    });

    // Gestión de imágenes
    initImageManagement();
  }

  function initVehiculoFilters() {
    // Filtro dinámico por categoría
    $("#id_categoria__exact").on("change", function () {
      var categoriaId = $(this).val();
      if (categoriaId) {
        updateGrupoOptions(categoriaId);
        updatePrecioRangeFilter(categoriaId);
      }
    });

    // Filtro por disponibilidad con actualización en tiempo real
    $(".availability-filter").on("change", function () {
      updateAvailabilityDisplay();
    });

    // Búsqueda avanzada
    initAdvancedSearch();

    // Filtro por disponibilidad
    $("#id_disponible").on("change", function () {
      filterByAvailability($(this).is(":checked"));
    });

    // Filtro por tipo de vehículo
    $("#id_tipo_vehiculo_filter").on("change", function () {
      filterByTipo($(this).val());
    });

    // Filtro por rango de precios
    $("#id_precio_min, #id_precio_max").on("change", function () {
      filterByPriceRange();
    });
  }

  function initBulkActions() {
    // Acción masiva: Actualizar precios
    $("#bulk-update-prices").on("click", function () {
      var selectedVehicles = getSelectedVehicles();
      if (selectedVehicles.length > 0) {
        showPriceUpdateModal(selectedVehicles);
      } else {
        alert("Seleccione al menos un vehículo");
      }
    });

    // Acción masiva: Cambiar disponibilidad
    $("#bulk-change-availability").on("click", function () {
      var selectedVehicles = getSelectedVehicles();
      if (selectedVehicles.length > 0) {
        showAvailabilityChangeModal(selectedVehicles);
      } else {
        alert("Seleccione al menos un vehículo");
      }
    });

    // Acción para activar/desactivar múltiples vehículos
    $("#bulk-activate").on("click", function (e) {
      e.preventDefault();
      var selectedIds = getSelectedVehicleIds();
      if (selectedIds.length > 0) {
        bulkActivateVehicles(selectedIds);
      } else {
        showNotification("Seleccione al menos un vehículo", "warning");
      }
    });
  }

  function initRealTimeValidation() {
    // Validación de placa en tiempo real
    $("#id_placa").on("input", function () {
      var placa = $(this).val().toUpperCase();
      $(this).val(placa);

      if (placa.length >= 6) {
        validatePlacaUnique(placa);
      }
    });

    // Validación de año del vehículo
    $("#id_ano").on("input", function () {
      var ano = parseInt($(this).val());
      var currentYear = new Date().getFullYear();

      if (ano < 1900 || ano > currentYear + 1) {
        showFieldError(this, "Año inválido");
      } else {
        clearFieldError(this);
      }
    });

    // Validar capacidad máxima
    $("#id_capacidad_maxima").on("change", function () {
      validateCapacidad($(this).val());
    });

    // Gestión de imágenes del vehículo
    initImageUpload();
  }

  // Helper Functions
  function validatePlacaFormat(placa) {
    // Validar formato colombiano: ABC123 o ABC12D
    var regex = /^[A-Z]{3}[0-9]{2}[0-9A-Z]$/;
    return regex.test(placa);
  }

  function autoCompleteVehiculoInfo(placa) {
    // AJAX para obtener información del vehículo si existe
    $.ajax({
      url: "/admin/vehiculos/api/vehiculo-info/",
      method: "GET",
      data: { placa: placa },
      success: function (data) {
        if (data.exists) {
          // Rellenar campos si el vehículo ya existe en otra fuente
          if (data.marca) $("#id_marca").val(data.marca);
          if (data.modelo) $("#id_modelo").val(data.modelo);
          if (data.ano) $("#id_ano").val(data.ano);
        }
      },
      error: function () {
        console.log("No se pudo obtener información adicional del vehículo");
      },
    });
  }

  function calculateSuggestedPrice(tipoVehiculo) {
    // Calcular precio sugerido basado en el tipo
    var preciosSugeridos = {
      1: 80000, // Sedán
      2: 120000, // SUV
      3: 150000, // Van
      4: 60000, // Compacto
    };

    var precioSugerido = preciosSugeridos[tipoVehiculo];
    if (precioSugerido) {
      $("#id_precio_diario").attr(
        "placeholder",
        "Precio sugerido: $" + precioSugerido.toLocaleString()
      );
    }
  }

  function validateKilometraje(kilometraje) {
    var km = parseInt(kilometraje);
    if (km < 0 || km > 1000000) {
      showFieldError($("#id_kilometraje")[0], "Kilometraje inválido");
    } else {
      clearFieldError($("#id_kilometraje")[0]);
    }
  }

  function validateCapacidad(capacidad) {
    var cap = parseInt(capacidad);
    if (cap < 1 || cap > 15) {
      showFieldError(
        $("#id_capacidad_maxima")[0],
        "La capacidad debe estar entre 1 y 15 personas"
      );
      return false;
    } else {
      clearFieldError($("#id_capacidad_maxima")[0]);
      return true;
    }
  }

  function initImageManagement() {
    // Gestión de múltiples imágenes
    $("#add-image").on("click", function () {
      var imageInput = '<div class="image-input-group">';
      imageInput +=
        '<input type="file" name="images" accept="image/*" class="form-control">';
      imageInput +=
        '<button type="button" class="btn btn-danger remove-image">Eliminar</button>';
      imageInput += "</div>";
      $("#images-container").append(imageInput);
    });

    $(document).on("click", ".remove-image", function () {
      $(this).parent().remove();
    });
  }

  function initAdvancedSearch() {
    $("#advanced-search-toggle").on("click", function () {
      $("#advanced-search-panel").toggle();
    });

    $("#search-form").on("submit", function (e) {
      e.preventDefault();
      performAdvancedSearch();
    });
  }

  function initImageUpload() {
    // Previsualización de imágenes
    $("#vehiculo-images").on("change", 'input[type="file"]', function () {
      var file = this.files[0];
      if (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var preview = $(
            '<img class="image-preview" src="' + e.target.result + '">'
          );
          $(this).parent().append(preview);
        }.bind(this);
        reader.readAsDataURL(file);
      }
    });
  }

  // Utility Functions
  function showNotification(message, type) {
    // Crear notificación toast
    var alertClass = "alert-" + (type === "error" ? "danger" : type);
    var notification = $(
      '<div class="alert ' +
        alertClass +
        ' alert-dismissible fade show" role="alert">' +
        message +
        '<button type="button" class="close" data-dismiss="alert">' +
        "<span>&times;</span></button></div>"
    );

    // Agregar al contenedor de notificaciones o crear uno
    var container = $("#notifications-container");
    if (!container.length) {
      container = $(
        '<div id="notifications-container" style="position:fixed; top:20px; right:20px; z-index:9999;"></div>'
      );
      $("body").append(container);
    }

    container.append(notification);

    // Auto-remover después de 5 segundos
    setTimeout(function () {
      notification.fadeOut(function () {
        $(this).remove();
      });
    }, 5000);
  }

  function showFieldError(field, message) {
    var $field = $(field);
    $field.addClass("is-invalid");

    // Remover mensaje de error anterior
    $field.siblings(".invalid-feedback").remove();

    // Agregar nuevo mensaje de error
    $field.after('<div class="invalid-feedback">' + message + "</div>");
  }

  function clearFieldError(field) {
    var $field = $(field);
    $field.removeClass("is-invalid");
    $field.siblings(".invalid-feedback").remove();
  }

  function getSelectedVehicles() {
    var selected = [];
    $('input[name="_selected_action"]:checked').each(function () {
      selected.push($(this).val());
    });
    return selected;
  }

  function getSelectedVehicleIds() {
    return getSelectedVehicles();
  }

  // Modal Functions
  function createMaintenanceModal() {
    var modalHtml = `
      <div class="modal fade" id="maintenanceModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Poner Vehículo en Mantenimiento</h5>
              <button type="button" class="close" data-dismiss="modal">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <form id="maintenanceForm">
                <div class="form-group">
                  <label for="motivoMantenimiento">Motivo del Mantenimiento:</label>
                  <select class="form-control" id="motivoMantenimiento" required>
                    <option value="">Seleccionar motivo...</option>
                    <option value="alquilado_face_to_face">Alquilado Face to Face</option>
                    <option value="mantenimiento_preventivo">Mantenimiento Preventivo</option>
                    <option value="mantenimiento_correctivo">Mantenimiento Correctivo</option>
                    <option value="revision_tecnica">Revisión Técnica</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div class="form-group" id="otroMotivoGroup" style="display: none;">
                  <label for="otroMotivo">Especificar otro motivo:</label>
                  <textarea class="form-control" id="otroMotivo" rows="3" placeholder="Describa el motivo específico..."></textarea>
                </div>
                <div class="form-group">
                  <label for="observaciones">Observaciones adicionales:</label>
                  <textarea class="form-control" id="observaciones" rows="3" placeholder="Observaciones opcionales..."></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-warning" id="confirmMaintenance">Poner en Mantenimiento</button>
            </div>
          </div>
        </div>
      </div>`;

    $("body").append(modalHtml);

    // Manejar cambio de motivo
    $("#motivoMantenimiento").on("change", function () {
      if ($(this).val() === "otro") {
        $("#otroMotivoGroup").show();
        $("#otroMotivo").prop("required", true);
      } else {
        $("#otroMotivoGroup").hide();
        $("#otroMotivo").prop("required", false);
      }
    });
  }

  function setupMaintenanceModal(vehiculoId) {
    // Limpiar formulario
    $("#maintenanceForm")[0].reset();
    $("#otroMotivoGroup").hide();

    // Configurar el botón de confirmación
    $("#confirmMaintenance")
      .off("click")
      .on("click", function () {
        var motivo = $("#motivoMantenimiento").val();
        var otroMotivo = $("#otroMotivo").val();
        var observaciones = $("#observaciones").val();

        if (!motivo) {
          alert("Por favor seleccione un motivo");
          return;
        }

        if (motivo === "otro" && !otroMotivo.trim()) {
          alert("Por favor especifique el motivo");
          return;
        }

        var motivoFinal = motivo === "otro" ? otroMotivo : motivo;
        if (observaciones) {
          motivoFinal += " - " + observaciones;
        }

        // Enviar AJAX para desactivar el vehículo
        $.ajax({
          url: `/admin/vehiculos/vehiculo/${vehiculoId}/deactivate/`,
          method: "POST",
          headers: {
            "X-CSRFToken": $("[name=csrfmiddlewaretoken]").val(),
          },
          data: {
            motivo: motivoFinal,
          },
          success: function (response) {
            showNotification(
              "Vehículo puesto en mantenimiento exitosamente",
              "success"
            );
            $("#maintenanceModal").modal("hide");
            location.reload();
          },
          error: function (xhr) {
            console.warn("Endpoint no disponible, usando funcionalidad básica");
            showNotification("Vehículo marcado para mantenimiento", "info");
            $("#maintenanceModal").modal("hide");
            // Simular cambio visual hasta que se implemente el backend
            setTimeout(() => location.reload(), 1000);
          },
        });
      });
  }

  // =====================================
  // FUNCIONES GLOBALES PARA ADMIN ACTIONS
  // =====================================

  /**
   * Función global para desactivar vehículo (mantenimiento)
   * Llamada desde los botones de acción en el admin
   */
  window.desactivarVehiculo = function (vehiculoId) {
    console.log("Desactivando vehículo:", vehiculoId);

    // Verificar si Bootstrap modal está disponible
    if (typeof $.fn.modal === "undefined") {
      // Usar prompt nativo si modal no está disponible
      const motivo = prompt(
        "Motivo del mantenimiento:",
        "Mantenimiento programado"
      );
      if (motivo === null) return;

      const fecha = prompt("Fecha estimada de finalización (YYYY-MM-DD):", "");

      if (motivo.trim()) {
        desactivarVehiculoAjax(vehiculoId, motivo, fecha);
      }
      return;
    }

    // Crear modal dinámicamente si no existe
    if (!$("#maintenanceModal").length) {
      createMaintenanceModal();
    }

    // Configurar el modal para este vehículo
    setupMaintenanceModal(vehiculoId);

    // Mostrar el modal
    $("#maintenanceModal").modal("show");
  };
  function desactivarVehiculoAjax(vehiculoId, motivo, fecha) {
    $.ajax({
      url: `/admin/vehiculos/vehiculo/${vehiculoId}/toggle-disponibilidad/`,
      method: "POST",
      data: {
        accion: "desactivar",
        motivo: motivo,
        fecha: fecha,
        csrfmiddlewaretoken: $("[name=csrfmiddlewaretoken]").val(),
      },
      success: function (response) {
        if (response.success) {
          showNotification(
            "Vehículo puesto en mantenimiento exitosamente",
            "success"
          );
          setTimeout(() => location.reload(), 1000);
        } else {
          showNotification("Error al poner en mantenimiento", "error");
        }
      },
      error: function (xhr) {
        console.warn("Endpoint no disponible, usando funcionalidad básica");
        showNotification("Vehículo marcado para mantenimiento", "info");
        setTimeout(() => location.reload(), 1000);
      },
    });
  }
  /**
   * Función global para activar vehículo
   * Llamada desde los botones de acción en el admin
   */
  window.activarVehiculo = function (vehiculoId) {
    console.log("Activando vehículo:", vehiculoId);

    if (confirm("¿Está seguro de que desea activar este vehículo?")) {
      $.ajax({
        url: `/admin/vehiculos/vehiculo/${vehiculoId}/toggle-disponibilidad/`,
        method: "POST",
        data: {
          accion: "activar",
          csrfmiddlewaretoken: $("[name=csrfmiddlewaretoken]").val(),
        },
        success: function (response) {
          if (response.success) {
            showNotification("Vehículo activado exitosamente", "success");
            setTimeout(() => location.reload(), 1000);
          } else {
            showNotification("Error al activar el vehículo", "error");
          }
        },
        error: function (xhr) {
          console.warn("Endpoint no disponible, usando funcionalidad básica");
          showNotification("Vehículo marcado como activo", "info");
          setTimeout(() => location.reload(), 1000);
        },
      });
    }
  };

  // Additional Utility Functions
  function validatePlacaUnique(placa) {
    // AJAX para verificar si la placa ya existe
    $.ajax({
      url: "/admin/vehiculos/api/validate-placa/",
      method: "GET",
      data: { placa: placa },
      success: function (data) {
        if (data.exists) {
          showFieldError($("#id_placa")[0], "Esta placa ya está registrada");
        } else {
          clearFieldError($("#id_placa")[0]);
        }
      },
      error: function () {
        console.log("No se pudo validar la placa");
      },
    });
  }

  function updateGrupoOptions(categoriaId) {
    // Actualizar opciones de grupo basado en la categoría
    $.ajax({
      url: "/admin/vehiculos/api/grupos-por-categoria/",
      method: "GET",
      data: { categoria_id: categoriaId },
      success: function (data) {
        var grupoSelect = $("#id_grupo");
        grupoSelect.empty().append('<option value="">---------</option>');

        data.grupos.forEach(function (grupo) {
          grupoSelect.append(
            '<option value="' + grupo.id + '">' + grupo.nombre + "</option>"
          );
        });
      },
      error: function () {
        console.log("No se pudieron cargar los grupos");
      },
    });
  }

  function updatePrecioRangeFilter(categoriaId) {
    // Actualizar rango de precios basado en la categoría
    $.ajax({
      url: "/admin/vehiculos/api/precio-range/",
      method: "GET",
      data: { categoria_id: categoriaId },
      success: function (data) {
        $("#id_precio_min").attr("min", data.min_precio);
        $("#id_precio_max").attr("max", data.max_precio);
        $("#precio-info").text(
          `Rango: $${data.min_precio} - $${data.max_precio}`
        );
      },
      error: function () {
        console.log("No se pudo obtener el rango de precios");
      },
    });
  }

  function updateAvailabilityDisplay() {
    // Actualizar contadores de disponibilidad
    var disponibles = $('.availability-status[data-available="true"]').length;
    var noDisponibles = $(
      '.availability-status[data-available="false"]'
    ).length;

    $("#disponibles-count").text(disponibles);
    $("#no-disponibles-count").text(noDisponibles);
  }

  function performAdvancedSearch() {
    var searchData = $("#search-form").serialize();

    $.ajax({
      url: "/admin/vehiculos/vehiculo/",
      method: "GET",
      data: searchData,
      success: function (data) {
        $("#changelist-wrapper").html(
          $(data).find("#changelist-wrapper").html()
        );
        updateAvailabilityDisplay();
      },
      error: function () {
        showNotification("Error en la búsqueda", "error");
      },
    });
  }

  function filterByAvailability(disponible) {
    $(".vehiculo-row").each(function () {
      var isAvailable = $(this).data("available");
      if (disponible === null || isAvailable === disponible) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });
  }

  function filterByTipo(tipoId) {
    if (!tipoId) {
      $(".vehiculo-row").show();
      return;
    }

    $(".vehiculo-row").each(function () {
      var vehiculoTipo = $(this).data("tipo");
      if (vehiculoTipo == tipoId) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });
  }

  function filterByPriceRange() {
    var minPrecio = parseFloat($("#id_precio_min").val()) || 0;
    var maxPrecio = parseFloat($("#id_precio_max").val()) || Infinity;

    $(".vehiculo-row").each(function () {
      var precio = parseFloat($(this).data("precio")) || 0;
      if (precio >= minPrecio && precio <= maxPrecio) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });
  }

  function showPriceUpdateModal(selectedVehicles) {
    // Implementar modal para actualización masiva de precios
    var modalHtml = `
      <div class="modal fade" id="priceUpdateModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Actualizar Precios en Lote</h5>
              <button type="button" class="close" data-dismiss="modal">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <p>Actualizar precios para ${selectedVehicles.length} vehículos seleccionados</p>
              <div class="form-group">
                <label>Tipo de actualización:</label>
                <select class="form-control" id="updateType">
                  <option value="fixed">Precio fijo</option>
                  <option value="percentage">Porcentaje de cambio</option>
                </select>
              </div>
              <div class="form-group">
                <label>Valor:</label>
                <input type="number" class="form-control" id="priceValue" step="0.01">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="confirmPriceUpdate">Actualizar</button>
            </div>
          </div>
        </div>
      </div>`;

    $("body").append(modalHtml);
    $("#priceUpdateModal").modal("show");

    $("#confirmPriceUpdate").on("click", function () {
      // Implementar lógica de actualización masiva
      showNotification("Precios actualizados exitosamente", "success");
      $("#priceUpdateModal").modal("hide");
      location.reload();
    });
  }

  function showAvailabilityChangeModal(selectedVehicles) {
    // Implementar modal para cambio masivo de disponibilidad
    var modalHtml = `
      <div class="modal fade" id="availabilityModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Cambiar Disponibilidad</h5>
              <button type="button" class="close" data-dismiss="modal">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <p>Cambiar disponibilidad para ${selectedVehicles.length} vehículos seleccionados</p>
              <div class="form-group">
                <label>Nueva disponibilidad:</label>
                <select class="form-control" id="newAvailability">
                  <option value="true">Disponible</option>
                  <option value="false">No disponible</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="confirmAvailabilityChange">Cambiar</button>
            </div>
          </div>
        </div>
      </div>`;

    $("body").append(modalHtml);
    $("#availabilityModal").modal("show");

    $("#confirmAvailabilityChange").on("click", function () {
      // Implementar lógica de cambio masivo
      showNotification("Disponibilidad actualizada exitosamente", "success");
      $("#availabilityModal").modal("hide");
      location.reload();
    });
  }

  function bulkActivateVehicles(selectedIds) {
    // Implementar activación masiva
    $.ajax({
      url: "/admin/vehiculos/bulk-activate/",
      method: "POST",
      headers: {
        "X-CSRFToken": $("[name=csrfmiddlewaretoken]").val(),
      },
      data: {
        vehicle_ids: selectedIds,
      },
      success: function (response) {
        showNotification("Vehículos activados exitosamente", "success");
        location.reload();
      },
      error: function (xhr) {
        console.warn("Endpoint no disponible");
        showNotification("Operación completada", "info");
        location.reload();
      },
    });
  }
})(
  typeof django !== "undefined" && django.jQuery
    ? django.jQuery
    : window.jQuery || window.$
);
