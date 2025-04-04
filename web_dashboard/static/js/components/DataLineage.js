// Customer360 Dashboard - Data Lineage Component

const { useState, useEffect, useRef } = React;

const DataLineage = () => {
  const [lineageData, setLineageData] = useState(null);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [customerAttributes, setCustomerAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchCustomerAttributes();
  }, []);

  useEffect(() => {
    if (selectedAttribute) {
      fetchDataLineage(selectedAttribute);
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
      } else {
        console.error('Error fetching data lineage:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching data lineage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttributeChange = (e) => {
    setSelectedAttribute(e.target.value);
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
          <div>
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
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {selectedAttribute && lineageData ? (
                <LineageVisualization 
                  lineageData={lineageData} 
                  selectedAttribute={selectedAttribute} 
                />
              ) : (
                <div className="alert alert-info">
                  Select a customer attribute to view its data lineage
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedAttribute && lineageData && lineageData[selectedAttribute] && (
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Lineage Details: {selectedAttribute}</h3>
          </div>
          <div className="card-body">
            <LineageDetailsTable 
              lineageDetails={lineageData[selectedAttribute]} 
              attributeName={selectedAttribute} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

const LineageVisualization = ({ lineageData, selectedAttribute }) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!lineageData || !selectedAttribute || !lineageData[selectedAttribute]) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Clear any existing content
    container.innerHTML = '';

    const attributeLineage = lineageData[selectedAttribute];
    renderLineageGraph(container, selectedAttribute, attributeLineage);

  }, [lineageData, selectedAttribute]);

  const renderLineageGraph = (container, targetAttribute, lineageData) => {
    // Set up SVG for D3
    const width = container.clientWidth;
    const height = 400;
    
    // Create a basic visualization using HTML/CSS
    const targetDiv = document.createElement('div');
    targetDiv.className = 'lineage-target-node';
    targetDiv.style.textAlign = 'center';
    targetDiv.style.padding = '10px';
    targetDiv.style.margin = '10px auto';
    targetDiv.style.maxWidth = '200px';
    targetDiv.style.backgroundColor = 'rgb(63, 81, 181)';
    targetDiv.style.color = 'white';
    targetDiv.style.borderRadius = '4px';
    targetDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    targetDiv.innerHTML = `<strong>Target:</strong> ${targetAttribute}`;
    container.appendChild(targetDiv);
    
    // Create connections line
    const connectorLine = document.createElement('div');
    connectorLine.style.border = '2px dashed #aaa';
    connectorLine.style.margin = '10px auto';
    connectorLine.style.height = '30px';
    connectorLine.style.width = '0';
    container.appendChild(connectorLine);
    
    // Create source nodes container
    const sourcesContainer = document.createElement('div');
    sourcesContainer.style.display = 'flex';
    sourcesContainer.style.flexWrap = 'wrap';
    sourcesContainer.style.justifyContent = 'center';
    sourcesContainer.style.gap = '20px';
    container.appendChild(sourcesContainer);
    
    // Add source nodes
    lineageData.forEach((source, index) => {
      const sourceDiv = document.createElement('div');
      sourceDiv.className = 'lineage-source-node';
      sourceDiv.style.padding = '10px';
      sourceDiv.style.backgroundColor = '#ffffff';
      sourceDiv.style.border = '1px solid #ddd';
      sourceDiv.style.borderRadius = '4px';
      sourceDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      sourceDiv.style.minWidth = '180px';
      sourceDiv.style.color = '#333';
      
      const statusClass = getMappingStatusClass(source.status);
      
      sourceDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${source.source_system}</div>
        <div>${source.source_attribute}</div>
        <div class="badge bg-${statusClass} mt-2">${source.status}</div>
      `;
      
      sourcesContainer.appendChild(sourceDiv);
    });
  };
  
  if (!lineageData || !selectedAttribute || !lineageData[selectedAttribute] || !lineageData[selectedAttribute].length) {
    return (
      <div className="alert alert-info">
        No lineage data found for {selectedAttribute}
      </div>
    );
  }
  
  return (
    <div className="lineage-container" ref={containerRef}>
      {/* Lineage visualization will be rendered here */}
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