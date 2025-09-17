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

    // Reorganizar el formulario para mover precios al final
    reorganizeReservaForm();
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
    $("#id_fecha_recogida, #id_fecha_devolucion").on("change", function () {
      calculateReservationDuration();
    });

    // Verificar disponibilidad del vehículo
    $("#id_vehiculo").on("change", function () {
      checkVehicleAvailability($(this).val());
    });

    // Calcular precio automáticamente
    $("#id_vehiculo, #id_fecha_recogida, #id_fecha_devolucion").on(
      "change",
      function () {
        calculateReservationPrice();
      }
    );

    // Validar cliente
    $("#id_usuario").on("change", function () {
      validateClienteReservation($(this).val());
    });

    // Aplicar descuentos
    $("#id_promocion").on("blur", function () {
      applyPromotionalCode($(this).val());
    });

    // Recalcular precio cuando cambien los extras
    $(document).on(
      "change",
      "select[name$='-extra'], input[name$='-cantidad']",
      function () {
        console.log("Extra cambiado, invalidando cálculo de precio");
        // Limpiar resultado anterior para forzar nuevo cálculo
        $("#precio-calculation-result").html(
          '<div style="color: #856404; background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; border-radius: 4px;">' +
            '<small>💡 Los extras han cambiado. Haz clic en "Calcular Precio" para actualizar.</small>' +
            "</div>"
        );
      }
    );

    // Recalcular precio cuando se agregan o eliminan filas de extras
    $(document).on("click", ".add-row a, .delete-row a", function () {
      setTimeout(function () {
        console.log("Fila de extra agregada/eliminada, invalidando cálculo");
        $("#precio-calculation-result").html(
          '<div style="color: #856404; background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; border-radius: 4px;">' +
            '<small>💡 Los extras han cambiado. Haz clic en "Calcular Precio" para actualizar.</small>' +
            "</div>"
        );
      }, 100); // Pequeño delay para que Django procese el cambio
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
    var fechaRecogida = $("#id_fecha_recogida").val();
    var fechaDevolucion = $("#id_fecha_devolucion").val();
    var horaInicio = $("#id_hora_inicio").val();
    var horaFin = $("#id_hora_fin").val();

    if (!fechaRecogida || !fechaDevolucion) return;

    var inicio = new Date(fechaRecogida + " " + (horaInicio || "00:00"));
    var fin = new Date(fechaDevolucion + " " + (horaFin || "23:59"));

    var duracionMs = fin - inicio;
    var duracionHoras = Math.round(duracionMs / (1000 * 60 * 60));
    var duracionDias = Math.ceil(duracionHoras / 24);

    $("#duration-display").text(
      duracionDias + " días (" + duracionHoras + " horas)"
    );

    // Validar duración mínima y máxima
    if (duracionHoras < 1) {
      showFieldError(
        "#id_fecha_devolucion",
        "La reserva debe tener al menos 1 hora de duración"
      );
    } else {
      clearFieldError("#id_fecha_devolucion");
    }
  }

  function checkVehicleAvailability(vehicleId) {
    if (!vehicleId) return;

    var fechaRecogida = $("#id_fecha_recogida").val();
    var fechaDevolucion = $("#id_fecha_devolucion").val();

    if (!fechaRecogida || !fechaDevolucion) {
      showNotification("Por favor seleccione las fechas primero", "warning");
      return;
    }

    $.ajax({
      url: "/admin/reservas/check-availability/",
      method: "GET",
      data: {
        vehicle_id: vehicleId,
        fecha_recogida: fechaRecogida,
        fecha_devolucion: fechaDevolucion,
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
    var fechaRecogida = $("#id_fecha_recogida").val();
    var fechaDevolucion = $("#id_fecha_devolucion").val();
    var politicaPagoId = $("#id_politica_pago").val();
    var promocionId = $("#id_promocion").val();

    if (!vehicleId || !fechaRecogida || !fechaDevolucion) return;

    // Determinar el object_id para la URL
    var objectId = window.location.pathname.match(/\/(\d+|add)\//);
    objectId = objectId ? objectId[1] : "new";

    // Obtener el token CSRF
    var csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

    $.ajax({
      url: "/admin/reservas/reserva/" + objectId + "/calcular-precio/",
      method: "POST",
      data: {
        vehiculo_id: vehicleId,
        fecha_recogida: fechaRecogida,
        fecha_devolucion: fechaDevolucion,
        politica_pago_id: politicaPagoId,
        promocion_id: promocionId,
        csrfmiddlewaretoken: csrfToken,
      },
      success: function (data) {
        $("#id_precio_dia").val(data.precio_dia);
        $("#id_precio_total").val(data.precio_total);

        // Mostrar desglose de precios
        if (data.breakdown) {
          displayPriceBreakdown(data.breakdown);
        }

        showNotification("Precio calculado correctamente", "success");
      },
      error: function (xhr) {
        var errorMsg = "Error al calcular precio";
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        }
        showNotification(errorMsg, "error");
      },
    });
  }

  function calcularPrecioReserva() {
    // Esta función es llamada por el botón "Calcular Precio" en el admin
    calculateReservationPrice();
  }

  function aplicarPrecioCalculado(data) {
    // Aplicar los precios calculados a los campos del formulario
    if (data.precio_dia) {
      $("#id_precio_dia").val(data.precio_dia);
    }
    if (data.precio_total) {
      $("#id_precio_total").val(data.precio_total);
    }

    // Mostrar el desglose si está disponible
    if (data.breakdown) {
      displayPriceBreakdown(data.breakdown);
    }

    showNotification("Precios actualizados correctamente", "success");
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
      $("#id_fecha_recogida").val($(this).data("start"));
      $("#id_fecha_devolucion").val($(this).data("end"));
      calculateReservationDuration();
      checkVehicleAvailability($("#id_vehiculo").val());
    });
  }

  function displayPriceBreakdown(breakdown) {
    var html =
      '<div class="price-breakdown"><h6>Desglose de precio (IVA incluido):</h6><ul>';

    html +=
      "<li>Precio total: $" + breakdown.precio_dia.toLocaleString() + "</li>";

    if (breakdown.descuentos > 0) {
      html +=
        "<li>Descuentos: -$" + breakdown.descuentos.toLocaleString() + "</li>";
    }

    if (breakdown.iva > 0) {
      html +=
        "<li>IVA (10% INCLUIDO): $" + breakdown.iva.toLocaleString() + "</li>";
    }

    if (breakdown.seguros > 0) {
      html += "<li>Seguros: $" + breakdown.seguros.toLocaleString() + "</li>";
    }

    html +=
      "<li><strong>Total (con IVA incluido): $" +
      breakdown.total.toLocaleString() +
      "</strong></li>";
    html +=
      "<li><small><em>Nota: El IVA mostrado es simbólico. Los precios ya incluyen IVA.</em></small></li>";
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
    type = type || "info";
    var alertClass = "alert-" + (type === "error" ? "danger" : type);

    var notification = $(
      '<div class="alert ' +
        alertClass +
        ' alert-dismissible fade show" role="alert">' +
        message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>' +
        "</div>"
    );

    // Crear contenedor de mensajes si no existe
    var messagesContainer = $(".messages");
    if (messagesContainer.length === 0) {
      messagesContainer = $('<div class="messages"></div>');
      $("body").prepend(messagesContainer);
    }

    messagesContainer.append(notification);

    setTimeout(function () {
      notification.fadeOut(500, function () {
        $(this).remove();
      });
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

    // Obtener CSRF token
    const csrfToken =
      $("[name=csrfmiddlewaretoken]").val() ||
      $("input[name=csrfmiddlewaretoken]").val() ||
      document.querySelector("[name=csrfmiddlewaretoken]")?.value;

    console.log("CSRF Token encontrado:", !!csrfToken);

    if (!csrfToken) {
      showNotification("Error: No se encontró el token CSRF", "error");
      return;
    }

    if (confirm("¿Está seguro de que desea cancelar esta reserva?")) {
      $.ajax({
        url: `/admin/reservas/reserva/${reservaId}/cancel/`,
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        data: {
          csrfmiddlewaretoken: csrfToken,
        },
        beforeSend: function () {
          console.log(
            "Enviando solicitud de cancelación para reserva:",
            reservaId
          );
        },
        success: function (response) {
          console.log("Respuesta exitosa:", response);
          showNotification("Reserva cancelada exitosamente", "success");
          setTimeout(() => location.reload(), 1000);
        },
        error: function (xhr, status, error) {
          console.error("Error en cancelación:", {
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText,
            error: error,
          });

          if (xhr.status === 403) {
            showNotification("Error: Permisos insuficientes", "error");
          } else if (xhr.status === 404) {
            showNotification("Error: Reserva no encontrada", "error");
          } else if (xhr.status === 0) {
            showNotification("Error de conexión. Verifique la red.", "error");
          } else {
            let errorMsg = "Error desconocido";
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMsg =
                errorResponse.error || errorResponse.message || errorMsg;
            } catch (e) {
              errorMsg = xhr.statusText || errorMsg;
            }
            showNotification(`Error al cancelar: ${errorMsg}`, "error");
          }
        },
      });
    }
  };

  /**
   * Función global para cancelar reserva confirmada
   * Requiere confirmación adicional
   */
  window.cancelarReservaConfirmada = function (reservaId) {
    console.log("Cancelando reserva confirmada:", reservaId);

    // Obtener CSRF token
    const csrfToken =
      $("[name=csrfmiddlewaretoken]").val() ||
      $("input[name=csrfmiddlewaretoken]").val() ||
      document.querySelector("[name=csrfmiddlewaretoken]")?.value;

    if (!csrfToken) {
      showNotification("Error: No se encontró el token CSRF", "error");
      return;
    }

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
            csrfmiddlewaretoken: csrfToken,
          },
          beforeSend: function () {
            console.log(
              "Enviando solicitud de cancelación confirmada para reserva:",
              reservaId
            );
          },
          success: function (response) {
            console.log("Respuesta exitosa:", response);
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
          error: function (xhr, status, error) {
            console.error("Error en cancelación confirmada:", {
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText,
              error: error,
            });

            if (xhr.status === 403) {
              showNotification("Error: Permisos insuficientes", "error");
            } else if (xhr.status === 404) {
              showNotification("Error: Reserva no encontrada", "error");
            } else if (xhr.status === 0) {
              showNotification("Error de conexión. Verifique la red.", "error");
            } else {
              let errorMsg = "Error desconocido";
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMsg =
                  errorResponse.error || errorResponse.message || errorMsg;
              } catch (e) {
                errorMsg = xhr.statusText || errorMsg;
              }
              showNotification(`Error al cancelar: ${errorMsg}`, "error");
            }
          },
        });
      }
    }
  };

  /**
   * Función global para confirmar reserva
   */
  window.confirmarReserva = function (reservaId) {
    console.log("Confirmando reserva:", reservaId);

    // Obtener CSRF token
    const csrfToken =
      $("[name=csrfmiddlewaretoken]").val() ||
      $("input[name=csrfmiddlewaretoken]").val() ||
      document.querySelector("[name=csrfmiddlewaretoken]")?.value;

    console.log("CSRF Token encontrado:", !!csrfToken);

    if (!csrfToken) {
      showNotification("Error: No se encontró el token CSRF", "error");
      return;
    }

    if (
      confirm(
        "¿Está seguro de que desea confirmar la reserva #" + reservaId + "?"
      )
    ) {
      $.ajax({
        url: `/admin/reservas/reserva/${reservaId}/confirm/`,
        method: "POST",
        data: {
          csrfmiddlewaretoken: csrfToken,
        },
        beforeSend: function () {
          console.log(
            "Enviando solicitud de confirmación para reserva:",
            reservaId
          );
        },
        success: function (response) {
          console.log("Respuesta exitosa:", response);
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
        error: function (xhr, status, error) {
          console.error("Error en confirmación:", {
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText,
            error: error,
          });

          if (xhr.status === 403) {
            showNotification("Error: Permisos insuficientes", "error");
          } else if (xhr.status === 404) {
            showNotification("Error: Reserva no encontrada", "error");
          } else if (xhr.status === 0) {
            showNotification("Error de conexión. Verifique la red.", "error");
          } else {
            let errorMsg = "Error desconocido";
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMsg =
                errorResponse.error || errorResponse.message || errorMsg;
            } catch (e) {
              errorMsg = xhr.statusText || errorMsg;
            }
            showNotification(`Error al confirmar: ${errorMsg}`, "error");
          }
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

  /**
   * Función global para calcular precio de reserva desde el admin
   * Usa los datos del formulario actual en lugar de datos guardados
   */
  window.calcularPrecioReserva = function (reservaId) {
    console.log("Calculando precio para reserva:", reservaId);

    // Obtener datos del formulario actual con múltiples selectores posibles
    const vehiculo_id =
      $("#id_vehiculo").val() ||
      $("select[name='vehiculo']").val() ||
      $("input[name='vehiculo']").val();
    const fecha_recogida =
      $("#id_fecha_recogida").val() ||
      $("input[name='fecha_recogida']").val() ||
      $("#id_fecha_recogida_0").val();
    const fecha_devolucion =
      $("#id_fecha_devolucion").val() ||
      $("input[name='fecha_devolucion']").val() ||
      $("#id_fecha_devolucion_0").val();
    const politica_pago_id =
      $("#id_politica_pago").val() || $("select[name='politica_pago']").val();
    const promocion_id =
      $("#id_promocion").val() || $("select[name='promocion']").val();

    // Log para debugging
    console.log("Valores obtenidos:", {
      vehiculo_id: vehiculo_id,
      fecha_recogida: fecha_recogida,
      fecha_devolucion: fecha_devolucion,
      politica_pago_id: politica_pago_id,
      promocion_id: promocion_id,
    });

    // Validar datos mínimos
    if (!vehiculo_id || !fecha_recogida || !fecha_devolucion) {
      console.error("Faltan campos requeridos:", {
        vehiculo_id,
        fecha_recogida,
        fecha_devolucion,
      });
      $("#precio-calculation-result").html(`
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; color: #721c24;">
          <strong>❌ Error:</strong> Debes completar vehículo, fecha de recogida y fecha de devolución<br>
          <small>Debug: vehiculo=${vehiculo_id}, fecha_recogida=${fecha_recogida}, fecha_devolucion=${fecha_devolucion}</small>
        </div>
      `);
      return;
    }

    // Validar formato de fechas (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fecha_recogida)) {
      $("#precio-calculation-result").html(`
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; color: #721c24;">
          <strong>❌ Error:</strong> Formato de fecha de recogida inválido. Use YYYY-MM-DD<br>
          <small>Recibido: ${fecha_recogida}</small>
        </div>
      `);
      return;
    }

    if (!dateRegex.test(fecha_devolucion)) {
      $("#precio-calculation-result").html(`
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; color: #721c24;">
          <strong>❌ Error:</strong> Formato de fecha de devolución inválido. Use YYYY-MM-DD<br>
          <small>Recibido: ${fecha_devolucion}</small>
        </div>
      `);
      return;
    }

    // Mostrar indicador de carga
    const resultDiv = $("#precio-calculation-result");
    const button = $("#calcular-precio-btn");

    button.prop("disabled", true).text("Calculando...");
    resultDiv.html(
      '<div style="color: #007cba;"><em>Calculando precio...</em></div>'
    );

    // Preparar datos del formulario con validación
    const formData = new FormData();
    formData.append("vehiculo_id", vehiculo_id);
    formData.append("fecha_recogida", fecha_recogida);
    formData.append("fecha_devolucion", fecha_devolucion);
    if (politica_pago_id) formData.append("politica_pago_id", politica_pago_id);
    if (promocion_id) formData.append("promocion_id", promocion_id);

    // RECOLECTAR EXTRAS DEL FORMULARIO
    const extras = [];

    // Debug: Verificar qué elementos de inline existen
    console.log("🔍 Buscando elementos de extras en el DOM...");
    console.log("Tablas inline encontradas:", $(".inline-group table").length);
    console.log(
      "Filas con ID reservaextra:",
      $("tr[id*='reservaextra']").length
    );
    console.log("Todas las filas de tabla:", $("tr").length);

    // Buscar extras usando múltiples estrategias
    let extrasEncontrados = 0;

    // Estrategia 1: Buscar por nombre de campo específico
    $("select[name*='reservaextra_set'][name*='-extra']").each(function () {
      const select = $(this);
      const row = select.closest("tr");
      const cantidadInput = row.find(
        "input[name*='reservaextra_set'][name*='-cantidad']"
      );
      const deleteInput = row.find(
        "input[name*='reservaextra_set'][name*='-DELETE']"
      );

      const extraId = select.val();
      const cantidad = cantidadInput.val();
      const isDeleted = deleteInput.is(":checked");

      console.log(
        `🔍 Estrategia 1 - Extra encontrado: ID=${extraId}, Cantidad=${cantidad}, Deleted=${isDeleted}`
      );

      if (extraId && cantidad && cantidad > 0 && !isDeleted) {
        extras.push({
          extra_id: parseInt(extraId),
          cantidad: parseInt(cantidad),
        });
        extrasEncontrados++;
        console.log(`✓ Extra agregado (E1): ${extraId} x ${cantidad}`);
      }
    });

    // Estrategia 2: Buscar por clase del inline
    $(".inline-related").each(function () {
      const row = $(this);
      if (row.find("select[name*='extra']").length > 0) {
        const extraSelect = row.find("select[name*='extra']");
        const cantidadInput = row.find("input[name*='cantidad']");
        const deleteInput = row.find("input[name*='DELETE']");

        const extraId = extraSelect.val();
        const cantidad = cantidadInput.val();
        const isDeleted = deleteInput.is(":checked");

        console.log(
          `🔍 Estrategia 2 - Extra encontrado: ID=${extraId}, Cantidad=${cantidad}, Deleted=${isDeleted}`
        );

        if (extraId && cantidad && cantidad > 0 && !isDeleted) {
          // Verificar si ya existe para evitar duplicados
          const existe = extras.some((e) => e.extra_id === parseInt(extraId));
          if (!existe) {
            extras.push({
              extra_id: parseInt(extraId),
              cantidad: parseInt(cantidad),
            });
            extrasEncontrados++;
            console.log(`✓ Extra agregado (E2): ${extraId} x ${cantidad}`);
          }
        }
      }
    });

    // Estrategia 3: Buscar en toda la página por campos que contengan 'extra'
    if (extrasEncontrados === 0) {
      console.log("🔍 Estrategia 3 - Búsqueda amplia...");
      $("select[name*='extra']").each(function () {
        const select = $(this);
        const name = select.attr("name");
        const extraId = select.val();

        console.log(`🔍 Select encontrado: name="${name}", value="${extraId}"`);

        if (
          name &&
          name.includes("extra") &&
          !name.includes("DELETE") &&
          extraId
        ) {
          // Buscar el campo cantidad correspondiente
          const basePrefix = name.replace("-extra", "");
          const cantidadInput = $(`input[name="${basePrefix}-cantidad"]`);
          const deleteInput = $(`input[name="${basePrefix}-DELETE"]`);

          const cantidad = cantidadInput.val();
          const isDeleted = deleteInput.is(":checked");

          console.log(
            `🔍 Estrategia 3 - Extra: ID=${extraId}, Cantidad=${cantidad}, Deleted=${isDeleted}`
          );

          if (cantidad && cantidad > 0 && !isDeleted) {
            extras.push({
              extra_id: parseInt(extraId),
              cantidad: parseInt(cantidad),
            });
            extrasEncontrados++;
            console.log(`✓ Extra agregado (E3): ${extraId} x ${cantidad}`);
          }
        }
      });
    }

    console.log("Extras encontrados:", extras);

    // Agregar extras al FormData
    formData.append("extras", JSON.stringify(extras));

    formData.append(
      "csrfmiddlewaretoken",
      $("[name=csrfmiddlewaretoken]").val()
    );

    // Realizar petición AJAX
    $.ajax({
      url: `/admin/reservas/reserva/${reservaId}/calcular-precio/`,
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        console.log("Precio calculado exitosamente:", response);

        // Mostrar resultado simplificado con desglose
        let extrasInfo = "";
        if (
          response.desglose &&
          response.desglose.extras_detalle &&
          response.desglose.extras_detalle.length > 0
        ) {
          extrasInfo = "<br><small><strong>Extras incluidos:</strong> ";
          const extrasDesc = response.desglose.extras_detalle
            .map(
              (extra) =>
                `${extra.nombre} x${extra.cantidad} (€${extra.subtotal})`
            )
            .join(", ");
          extrasInfo += extrasDesc + "</small>";
        }

        let resultHtml = `
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; border-radius: 5px;">
            <strong>✅ Precio calculado:</strong><br>
            <div style="font-size: 16px; font-weight: bold; color: #0c5460; margin: 5px 0;">
              Total: €${response.precio_total} (${response.dias_alquiler} días)
            </div>
            <small>Precio por día: €${response.precio_dia.toFixed(
              2
            )} | IVA simbólico: €${response.iva_simbolico.toFixed(2)}</small>
            ${extrasInfo}
            <div style="margin-top: 10px;">
              <button type="button" class="button" onclick="aplicarPrecioCalculado(${
                response.precio_dia
              }, ${response.precio_total}, ${response.iva_simbolico})"
                      style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                💾 Aplicar Precios
              </button>
            </div>
          </div>
        `;

        resultDiv.html(resultHtml);
      },
      error: function (xhr) {
        console.error("Error calculando precio:", xhr);

        let errorMsg = "Error desconocido";
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        }

        resultDiv.html(`
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; color: #721c24;">
            <strong>❌ Error:</strong> ${errorMsg}
          </div>
        `);
      },
      complete: function () {
        // Restaurar botón
        button.prop("disabled", false).text("💰 Calcular Precio");
      },
    });
  };

  /**
   * Función simplificada para aplicar precios calculados
   */
  window.aplicarPrecioCalculado = function (
    precioDia,
    precioTotal,
    ivaSimbólico
  ) {
    console.log("Aplicando precios:", precioDia, precioTotal, ivaSimbólico);

    // Aplicar precio por día
    const precioDiaField = $("#id_precio_dia");
    if (precioDiaField.length) {
      precioDiaField.val(precioDia.toFixed(2));
    }

    // Aplicar precio total
    const precioTotalField = $("#id_precio_total");
    if (precioTotalField.length) {
      precioTotalField.val(precioTotal.toFixed(2));
    }

    // Aplicar IVA simbólico
    const ivaField = $("#id_iva");
    if (ivaField.length) {
      ivaField.val(ivaSimbólico.toFixed(2));
    }

    // Mostrar confirmación
    $("#precio-calculation-result").html(`
      <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; color: #155724;">
        <strong>✅ Precios aplicados exitosamente</strong><br>
        Los campos han sido actualizados. Puedes modificarlos manualmente antes de guardar.
      </div>
    `);
  };

  /**
   * Reorganizar el formulario para mover el bloque de precios al final
   */
  function reorganizeReservaForm() {
    // Solo ejecutar en páginas de cambio/adición de reserva
    if (!window.location.pathname.includes("/reservas/reserva/")) {
      return;
    }

    // Buscar el fieldset de precios y cálculos
    const preciosFieldset = $(
      'fieldset.module:contains("💰 Precios y Cálculos")'
    );

    if (preciosFieldset.length === 0) {
      console.log("No se encontró el fieldset de precios");
      return;
    }

    // Buscar todos los inlines (conductores, extras, penalizaciones)
    const inlines = $(".inline-group");

    if (inlines.length === 0) {
      console.log("No se encontraron inlines");
      return;
    }

    console.log(
      "Reorganizando formulario: moviendo precios después de inlines"
    );

    // Mover el fieldset de precios después del último inline
    const lastInline = inlines.last();
    preciosFieldset.detach().insertAfter(lastInline);

    // Agregar una clase para identificar que fue movido
    preciosFieldset.addClass("moved-to-end");

    // Agregar un separador visual
    preciosFieldset.before(
      '<div style="border-top: 2px solid #417690; margin: 20px 0 10px 0; opacity: 0.3;"></div>'
    );

    console.log("Formulario reorganizado: bloque de precios movido al final");
  }
})(
  typeof django !== "undefined" && django.jQuery
    ? django.jQuery
    : window.jQuery || window.$
);
