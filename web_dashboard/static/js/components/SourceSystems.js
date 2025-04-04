// Customer360 Dashboard - Source Systems Component

const { useState, useEffect } = React;

const SourceSystems = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scanningSource, setScanningSource] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [newSource, setNewSource] = useState({
    name: '',
    description: '',
    owner: ''
  });

  useEffect(() => {
    fetchSourceSystems();
  }, []);

  const fetchSourceSystems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/source-systems');
      if (response.data.success) {
        setSources(response.data.source_systems || []);
      } else {
        console.error('Error fetching source systems:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching source systems:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSource = async (sourceId) => {
    try {
      setScanningSource(sourceId);
      const response = await axios.get(`/api/scan-source/${sourceId}`);
      
      if (response.data.success) {
        alert(`Source system scanned successfully! Found ${response.data.attribute_count || 0} attributes.`);
        fetchSourceSystems(); // Refresh the list to show updated status
      } else {
        alert('Error scanning source: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error scanning source:', error);
      alert('Error scanning source system. Check console for details.');
    } finally {
      setScanningSource(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSource(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newSource.name.trim()) {
      alert('Please enter a name for the source system.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post('/api/register-source', newSource);
      
      if (response.data.success) {
        alert('Source system registered successfully!');
        setNewSource({
          name: '',
          description: '',
          owner: ''
        });
        setShowAddForm(false);
        fetchSourceSystems();
      } else {
        alert('Error registering source system: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error registering source system:', error);
      alert('Error registering source system. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const viewSourceDetails = (source) => {
    setSelectedSource(source);
  };

  const closeSourceDetails = () => {
    setSelectedSource(null);
  };

  return (
    <div className="source-systems-container">
      <div className="dashboard-card mb-4">
        <div className="card-header">
          <h3 className="card-title">Source Systems</h3>
          <div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? (
                <><i className="bi bi-x-circle"></i> Cancel</>
              ) : (
                <><i className="bi bi-plus-circle"></i> Add Source</>
              )}
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Add Source Form */}
          {showAddForm && (
            <div className="add-source-form mb-4 p-3 border rounded">
              <h4 className="mb-3">Register New Source System</h4>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">System Name</label>
                  <input 
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={newSource.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea 
                    className="form-control"
                    id="description"
                    name="description"
                    rows="3"
                    value={newSource.description}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="owner" className="form-label">System Owner</label>
                  <input 
                    type="text"
                    className="form-control"
                    id="owner"
                    name="owner"
                    value={newSource.owner}
                    onChange={handleInputChange}
                  />
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
                        Registering...
                      </>
                    ) : (
                      'Register Source'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Source Systems List */}
          {loading && !sources.length ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : sources.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Owner</th>
                    <th>Registration Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(source => (
                    <tr key={source.id}>
                      <td>{source.system_name}</td>
                      <td>
                        {source.description.length > 100 ? 
                          `${source.description.substring(0, 100)}...` : 
                          source.description}
                      </td>
                      <td>{source.owner}</td>
                      <td>{new Date(source.registration_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${source.is_active ? 'bg-success' : 'bg-warning'}`}>
                          {source.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={() => viewSourceDetails(source)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleScanSource(source.id)}
                          disabled={scanningSource === source.id}
                        >
                          {scanningSource === source.id ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <i className="bi bi-cloud-arrow-down"></i>
                          )}
                          {' '}Scan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              No source systems found. Add your first source system to get started.
            </div>
          )}
        </div>
      </div>
      
      {/* Source System Details Modal */}
      {selectedSource && (
        <SourceDetailsModal 
          source={selectedSource} 
          onClose={closeSourceDetails}
          onScan={handleScanSource}
          scanning={scanningSource === selectedSource.id}
        />
      )}
    </div>
  );
};

// Source Details Modal Component
const SourceDetailsModal = ({ source, onClose, onScan, scanning }) => {
  const [sourceData, setSourceData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Here you would fetch detailed information about the source
    // For now, we'll just use what we have
    setSourceData(source);
    setLoading(false);
  }, [source]);
  
  if (!source) return null;
  
  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Source System: {source.system_name}</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="row">
                <div className="col-md-6">
                  <div className="card mb-3">
                    <div className="card-header">
                      <h5 className="card-title">System Information</h5>
                    </div>
                    <div className="card-body">
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td><strong>ID</strong></td>
                            <td>{sourceData.id}</td>
                          </tr>
                          <tr>
                            <td><strong>Name</strong></td>
                            <td>{sourceData.system_name}</td>
                          </tr>
                          <tr>
                            <td><strong>Owner</strong></td>
                            <td>{sourceData.owner}</td>
                          </tr>
                          <tr>
                            <td><strong>Registration Date</strong></td>
                            <td>{new Date(sourceData.registration_date).toLocaleDateString()}</td>
                          </tr>
                          <tr>
                            <td><strong>Status</strong></td>
                            <td>
                              <span className={`badge ${sourceData.is_active ? 'bg-success' : 'bg-warning'}`}>
                                {sourceData.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card mb-3">
                    <div className="card-header">
                      <h5 className="card-title">Description</h5>
                    </div>
                    <div className="card-body">
                      <p>{sourceData.description || 'No description provided'}</p>
                    </div>
                  </div>
                  
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title">Actions</h5>
                    </div>
                    <div className="card-body">
                      <button 
                        className="btn btn-primary w-100 mb-2"
                        onClick={() => onScan(sourceData.id)}
                        disabled={scanning}
                      >
                        {scanning ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Scanning...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-down me-2"></i>
                            Scan Source System
                          </>
                        )}
                      </button>
                      <a 
                        href="#mappings"
                        className="btn btn-outline-primary w-100"
                        onClick={onClose}
                      >
                        <i className="bi bi-link me-2"></i>
                        View Associated Mappings
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
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