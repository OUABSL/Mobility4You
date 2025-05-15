// src/components/FiltroSelect.js - Versión mejorada
import React from 'react';
import { Row, Col, Form, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faFilter, faSort, faCar, faGasPump } from '@fortawesome/free-solid-svg-icons';

const FiltroSelect = ({ filters, setFilters, options }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const removeFilter = (name) => {
    setFilters(prev => ({ ...prev, [name]: '' }));
  };

  const getFilterIcon = (filterName) => {
    switch (filterName) {
      case 'orden': return faSort;
      case 'marca': return faCar;
      case 'modelo': return faCar;
      case 'combustible': return faGasPump;
      default: return faFilter;
    }
  };

  // Cada bloque: si ya se seleccionó una opción se muestra como etiqueta con un icono; si no, se muestra el select.
  return (
    <div className="filter-container p-3 mb-4 rounded shadow-sm">
      <h5 className="mb-3">
        <FontAwesomeIcon icon={faFilter} className="me-2" />
        Filtrar y ordenar resultados
      </h5>
      <Row className="filter-selects d-flex justify-content-start align-items-center flex-wrap">
        {Object.entries(filters).map(([filterName, filterValue]) => (
          <Col key={filterName} md={3} sm={6} xs={12} className="mb-3 d-flex align-items-stretch">
            {filterValue ? (
              <Badge 
                bg="primary" 
                className="selected-filter-badge shadow-sm px-3 py-2"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  width: '100%', 
                  fontSize: '1rem', 
                  gap: '0.5rem',
                  letterSpacing: '0.01em'
                }}
              >
                <FontAwesomeIcon icon={getFilterIcon(filterName)} className="me-2" />
                <span className="me-2 fw-semibold">{filterName.charAt(0).toUpperCase() + filterName.slice(1)}:</span>
                <span className="filter-value">{filterValue}</span>
                <FontAwesomeIcon 
                  icon={faTimes} 
                  className="ms-2 remove-filter-icon"
                  onClick={() => removeFilter(filterName)}
                  style={{ cursor: 'pointer', marginLeft: 'auto' }}
                  title="Quitar filtro"
                />
              </Badge>
            ) : (
              <Form.Group controlId={filterName} className="filter-group w-100">
                <div className="form-filters">
                  <Form.Select 
                    name={filterName} 
                    value={filterValue} 
                    onChange={handleChange}
                    className="filter-select shadow-sm"
                    id={`floating-${filterName}`}
                    style={{fontSize: '1rem', borderRadius: 10}} 
                  >
                    <option value="" disabled>
                      {filterName}
                    </option>
                    {options[filterName]?.map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </Form.Select>
                </div>
              </Form.Group>
            )}
          </Col>
        ))}
      </Row>
      <div className="filter-count text-end mt-2">
        {Object.values(filters).filter(v => v).length > 0 && (
          <small className="text-muted">
            {Object.values(filters).filter(v => v).length} filtros aplicados
          </small>
        )}
      </div>
    </div>
  );
};

export default FiltroSelect;