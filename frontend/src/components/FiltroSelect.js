// src/components/FiltroSelect.js - Versión mejorada
import React from 'react';
import { Row, Col, Form, Badge, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faFilter, 
  faSort, 
  faCar, 
  faGasPump, 
  faSliders,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';

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

  const clearAllFilters = () => {
    setFilters({
      marca: '',
      modelo: '',
      combustible: '',
      orden: ''
    });
  };

  // Calcular cuántos filtros están aplicados
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="filter-container p-4 mb-4 rounded-lg">
      <div className="filter-header d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 filter-title">
          <FontAwesomeIcon icon={faSliders} className="me-2" />
          Filtrar y ordenar resultados
        </h5>
        
        {activeFiltersCount > 0 && (
          <Button 
            variant="link" 
            size="sm" 
            className="filter-clear-btn"
            onClick={clearAllFilters}
          >
            Limpiar filtros ({activeFiltersCount})
          </Button>
        )}
      </div>
      
      <Row className="filter-selects g-3">
        {Object.entries(filters).map(([filterName, filterValue]) => (
          <Col key={filterName} md={3} sm={6} xs={12}>
            {filterValue ? (
              <div className="selected-filter-badge">
                <div className="selected-filter-inner">
                  <div className="filter-badge-content">
                    <FontAwesomeIcon icon={getFilterIcon(filterName)} className="filter-badge-icon" />
                    <div className="filter-badge-text">
                      <span className="filter-badge-label">{filterName === 'orden' ? 'Orden' : filterName}</span>
                      <span className="filter-badge-value">{filterValue}</span>
                    </div>
                  </div>
                  <Button 
                    variant="link" 
                    className="filter-remove-btn"
                    onClick={() => removeFilter(filterName)}
                    aria-label={`Quitar filtro de ${filterName}`}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="filter-select-wrapper">
                <FontAwesomeIcon icon={getFilterIcon(filterName)} className="filter-select-icon" />
                <Form.Select 
                  name={filterName} 
                  value={filterValue} 
                  onChange={handleChange}
                  className="filter-select"
                >
                  <option value="">
                    {filterName === 'orden' ? 'Ordenar por' : `Filtrar por ${filterName}`}
                  </option>
                  {options[filterName]?.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </Form.Select>
                <FontAwesomeIcon icon={faChevronDown} className="filter-select-arrow" />
              </div>
            )}
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default FiltroSelect;