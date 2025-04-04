// Customer360 Dashboard - Data Lineage Component

const { useState, useEffect, useRef } = React;

const DataLineage = () => {
  const [lineageData, setLineageData] = useState(null);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [customerAttributes, setCustomerAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const [issuesData, setIssuesData] = useState(null);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [activeTab, setActiveTab] = useState('visualization');
  const [fixResult, setFixResult] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchCustomerAttributes();
  }, []);

  useEffect(() => {
    if (selectedAttribute) {
      fetchDataLineage(selectedAttribute);
      fetchAttributeIssues(selectedAttribute);
    }
  }, [selectedAttribute]);

  const fetchCustomerAttributes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/customer-attributes');
      if (response.data.success) {
        setCustomerAttributes(response.data.attributes || []);
        
        // Select the first attribute by default
        if (response.data.attributes && response.data.attributes.length > 0) {
          setSelectedAttribute(response.data.attributes[0].attribute_name);
        }
      } else {
        console.error('Error fetching customer attributes:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching customer attributes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataLineage = async (attribute) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/data-lineage?attribute=${attribute}`);
      if (response.data.success) {
        setLineageData(response.data.lineage || {});
        setMetadata(response.data.metadata || null);
      } else {
        console.error('Error fetching data lineage:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching data lineage:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributeIssues = async (attribute) => {
    try {
      const response = await axios.get(`/api/data-quality/fields?attribute=${attribute}`);
      if (response.data.success) {
        setIssuesData(response.data.issues || []);
      } else {
        console.error('Error fetching attribute issues:', response.data.error);
        setIssuesData([]);
      }
    } catch (error) {
      console.error('Error fetching attribute issues:', error);
      setIssuesData([]);
    }
  };

  const handleAttributeChange = (e) => {
    setSelectedAttribute(e.target.value);
    setFixResult(null); // Clear previous fix results when changing attribute
  };

  const handleFixIssue = (issue) => {
    setSelectedIssue(issue);
    setShowFixDialog(true);
  };

  const handleApplyFix = async (issue, fixOption) => {
    try {
      setLoading(true);
      setShowFixDialog(false);
      
      const response = await axios.post('/api/fix-data-quality', {
        issue_id: issue.issue_id,
        attribute: selectedAttribute,
        fix_type: fixOption.type,
        parameters: {}
      });
      
      if (response.data.success) {
        setFixResult({
          success: true,
          message: `Successfully fixed ${response.data.affected_records} records`,
          details: response.data.changes || [],
          requiresMapping: response.data.requires_mapping_update || false
        });
        
        // Refresh data lineage and issues after fix
        fetchDataLineage(selectedAttribute);
        fetchAttributeIssues(selectedAttribute);
      } else {
        setFixResult({
          success: false,
          message: response.data.error || 'Failed to apply fix',
          details: []
        });
      }
    } catch (error) {
      console.error('Error applying fix:', error);
      setFixResult({
        success: false,
        message: 'An error occurred while applying the fix',
        details: []
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseFixDialog = () => {
    setShowFixDialog(false);
  };

  if (loading && !customerAttributes.length) {
    return (
      <div className="d-flex justify-content-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="data-lineage-container">
      <div className="dashboard-card mb-4">
        <div className="card-header">
          <h3 className="card-title">Data Lineage Visualization</h3>
          <div className="d-flex">
            <select 
              className="form-select"
              value={selectedAttribute || ''}
              onChange={handleAttributeChange}
            >
              <option value="">Select an attribute</option>
              {customerAttributes.map(attr => (
                <option key={attr.id} value={attr.attribute_name}>
                  {attr.attribute_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="card-body">
          {/* Tabs for different views */}
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'visualization' ? 'active' : ''}`}
                onClick={() => setActiveTab('visualization')}
              >
                Visualization
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'issues' ? 'active' : ''}`}
                onClick={() => setActiveTab('issues')}
                disabled={!issuesData || issuesData.length === 0}
              >
                Issues {issuesData && issuesData.length > 0 && 
                  <span className="badge bg-danger ms-1">{issuesData.length}</span>
                }
              </button>
            </li>
          </ul>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'visualization' && (
                <>
                  {selectedAttribute && lineageData && metadata ? (
                    <div className="mb-4">
                      <LineageVisualization 
                        lineageData={lineageData} 
                        metadata={metadata}
                        selectedAttribute={selectedAttribute} 
                      />

                      {/* Quality metrics */}
                      {metadata && metadata.quality_metrics && (
                        <div className="mt-4 pt-3 border-top">
                          <h5>Data Quality Metrics</h5>
                          <div className="row align-items-center">
                            <div className="col-md-2">
                              <div className="text-center">
                                <div className="h2 mb-0">
                                  {(metadata.quality_metrics.completeness * 100).toFixed(1)}%
                                </div>
                                <div className="text-muted">Completeness</div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="progress-bar">
                                <div 
                                  className="progress bg-primary"
                                  style={{width: `${metadata.quality_metrics.completeness * 100}%`}}
                                ></div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="row">
                                <div className="col-6">
                                  <div className="small text-muted">Total Records</div>
                                  <div className="fw-bold">
                                    {metadata.quality_metrics.total_rows}
                                  </div>
                                </div>
                                <div className="col-6">
                                  <div className="small text-muted">Distinct Values</div>
                                  <div className="fw-bold">
                                    {metadata.quality_metrics.distinct_count}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Fix result notification */}
                      {fixResult && (
                        <div className={`alert mt-4 ${fixResult.success ? 'alert-success' : 'alert-danger'}`}>
                          <div className="d-flex">
                            <div>
                              <i className={`bi ${fixResult.success ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                            </div>
                            <div>
                              <h5 className="mb-1">{fixResult.message}</h5>
                              {fixResult.details && fixResult.details.length > 0 && (
                                <ul className="mb-0">
                                  {fixResult.details.map((detail, idx) => (
                                    <li key={idx}>{detail}</li>
                                  ))}
                                </ul>
                              )}
                              {fixResult.requiresMapping && (
                                <div className="mt-2">
                                  <a href="#mappings" className="btn btn-sm btn-outline-primary">
                                    Go to Mappings
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      Select a customer attribute to view its data lineage
                    </div>
                  )}
                </>
              )}

              {activeTab === 'details' && selectedAttribute && lineageData && (
                <LineageDetailsTable 
                  lineageDetails={lineageData[selectedAttribute]} 
                  attributeName={selectedAttribute} 
                />
              )}
              
              {activeTab === 'issues' && selectedAttribute && issuesData && (
                <div className="data-quality-issues mt-2">
                  <h5 className="mb-3">Data Quality Issues for {selectedAttribute}</h5>
                  
                  {issuesData.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Severity</th>
                            <th>Description</th>
                            <th>Affected Records</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {issuesData.map(issue => (
                            <tr key={issue.issue_id}>
                              <td>{issue.issue_type}</td>
                              <td>
                                <span className={`badge bg-${getSeverityClass(issue.severity)}`}>
                                  {issue.severity}
                                </span>
                              </td>
                              <td>{issue.description}</td>
                              <td>{issue.affected_records}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleFixIssue(issue)}
                                >
                                  Fix
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-success">
                      No data quality issues found for this attribute.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Fix Dialog */}
      {showFixDialog && selectedIssue && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Fix Data Quality Issue</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCloseFixDialog}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <h6>Issue</h6>
                  <p>{selectedIssue.description}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Available Fix Options</h6>
                  <div className="list-group">
                    {selectedIssue.fix_options.map(option => (
                      <button
                        key={option.type}
                        className="list-group-item list-group-item-action"
                        onClick={() => handleApplyFix(selectedIssue, option)}
                      >
                        <div className="d-flex w-100 justify-content-between">
                          <h6 className="mb-1">{option.name}</h6>
                        </div>
                        <p className="mb-1">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCloseFixDialog}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LineageVisualization = ({ lineageData, metadata, selectedAttribute }) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!lineageData || !selectedAttribute || !lineageData[selectedAttribute] || !metadata) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Clear any existing content
    container.innerHTML = '';

    // Render advanced flow visualization
    renderAdvancedLineage(container, metadata);

  }, [lineageData, metadata, selectedAttribute]);

  const renderAdvancedLineage = (container, metadata) => {
    // Create overall container with horizontal scroll if needed
    const flowContainer = document.createElement('div');
    flowContainer.className = 'lineage-flow-container';
    flowContainer.style.display = 'flex';
    flowContainer.style.overflowX = 'auto';
    flowContainer.style.padding = '20px 10px';
    flowContainer.style.minHeight = '350px';
    flowContainer.style.alignItems = 'center';
    
    // Get flow stages from metadata
    const flowStages = metadata.flow_stages || [];
    
    // Create and add each stage
    flowStages.forEach((stage, stageIndex) => {
      const stageContainer = document.createElement('div');
      stageContainer.className = 'lineage-stage';
      stageContainer.style.margin = '0 15px';
      stageContainer.style.minWidth = '200px';
      
      // Add stage header
      const stageHeader = document.createElement('div');
      stageHeader.className = 'lineage-stage-header';
      stageHeader.style.textAlign = 'center';
      stageHeader.style.marginBottom = '10px';
      stageHeader.style.fontWeight = 'bold';
      stageHeader.style.color = '#666';
      stageHeader.textContent = stage.name;
      stageContainer.appendChild(stageHeader);
      
      // Add nodes for this stage
      const nodesContainer = document.createElement('div');
      nodesContainer.style.display = 'flex';
      nodesContainer.style.flexDirection = 'column';
      nodesContainer.style.gap = '15px';
      
      stage.nodes.forEach(node => {
        const nodeDiv = createNodeElement(node, stageIndex, flowStages.length);
        nodesContainer.appendChild(nodeDiv);
      });
      
      stageContainer.appendChild(nodesContainer);
      flowContainer.appendChild(stageContainer);
      
      // Add connector if not the last stage
      if (stageIndex < flowStages.length - 1) {
        const connector = document.createElement('div');
        connector.className = 'lineage-connector';
        connector.innerHTML = '<i class="bi bi-arrow-right" style="font-size: 1.5rem; color: #aaa;"></i>';
        flowContainer.appendChild(connector);
      }
    });
    
    container.appendChild(flowContainer);
  };

  const createNodeElement = (node, stageIndex, totalStages) => {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'lineage-node';
    nodeDiv.style.padding = '12px';
    nodeDiv.style.borderRadius = '6px';
    nodeDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    nodeDiv.style.transition = 'all 0.2s ease';
    nodeDiv.style.cursor = 'pointer';
    
    // Style based on node type
    if (stageIndex === 0) { // Source system
      nodeDiv.style.backgroundColor = '#e3f2fd';
      nodeDiv.style.borderLeft = '4px solid #2196f3';
      
      // Source system header
      const header = document.createElement('div');
      header.style.fontWeight = 'bold';
      header.textContent = node.name;
      nodeDiv.appendChild(header);
      
      // Add source attributes if available
      if (node.attributes && node.attributes.length) {
        const attrsList = document.createElement('ul');
        attrsList.style.paddingLeft = '15px';
        attrsList.style.marginTop = '8px';
        attrsList.style.marginBottom = '0';
        
        node.attributes.forEach(attr => {
          const attrItem = document.createElement('li');
          attrItem.textContent = attr.name;
          
          // Add status indicator
          if (attr.status) {
            const statusDot = document.createElement('span');
            statusDot.className = `status-dot ${getMappingStatusClass(attr.status)}`;
            statusDot.style.display = 'inline-block';
            statusDot.style.width = '8px';
            statusDot.style.height = '8px';
            statusDot.style.borderRadius = '50%';
            statusDot.style.marginRight = '5px';
            attrItem.prepend(statusDot);
          }
          
          attrsList.appendChild(attrItem);
        });
        
        nodeDiv.appendChild(attrsList);
      }
      
    } else if (stageIndex === totalStages - 1) { // Target
      nodeDiv.style.backgroundColor = '#e8f5e9';
      nodeDiv.style.borderLeft = '4px solid #4caf50';
      nodeDiv.style.textAlign = 'center';
      
      const header = document.createElement('div');
      header.style.fontWeight = 'bold';
      header.textContent = node.name;
      nodeDiv.appendChild(header);
      
      // Show sources count if available
      if (node.sources_count) {
        const sourcesInfo = document.createElement('div');
        sourcesInfo.style.fontSize = '0.9rem';
        sourcesInfo.style.color = '#666';
        sourcesInfo.style.marginTop = '5px';
        sourcesInfo.textContent = `${node.sources_count} source${node.sources_count > 1 ? 's' : ''}`;
        nodeDiv.appendChild(sourcesInfo);
      }
      
    } else { // Transformation
      nodeDiv.style.backgroundColor = '#fff3e0';
      nodeDiv.style.borderLeft = '4px solid #ff9800';
      
      const header = document.createElement('div');
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '5px';
      header.textContent = node.name;
      nodeDiv.appendChild(header);
      
      // Show abbreviated transformation logic
      const logic = document.createElement('div');
      logic.style.fontSize = '0.85rem';
      logic.style.fontFamily = 'monospace';
      logic.style.whiteSpace = 'nowrap';
      logic.style.overflow = 'hidden';
      logic.style.textOverflow = 'ellipsis';
      logic.style.maxWidth = '190px';
      logic.textContent = node.logic?.substring(0, 50) + (node.logic?.length > 50 ? '...' : '');
      logic.title = node.logic; // Show full logic on hover
      nodeDiv.appendChild(logic);
      
      // Add status indicator
      if (node.status) {
        const statusBadge = document.createElement('div');
        statusBadge.className = `badge bg-${getMappingStatusClass(node.status)}`;
        statusBadge.style.marginTop = '8px';
        statusBadge.textContent = node.status;
        nodeDiv.appendChild(statusBadge);
      }
    }
    
    // Add hover effect
    nodeDiv.addEventListener('mouseenter', () => {
      nodeDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      nodeDiv.style.transform = 'translateY(-2px)';
    });
    
    nodeDiv.addEventListener('mouseleave', () => {
      nodeDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      nodeDiv.style.transform = 'translateY(0)';
    });
    
    return nodeDiv;
  };
  
  if (!lineageData || !selectedAttribute || !lineageData[selectedAttribute] || !metadata) {
    return (
      <div className="alert alert-info">
        No lineage data found for {selectedAttribute}
      </div>
    );
  }
  
  return (
    <div className="lineage-visualization">
      <div className="lineage-container" ref={containerRef}>
        {/* Lineage visualization will be rendered here */}
      </div>
    </div>
  );
};

const LineageDetailsTable = ({ lineageDetails, attributeName }) => {
  if (!lineageDetails || !lineageDetails.length) {
    return (
      <div className="alert alert-info">
        No lineage details available for {attributeName}
      </div>
    );
  }
  
  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Source System</th>
            <th>Source Attribute</th>
            <th>Transformation Logic</th>
            <th>Status</th>
            <th>Last Validated</th>
            <th>Sample Values</th>
          </tr>
        </thead>
        <tbody>
          {lineageDetails.map((details, index) => (
            <tr key={index}>
              <td>{details.source_system}</td>
              <td>{details.source_attribute}</td>
              <td>
                <div style={{ maxHeight: '80px', overflow: 'auto' }}>
                  <pre style={{ fontSize: '0.85rem', margin: 0 }}>
                    {details.transformation_logic || 'No transformation logic'}
                  </pre>
                </div>
              </td>
              <td>
                <span className={`badge bg-${getMappingStatusClass(details.status)}`}>
                  {details.status}
                </span>
              </td>
              <td>{details.last_validated || 'Never'}</td>
              <td>
                {details.sample_values && details.sample_values.length > 0 ? (
                  <ul className="list-unstyled mb-0">
                    {details.sample_values.map((value, i) => (
                      <li key={i}><small>{String(value)}</small></li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted">No samples</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Helper function to get appropriate class for mapping status
const getMappingStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'validated': return 'success';
    case 'proposed': return 'warning';
    case 'issues': return 'danger';
    case 'pending': return 'info';
    default: return 'secondary';
  }
};

// Helper function to get appropriate class for severity
const getSeverityClass = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'high': return 'danger';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'secondary';
  }
};

// Export the DataLineage component
export default DataLineage;