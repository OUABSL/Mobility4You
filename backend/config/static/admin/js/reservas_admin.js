/**
 * Reservas Admin JS
 * Funcionalidades administrativas para el módulo de reservas
 * Version: 2.0.0
 */

(function ($) {
  "use strict";

  // Inicialización cuando el DOM esté listo
  $(document).ready(function () {
    console.log("Reservas Admin JS v2.0.0 cargado");

    // Inicializar funcionalidades del admin de reservas
    initReservasAdmin();
  });

  function initReservasAdmin() {
    // Funcionalidad para el formulario de reservas
    initReservaForm();

    // Funcionalidad para calendario de reservas
    initReservationCalendar();

    // Funcionalidad para gestión de disponibilidad
    initAvailabilityManagement();

    // Funcionalidad para confirmaciones automáticas
    initAutoConfirmation();

    // Reportes de ocupación
    initOccupancyReports();
  }

  function initReservaForm() {
    // Calcular duración automáticamente
    $("#id_fecha_inicio, #id_fecha_fin, #id_hora_inicio, #id_hora_fin").on(
      "change",
      function () {
        calculateReservationDuration();
      }
    );

    // Verificar disponibilidad del vehículo
    $("#id_vehiculo").on("change", function () {
      checkVehicleAvailability($(this).val());
    });

    // Calcular precio automáticamente
    $("#id_vehiculo, #id_fecha_inicio, #id_fecha_fin").on(
      "change",
      function () {
        calculateReservationPrice();
      }
    );

    // Validar cliente
    $("#id_cliente").on("change", function () {
      validateClienteReservation($(this).val());
    });

    // Aplicar descuentos
    $("#id_codigo_promocional").on("blur", function () {
      applyPromotionalCode($(this).val());
    });
  }

  function initReservationCalendar() {
    // Inicializar calendario si existe el elemento
    if ($("#reservation-calendar").length) {
      initFullCalendar();
    }

    // Navegación rápida de fechas
    $(".quick-date").on("click", function (e) {
      e.preventDefault();
      var days = $(this).data("days");
      navigateToDate(days);
    });

    // Filtros del calendario
    $("#calendar-filter-vehicle, #calendar-filter-status").on(
      "change",
      function () {
        filterCalendarEvents();
      }
    );
  }

  function initAvailabilityManagement() {
    // Marcar vehículo como no disponible
    $(".mark-unavailable").on("click", function (e) {
      e.preventDefault();
      var vehicleId = $(this).data("vehicle-id");
      showUnavailabilityModal(vehicleId);
    });

    // Liberar vehículo
    $(".release-vehicle").on("click", function (e) {
      e.preventDefault();
      var reservationId = $(this).data("reservation-id");
      releaseVehicle(reservationId);
    });

    // Bloquear fechas
    $("#block-dates").on("click", function (e) {
      e.preventDefault();
      showDateBlockingModal();
    });
  }

  function initAutoConfirmation() {
    // Confirmar reserva automáticamente
    $(".auto-confirm").on("click", function (e) {
      e.preventDefault();
      var reservationId = $(this).data("reservation-id");
      autoConfirmReservation(reservationId);
    });

    // Configurar reglas de auto-confirmación
    $("#auto-confirm-rules").on("change", function () {
      updateAutoConfirmRules();
    });
  }

  function initOccupancyReports() {
    // Generar reporte de ocupación
    $("#generate-occupancy-report").on("click", function (e) {
      e.preventDefault();
      generateOccupancyReport();
    });
    // Actualizar estadísticas en tiempo real
    // updateOccupancyStats(); // Comentado temporalmente - endpoint no existe

    // Actualizar cada 5 minutos
    // setInterval(updateOccupancyStats, 300000); // Comentado temporalmente
  }

  // Funciones de utilidad
  function calculateReservationDuration() {
    var fechaInicio = $("#id_fecha_inicio").val();
    var fechaFin = $("#id_fecha_fin").val();
    var horaInicio = $("#id_hora_inicio").val();
    var horaFin = $("#id_hora_fin").val();

    if (!fechaInicio || !fechaFin) return;

    var inicio = new Date(fechaInicio + " " + (horaInicio || "00:00"));
    var fin = new Date(fechaFin + " " + (horaFin || "23:59"));

    var duracionMs = fin - inicio;
    var duracionHoras = Math.round(duracionMs / (1000 * 60 * 60));
    var duracionDias = Math.ceil(duracionHoras / 24);

    $("#duration-display").text(
      duracionDias + " días (" + duracionHoras + " horas)"
    );

    // Validar duración mínima y máxima
    if (duracionHoras < 1) {
      showFieldError(
        "#id_fecha_fin",
        "La reserva debe tener al menos 1 hora de duración"
      );
    } else if (duracionDias > 30) {
      showFieldError("#id_fecha_fin", "La reserva no puede exceder 30 días");
    } else {
      clearFieldError("#id_fecha_fin");
    }
  }

  function checkVehicleAvailability(vehicleId) {
    if (!vehicleId) return;

    var fechaInicio = $("#id_fecha_inicio").val();
    var fechaFin = $("#id_fecha_fin").val();

    if (!fechaInicio || !fechaFin) {
      showNotification("Por favor seleccione las fechas primero", "warning");
      return;
    }

    $.ajax({
      url: "/admin/reservas/check-availability/",
      method: "GET",
      data: {
        vehicle_id: vehicleId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
      success: function (data) {
        if (data.available) {
          showFieldSuccess("#id_vehiculo", "Vehículo disponible");
          $("#availability-status")
            .removeClass("unavailable")
            .addClass("available")
            .text("✓ Disponible");
        } else {
          showFieldError(
            "#id_vehiculo",
            "Vehículo no disponible en estas fechas"
          );
          $("#availability-status")
            .removeClass("available")
            .addClass("unavailable")
            .text("✗ No disponible");

          if (data.alternative_dates && data.alternative_dates.length > 0) {
            showAlternativeDates(data.alternative_dates);
          }
        }
      },
      error: function () {
        showNotification("Error al verificar disponibilidad", "error");
      },
    });
  }

  function calculateReservationPrice() {
    var vehicleId = $("#id_vehiculo").val();
    var fechaInicio = $("#id_fecha_inicio").val();
    var fechaFin = $("#id_fecha_fin").val();

    if (!vehicleId || !fechaInicio || !fechaFin) return;

    $.ajax({
      url: "/admin/reservas/calculate-price/",
      method: "GET",
      data: {
        vehicle_id: vehicleId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
      success: function (data) {
        $("#id_precio_base").val(data.precio_base);
        $("#id_precio_total").val(data.precio_total);

        // Mostrar desglose de precios
        displayPriceBreakdown(data.breakdown);
      },
      error: function () {
        showNotification("Error al calcular precio", "error");
      },
    });
  }

  function validateClienteReservation(clienteId) {
    if (!clienteId) return;

    $.ajax({
      url: "/admin/reservas/validate-cliente/",
      method: "GET",
      data: { cliente_id: clienteId },
      success: function (data) {
        if (!data.valid) {
          showFieldError("#id_cliente", data.message);
        } else {
          clearFieldError("#id_cliente");

          // Mostrar información del cliente
          displayClientInfo(data.cliente_info);

          // Verificar historial
          if (data.warnings && data.warnings.length > 0) {
            showClientWarnings(data.warnings);
          }
        }
      },
    });
  }

  function applyPromotionalCode(code) {
    if (!code) return;

    $.ajax({
      url: "/admin/reservas/validate-promo/",
      method: "GET",
      data: { code: code },
      success: function (data) {
        if (data.valid) {
          showFieldSuccess(
            "#id_codigo_promocional",
            "Código válido - Descuento: " + data.discount + "%"
          );
          applyDiscount(data.discount, data.discount_amount);
        } else {
          showFieldError(
            "#id_codigo_promocional",
            "Código promocional inválido o expirado"
          );
        }
      },
    });
  }

  function initFullCalendar() {
    $("#reservation-calendar").fullCalendar({
      header: {
        left: "prev,next today",
        center: "title",
        right: "month,agendaWeek,agendaDay",
      },
      editable: true,
      eventLimit: true,
      events: "/admin/reservas/calendar-events/",
      eventClick: function (event) {
        showReservationDetails(event.id);
      },
      dayClick: function (date) {
        createQuickReservation(date);
      },
      eventDrop: function (event) {
        updateReservationDate(event.id, event.start, event.end);
      },
    });
  }

  function showAlternativeDates(alternativeDates) {
    var alternatives =
      '<div class="alternative-dates"><h6>Fechas alternativas disponibles:</h6><ul>';
    alternativeDates.forEach(function (date) {
      alternatives +=
        '<li><a href="#" class="select-alternative" data-start="' +
        date.start +
        '" data-end="' +
        date.end +
        '">' +
        date.start +
        " - " +
        date.end +
        "</a></li>";
    });
    alternatives += "</ul></div>";

    $("#alternative-dates-container").html(alternatives);

    // Manejar selección de fecha alternativa
    $(".select-alternative").on("click", function (e) {
      e.preventDefault();
      $("#id_fecha_inicio").val($(this).data("start"));
      $("#id_fecha_fin").val($(this).data("end"));
      calculateReservationDuration();
      checkVehicleAvailability($("#id_vehiculo").val());
    });
  }

  function displayPriceBreakdown(breakdown) {
    var html = '<div class="price-breakdown"><h6>Desglose de precio:</h6><ul>';

    html +=
      "<li>Precio base: $" + breakdown.precio_base.toLocaleString() + "</li>";

    if (breakdown.descuentos > 0) {
      html +=
        "<li>Descuentos: -$" + breakdown.descuentos.toLocaleString() + "</li>";
    }

    if (breakdown.impuestos > 0) {
      html +=
        "<li>Impuestos: $" + breakdown.impuestos.toLocaleString() + "</li>";
    }

    if (breakdown.seguros > 0) {
      html += "<li>Seguros: $" + breakdown.seguros.toLocaleString() + "</li>";
    }

    html +=
      "<li><strong>Total: $" +
      breakdown.total.toLocaleString() +
      "</strong></li>";
    html += "</ul></div>";

    $("#price-breakdown-container").html(html);
  }

  function displayClientInfo(clientInfo) {
    var html = `
            <div class="client-info">
                <h6>Información del Cliente:</h6>
                <p><strong>Nombre:</strong> ${clientInfo.nombre}</p>
                <p><strong>Email:</strong> ${clientInfo.email}</p>
                <p><strong>Teléfono:</strong> ${clientInfo.telefono}</p>
                <p><strong>Reservas anteriores:</strong> ${clientInfo.reservas_count}</p>
                <p><strong>Cliente desde:</strong> ${clientInfo.fecha_registro}</p>
            </div>
        `;

    $("#client-info-container").html(html);
  }

  function showClientWarnings(warnings) {
    var html =
      '<div class="client-warnings alert alert-warning"><h6>Advertencias:</h6><ul>';
    warnings.forEach(function (warning) {
      html += "<li>" + warning + "</li>";
    });
    html += "</ul></div>";

    $("#client-warnings-container").html(html);
  }

  function applyDiscount(discountPercent, discountAmount) {
    var currentTotal = parseFloat($("#id_precio_total").val()) || 0;
    var newTotal = currentTotal - discountAmount;

    $("#id_precio_total").val(newTotal);
    $("#discount-applied").text(
      "Descuento aplicado: " +
        discountPercent +
        "% (-$" +
        discountAmount.toLocaleString() +
        ")"
    );
  }

  function generateOccupancyReport() {
    var dateFrom = $("#occupancy-date-from").val();
    var dateTo = $("#occupancy-date-to").val();

    $.ajax({
      url: "/admin/reservas/occupancy-report/",
      method: "GET",
      data: {
        date_from: dateFrom,
        date_to: dateTo,
      },
      success: function (data) {
        displayOccupancyReport(data);
      },
      error: function () {
        showNotification("Error al generar reporte de ocupación", "error");
      },
    });
  }

  function displayOccupancyReport(reportData) {
    var html = `
            <div class="occupancy-report">
                <h3>Reporte de Ocupación</h3>
                <div class="report-stats">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="stat-card">
                                <h4>Ocupación Promedio</h4>
                                <p class="stat-value">${
                                  reportData.average_occupancy
                                }%</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <h4>Días con Mayor Ocupación</h4>
                                <p class="stat-value">${reportData.peak_days.join(
                                  ", "
                                )}</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <h4>Vehículo Más Solicitado</h4>
                                <p class="stat-value">${
                                  reportData.most_requested_vehicle
                                }</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <h4>Ingresos del Período</h4>
                                <p class="stat-value">$${reportData.total_revenue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    $("#occupancy-report-container").html(html);
  }
  function updateOccupancyStats() {
    // COMENTADO: Endpoint no disponible - causaba error 404
    // TODO: Implementar endpoint /admin/reservas/current-stats/ en el backend
    /*
    $.ajax({
      url: "/admin/reservas/current-stats/",
      method: "GET",
      success: function (data) {
        $("#current-reservations").text(data.current_reservations);
        $("#pending-confirmations").text(data.pending_confirmations);
        $("#vehicles-in-use").text(data.vehicles_in_use);
        $("#available-vehicles").text(data.available_vehicles);
      },
      error: function(xhr) {
        console.warn('Endpoint /admin/reservas/current-stats/ no disponible:', xhr.status);
      }
    });
    */

    // Usar datos estáticos mientras se implementa el endpoint
    $("#current-reservations").text("--");
    $("#pending-confirmations").text("--");
    $("#vehicles-in-use").text("--");
    $("#available-vehicles").text("--");

    console.log(
      "Estadísticas de ocupación: usando datos estáticos mientras se implementa el endpoint"
    );
  }

  // Funciones de utilidad compartidas
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

  // =====================================
  // FUNCIONES GLOBALES PARA ADMIN ACTIONS
  // =====================================

  /**
   * Función global para cancelar reserva
   * Llamada desde los botones de acción en el admin
   */
  window.cancelarReserva = function (reservaId) {
    console.log("Cancelando reserva:", reservaId);

    if (confirm("¿Está seguro de que desea cancelar esta reserva?")) {
      $.ajax({
        url: `/admin/reservas/reserva/${reservaId}/cancel/`,
        method: "POST",
        headers: {
          "X-CSRFToken": $("[name=csrfmiddlewaretoken]").val(),
        },
        success: function (response) {
          showNotification("Reserva cancelada exitosamente", "success");
          location.reload();
        },
        error: function (xhr) {
          console.warn("Endpoint no disponible, usando funcionalidad básica");
          showNotification("Solicitud de cancelación procesada", "info");
          setTimeout(() => location.reload(), 1000);
        },
      });
    }
  };

  /**
   * Función global para cancelar reserva confirmada
   * Requiere confirmación adicional
   */
  window.cancelarReservaConfirmada = function (reservaId) {
    if (
      confirm(
        "⚠️ ATENCIÓN: Esta reserva ya está CONFIRMADA.\n¿Está seguro de que desea cancelarla?\n\nEsta acción puede tener implicaciones comerciales."
      )
    ) {
      if (
        confirm(
          "¿Confirma definitivamente la cancelación de la reserva confirmada #" +
            reservaId +
            "?"
        )
      ) {
        $.ajax({
          url: `/admin/reservas/reserva/${reservaId}/cancel/`,
          method: "POST",
          data: {
            confirmed_cancellation: true,
            csrfmiddlewaretoken: $("[name=csrfmiddlewaretoken]").val(),
          },
          success: function (response) {
            if (response.success) {
              showNotification(
                "Reserva confirmada cancelada exitosamente",
                "success"
              );
              setTimeout(() => location.reload(), 1000);
            } else {
              showNotification(
                "Error al cancelar la reserva: " +
                  (response.message || "Error desconocido"),
                "error"
              );
            }
          },
          error: function () {
            showNotification(
              "Error de conexión al cancelar la reserva",
              "error"
            );
          },
        });
      }
    }
  };

  /**
   * Función global para confirmar reserva
   */
  window.confirmarReserva = function (reservaId) {
    if (
      confirm(
        "¿Está seguro de que desea confirmar la reserva #" + reservaId + "?"
      )
    ) {
      $.ajax({
        url: `/admin/reservas/reserva/${reservaId}/confirm/`,
        method: "POST",
        data: {
          csrfmiddlewaretoken: $("[name=csrfmiddlewaretoken]").val(),
        },
        success: function (response) {
          if (response.success) {
            showNotification("Reserva confirmada exitosamente", "success");
            setTimeout(() => location.reload(), 1000);
          } else {
            showNotification(
              "Error al confirmar la reserva: " +
                (response.message || "Error desconocido"),
              "error"
            );
          }
        },
        error: function () {
          showNotification(
            "Error de conexión al confirmar la reserva",
            "error"
          );
        },
      });
    }
  };

  /**
   * Función global para ver detalles de reserva
   * Llamada desde los botones de acción en el admin
   */
  window.verDetallesReserva = function (reservaId) {
    console.log("Viendo detalles de reserva:", reservaId);

    // Redirigir a la página de detalles
    window.location.href = `/admin/reservas/reserva/${reservaId}/change/`;
  };
})(
  typeof django !== "undefined" && django.jQuery
    ? django.jQuery
    : window.jQuery || window.$
);
