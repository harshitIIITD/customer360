// Customer360 Dashboard - Data Mappings Component

const { useState, useEffect } = React;

const DataMappings = () => {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceSystems, setSourceSystems] = useState([]);
  const [customerAttributes, setCustomerAttributes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [validatingMapping, setValidatingMapping] = useState(null);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [filters, setFilters] = useState({});
  const [newMapping, setNewMapping] = useState({
    source_system_id: '',
    source_attribute: '',
    target_attribute_id: '',
    transformation_logic: '',
    created_by: 'dashboard_user'
  });
  const [suggestedMappings, setSuggestedMappings] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [useMachineLearning, setUseMachineLearning] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchMappings(),
      fetchSourceSystems(),
      fetchCustomerAttributes()
    ]);
  }, []);

  // Re-fetch mappings when filters change
  useEffect(() => {
    fetchMappings();
  }, [filters]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.source_id) queryParams.append('source_id', filters.source_id);
      if (filters.target_id) queryParams.append('target_id', filters.target_id);
      if (filters.status) queryParams.append('status', filters.status);
      
      const response = await axios.get(`/api/mappings?${queryParams.toString()}`);
      if (response.data.success) {
        setMappings(response.data.mappings || []);
      } else {
        console.error('Error fetching mappings:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSourceSystems = async () => {
    try {
      const response = await axios.get('/api/source-systems');
      if (response.data.success) {
        setSourceSystems(response.data.source_systems || []);
      }
    } catch (error) {
      console.error('Error fetching source systems:', error);
    }
  };

  const fetchCustomerAttributes = async () => {
    try {
      const response = await axios.get('/api/customer-attributes');
      if (response.data.success) {
        setCustomerAttributes(response.data.attributes || []);
      }
    } catch (error) {
      console.error('Error fetching customer attributes:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMapping(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If source system changed, clear source attribute
    if (name === 'source_system_id') {
      setNewMapping(prev => ({
        ...prev,
        source_attribute: ''
      }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newMapping.source_system_id || !newMapping.source_attribute || !newMapping.target_attribute_id) {
      alert('Please complete all required fields.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post('/api/create-mapping', newMapping);
      
      if (response.data.success) {
        alert('Mapping created successfully!');
        setNewMapping({
          source_system_id: '',
          source_attribute: '',
          target_attribute_id: '',
          transformation_logic: '',
          created_by: 'dashboard_user'
        });
        setShowAddForm(false);
        fetchMappings();
      } else {
        alert('Error creating mapping: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      alert('Error creating mapping. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateMapping = async (mappingId) => {
    try {
      setValidatingMapping(mappingId);
      const response = await axios.get(`/api/validate-mapping/${mappingId}`);
      
      if (response.data.success) {
        alert(`Mapping validated successfully! Confidence: ${(response.data.confidence_score * 100).toFixed(1)}%`);
        fetchMappings(); // Refresh to show updated status
      } else {
        alert('Error validating mapping: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error validating mapping:', error);
      alert('Error validating mapping. Check console for details.');
    } finally {
      setValidatingMapping(null);
    }
  };

  const viewMappingDetails = (mapping) => {
    setSelectedMapping(mapping);
  };

  const closeMappingDetails = () => {
    setSelectedMapping(null);
  };

  const suggestMappings = async () => {
    if (!newMapping.source_system_id) {
      alert('Please select a source system first.');
      return;
    }
    
    try {
      setLoadingSuggestions(true);
      const response = await axios.get(
        `/api/suggest-mappings/${newMapping.source_system_id}?use_ml=${useMachineLearning}`
      );
      
      if (response.data.success) {
        setSuggestedMappings(response.data.suggested_mappings || []);
      } else {
        alert('Error suggesting mappings: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error suggesting mappings:', error);
      alert('Error suggesting mappings. Check console for details.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion) => {
    setNewMapping({
      source_system_id: suggestion.source_system_id,
      source_attribute: suggestion.source_attribute,
      target_attribute_id: suggestion.target_attribute_id,
      transformation_logic: suggestion.transformation_logic,
      created_by: 'dashboard_user'
    });
  };

  const getAvailableSourceAttributes = () => {
    const sourceId = parseInt(newMapping.source_system_id, 10);
    const selectedSource = sourceSystems.find(source => source.id === sourceId);
    
    if (!selectedSource || !selectedSource.attributes) {
      return [];
    }
    
    return selectedSource.attributes || [];
  };

  return (
    <div className="data-mappings-container">
      <div className="dashboard-card mb-4">
        <div className="card-header">
          <h3 className="card-title">Data Mappings</h3>
          <div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? (
                <><i className="bi bi-x-circle"></i> Cancel</>
              ) : (
                <><i className="bi bi-plus-circle"></i> Add Mapping</>
              )}
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Filters */}
          <div className="filters mb-4">
            <div className="row">
              <div className="col-md-3">
                <select
                  className="form-select"
                  name="source_id"
                  value={filters.source_id || ''}
                  onChange={handleFilterChange}
                >
                  <option value="">All Source Systems</option>
                  {sourceSystems.map(source => (
                    <option key={source.id} value={source.id}>{source.system_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  name="target_id"
                  value={filters.target_id || ''}
                  onChange={handleFilterChange}
                >
                  <option value="">All Target Attributes</option>
                  {customerAttributes.map(attr => (
                    <option key={attr.id} value={attr.id}>{attr.attribute_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  name="status"
                  value={filters.status || ''}
                  onChange={handleFilterChange}
                >
                  <option value="">All Statuses</option>
                  <option value="validated">Validated</option>
                  <option value="proposed">Proposed</option>
                  <option value="issues">Issues</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="col-md-3">
                <button 
                  className="btn btn-outline-secondary w-100"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Add Mapping Form */}
          {showAddForm && (
            <div className="add-mapping-form mb-4 p-3 border rounded">
              <h4 className="mb-3">Create New Mapping</h4>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="source_system_id" className="form-label">Source System</label>
                      <select
                        className="form-select"
                        id="source_system_id"
                        name="source_system_id"
                        value={newMapping.source_system_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Source System</option>
                        {sourceSystems.map(source => (
                          <option key={source.id} value={source.id}>{source.system_name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="source_attribute" className="form-label">Source Attribute</label>
                      <input 
                        type="text"
                        className="form-control"
                        id="source_attribute"
                        name="source_attribute"
                        value={newMapping.source_attribute}
                        onChange={handleInputChange}
                        placeholder="Enter source attribute name"
                        required
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="target_attribute_id" className="form-label">Target Attribute</label>
                      <select
                        className="form-select"
                        id="target_attribute_id"
                        name="target_attribute_id"
                        value={newMapping.target_attribute_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Target Attribute</option>
                        {customerAttributes.map(attr => (
                          <option key={attr.id} value={attr.id}>{attr.attribute_name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="transformation_logic" className="form-label">Transformation Logic</label>
                      <textarea
                        className="form-control"
                        id="transformation_logic"
                        name="transformation_logic"
                        rows="4"
                        value={newMapping.transformation_logic}
                        onChange={handleInputChange}
                        placeholder="Enter transformation logic (optional)"
                      ></textarea>
                    </div>
                    
                    <div className="text-end">
                      <button 
                        type="button" 
                        className="btn btn-secondary me-2"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Creating...
                          </>
                        ) : (
                          'Create Mapping'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
                
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Mapping Suggestions</h5>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="mlSwitch"
                          checked={useMachineLearning}
                          onChange={() => setUseMachineLearning(!useMachineLearning)}
                        />
                        <label className="form-check-label" htmlFor="mlSwitch">
                          Use ML
                        </label>
                      </div>
                    </div>
                    <div className="card-body">
                      <button
                        className="btn btn-outline-primary mb-3 w-100"
                        onClick={suggestMappings}
                        disabled={!newMapping.source_system_id || loadingSuggestions}
                      >
                        {loadingSuggestions ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Generating Suggestions...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-lightbulb me-2"></i>
                            Suggest Mappings
                          </>
                        )}
                      </button>
                      
                      {suggestedMappings.length > 0 ? (
                        <div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}>
                          <table className="table table-sm table-hover">
                            <thead>
                              <tr>
                                <th>Source</th>
                                <th>Target</th>
                                <th>Confidence</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {suggestedMappings.map((suggestion, idx) => (
                                <tr key={idx}>
                                  <td>{suggestion.source_attribute}</td>
                                  <td>{suggestion.target_attribute_name}</td>
                                  <td>
                                    <div className="confidence-indicator">
                                      <div 
                                        className={`confidence-level confidence-${getConfidenceLevel(suggestion.confidence_score)}`}
                                        style={{ width: `${suggestion.confidence_score * 100}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-end small">
                                      {(suggestion.confidence_score * 100).toFixed(0)}%
                                    </div>
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => applySuggestion(suggestion)}
                                    >
                                      Apply
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center text-muted">
                          {loadingSuggestions ? 'Loading...' : 'No suggestions yet'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mappings List */}
          {loading && !mappings.length ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : mappings.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source System</th>
                    <th>Source Attribute</th>
                    <th>Target Attribute</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map(mapping => (
                    <tr key={mapping.id}>
                      <td>{mapping.source_system_name}</td>
                      <td>
                        <div className="text-nowrap overflow-hidden text-truncate" style={{maxWidth: '200px'}} title={mapping.source_attribute}>
                          {mapping.source_attribute}
                        </div>
                      </td>
                      <td>{mapping.target_attribute_name}</td>
                      <td>
                        <span className={`badge ${getMappingStatusClass(mapping.mapping_status)}`}>
                          {mapping.mapping_status}
                        </span>
                      </td>
                      <td>{mapping.created_by}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={() => viewMappingDetails(mapping)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleValidateMapping(mapping.id)}
                          disabled={validatingMapping === mapping.id}
                        >
                          {validatingMapping === mapping.id ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <i className="bi bi-check2"></i>
                          )}
                          {' '}Validate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              {Object.keys(filters).length > 0 ? 
                'No mappings match the current filters. Try clearing some filters.' : 
                'No mappings found. Create your first mapping to get started.'}
            </div>
          )}
        </div>
      </div>
      
      {/* Mapping Details Modal */}
      {selectedMapping && (
        <MappingDetailsModal 
          mapping={selectedMapping} 
          onClose={closeMappingDetails}
          onValidate={handleValidateMapping}
          validating={validatingMapping === selectedMapping.id}
        />
      )}
    </div>
  );
};

// Mapping Details Modal Component
const MappingDetailsModal = ({ mapping, onClose, onValidate, validating }) => {
  if (!mapping) return null;
  
  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Mapping Details</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header">
                    <h5 className="card-title">Mapping Information</h5>
                  </div>
                  <div className="card-body">
                    <table className="table table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>ID</strong></td>
                          <td>{mapping.id}</td>
                        </tr>
                        <tr>
                          <td><strong>Status</strong></td>
                          <td>
                            <span className={`badge ${getMappingStatusClass(mapping.mapping_status)}`}>
                              {mapping.mapping_status}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Created By</strong></td>
                          <td>{mapping.created_by}</td>
                        </tr>
                        <tr>
                          <td><strong>Created On</strong></td>
                          <td>{mapping.created_at ? new Date(mapping.created_at).toLocaleString() : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Last Updated</strong></td>
                          <td>{mapping.updated_at ? new Date(mapping.updated_at).toLocaleString() : 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header">
                    <h5 className="card-title">Mapping Details</h5>
                  </div>
                  <div className="card-body">
                    <table className="table table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Source System</strong></td>
                          <td>{mapping.source_system_name}</td>
                        </tr>
                        <tr>
                          <td><strong>Source Attribute</strong></td>
                          <td>{mapping.source_attribute}</td>
                        </tr>
                        <tr>
                          <td><strong>Target Attribute</strong></td>
                          <td>{mapping.target_attribute_name}</td>
                        </tr>
                        {mapping.confidence_score !== undefined && (
                          <tr>
                            <td><strong>Confidence Score</strong></td>
                            <td>
                              <div className="confidence-indicator">
                                <div 
                                  className={`confidence-level confidence-${getConfidenceLevel(mapping.confidence_score)}`}
                                  style={{ width: `${mapping.confidence_score * 100}%` }}
                                ></div>
                              </div>
                              <div className="text-end small">
                                {(mapping.confidence_score * 100).toFixed(1)}%
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title">Actions</h5>
                  </div>
                  <div className="card-body">
                    <button 
                      className="btn btn-primary w-100"
                      onClick={() => onValidate(mapping.id)}
                      disabled={validating}
                    >
                      {validating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Validating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle me-2"></i>
                          Validate Mapping
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="row mt-3">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title">Transformation Logic</h5>
                  </div>
                  <div className="card-body">
                    <pre className="p-3 bg-light border rounded" style={{maxHeight: '200px', overflow: 'auto'}}>
                      {mapping.transformation_logic || '// No transformation logic specified'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </div>
  );
};

// Helper functions
const getConfidenceLevel = (value) => {
  if (value >= 0.8) return 'high';
  if (value >= 0.5) return 'medium';
  return 'low';
};

const getMappingStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'validated': return 'bg-success';
    case 'proposed': return 'bg-warning';
    case 'issues': return 'bg-danger';
    case 'pending': return 'bg-info';
    default: return 'bg-secondary';
  }
};