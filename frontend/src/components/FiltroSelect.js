// src/components/FiltroSelects.js
import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const FiltroSelect = ({ filters, setFilters, options }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const removeFilter = (name) => {
    setFilters(prev => ({ ...prev, [name]: '' }));
  };

  // Cada bloque: si ya se seleccionó una opción se muestra como etiqueta con un icono; si no, se muestra el select.
  return (
    <Row className="mb-4 filter-selects d-flex justify-content-start align-items-center flex-wrap flex-row">
      <Col md={3} sm={6} className="mb-2">
        <Form.Group controlId="orden">
          {filters.orden ? (
            <div className="selected-filter">
              {filters.orden}
              <FontAwesomeIcon icon={faTimes} className="remove-icon" onClick={() => removeFilter('orden')} />
            </div>
          ) : (
            <Form.Select name="orden" value={filters.orden} onChange={handleChange}>
              <option value="">Ordenar por</option>
              {options.orden.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          )}
        </Form.Group>
      </Col>
      <Col md={3} sm={6} className="mb-2">
        <Form.Group controlId="marca">
          {filters.marca ? (
            <div className="selected-filter">
              {filters.marca}
              <FontAwesomeIcon icon={faTimes} className="remove-icon" onClick={() => removeFilter('marca')} />
            </div>
          ) : (
            <Form.Select name="marca" value={filters.marca} onChange={handleChange}>
              <option value="">Marca</option>
              {options.marca.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          )}
        </Form.Group>
      </Col>
      <Col md={3} sm={6} className="mb-2">
        <Form.Group controlId="modelo">
          {filters.modelo ? (
            <div className="selected-filter">
              {filters.modelo}
              <FontAwesomeIcon icon={faTimes} className="remove-icon" onClick={() => removeFilter('modelo')} />
            </div>
          ) : (
            <Form.Select name="modelo" value={filters.modelo} onChange={handleChange}>
              <option value="">Modelo</option>
              {options.modelo.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          )}
        </Form.Group>
      </Col>
      <Col md={3} sm={6} className="mb-2">
        <Form.Group controlId="combustible">
          {filters.combustible ? (
            <div className="selected-filter">
              {filters.combustible}
              <FontAwesomeIcon icon={faTimes} className="remove-icon" onClick={() => removeFilter('combustible')} />
            </div>
          ) : (
            <Form.Select name="combustible" value={filters.combustible} onChange={handleChange}>
              <option value="">Combustible</option>
              {options.combustible.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          )}
        </Form.Group>
      </Col>
    </Row>
  );
};

export default FiltroSelect;
