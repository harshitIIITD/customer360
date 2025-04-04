// Customer360 Dashboard - Main Dashboard Component

const { useState, useEffect } = React;
// Import axios for API calls
const axios = window.axios || axios;

const Dashboard = ({ systemSummary }) => {
  const [qualityData, setQualityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Load data quality metrics
    fetchDataQualityMetrics();
  }, []);

  useEffect(() => {
    // Set up Chart.js chart when the data is loaded
    if (systemSummary?.mapping_status && !loading) {
      setupMappingChart(systemSummary.mapping_status);
    }
  }, [systemSummary, loading]);

  const fetchDataQualityMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/data-quality');
      if (response.data.success) {
        setQualityData(response.data.metrics || {});
      } else {
        console.error('Error fetching data quality metrics:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching data quality metrics:', error);
      setError('Failed to load data quality metrics');
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall data quality score
  const calculateOverallScore = () => {
    if (!qualityData) return 0;
    
    const metrics = [
      qualityData.completeness || 0,
      qualityData.accuracy || 0,
      qualityData.consistency || 0,
      qualityData.timeliness || 0
    ];
    
    return metrics.reduce((sum, metric) => sum + metric, 0) / metrics.length;
  };

  // Get color class based on score
  const getScoreColorClass = (score) => {
    if (score >= 0.8) return 'text-success';
    if (score >= 0.6) return 'text-warning';
    return 'text-danger';
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
  };

  return (
    <div className="dashboard-container">
      <div className="mb-4">
        <h2 className="mb-3">Dashboard</h2>
        <p className="text-muted">
          Welcome to the Customer360 Dashboard. Get an overview of your data integration status and quality metrics.
        </p>
      </div>

      {/* System Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-4">
          <div className="stat-card h-100">
            <div className="d-flex justify-content-between">
              <div>
                <div className="stat-value">{formatNumber(systemSummary?.customer_records || 0)}</div>
                <div className="stat-label">Customer Records</div>
              </div>
              <div className="stat-icon">
                <i className="bi bi-people"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-4">
          <div className="stat-card h-100">
            <div className="d-flex justify-content-between">
              <div>
                <div className="stat-value">{systemSummary?.source_systems || 0}</div>
                <div className="stat-label">Source Systems</div>
              </div>
              <div className="stat-icon">
                <i className="bi bi-database"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-4">
          <div className="stat-card h-100">
            <div className="d-flex justify-content-between">
              <div>
                <div className="stat-value">{systemSummary?.customer_attributes || 0}</div>
                <div className="stat-label">Target Attributes</div>
              </div>
              <div className="stat-icon">
                <i className="bi bi-tags"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-4">
          <div className="stat-card h-100">
            <div className="d-flex justify-content-between">
              <div>
                <div className="stat-value">{systemSummary?.data_mappings || 0}</div>
                <div className="stat-label">Data Mappings</div>
              </div>
              <div className="stat-icon">
                <i className="bi bi-arrows-angle-contract"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Overview */}
      <div className="row mb-4">
        <div className="col-lg-6">
          <div className="dashboard-card h-100">
            <div className="card-header">
              <h3 className="card-title">Data Quality Score</h3>
              <a href="#quality" className="btn btn-sm btn-outline-primary">View Details</a>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="alert alert-danger">{error}</div>
              ) : (
                <div className="row">
                  <div className="col-md-5 text-center">
                    <div className="display-1 mb-3 fw-bold" style={{ fontSize: '5rem' }}>
                      <span className={getScoreColorClass(calculateOverallScore())}>
                        {(calculateOverallScore() * 100).toFixed(1)}%
                      </span>
                    </div>
                    <h5 className="text-muted mb-0">Overall Score</h5>
                  </div>
                  <div className="col-md-7">
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Completeness</span>
                        <span className="fw-bold">{((qualityData?.completeness || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="quality-indicator">
                        <div 
                          className={`quality-level quality-${(qualityData?.completeness || 0) >= 0.8 ? 'high' : (qualityData?.completeness || 0) >= 0.6 ? 'medium' : 'low'}`}
                          style={{ width: `${(qualityData?.completeness || 0) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Accuracy</span>
                        <span className="fw-bold">{((qualityData?.accuracy || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="quality-indicator">
                        <div 
                          className={`quality-level quality-${(qualityData?.accuracy || 0) >= 0.8 ? 'high' : (qualityData?.accuracy || 0) >= 0.6 ? 'medium' : 'low'}`}
                          style={{ width: `${(qualityData?.accuracy || 0) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Consistency</span>
                        <span className="fw-bold">{((qualityData?.consistency || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="quality-indicator">
                        <div 
                          className={`quality-level quality-${(qualityData?.consistency || 0) >= 0.8 ? 'high' : (qualityData?.consistency || 0) >= 0.6 ? 'medium' : 'low'}`}
                          style={{ width: `${(qualityData?.consistency || 0) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="d-flex justify-content-between mb-1">
                        <span>Timeliness</span>
                        <span className="fw-bold">{((qualityData?.timeliness || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="quality-indicator">
                        <div 
                          className={`quality-level quality-${(qualityData?.timeliness || 0) >= 0.8 ? 'high' : (qualityData?.timeliness || 0) >= 0.6 ? 'medium' : 'low'}`}
                          style={{ width: `${(qualityData?.timeliness || 0) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="dashboard-card h-100">
            <div className="card-header">
              <h3 className="card-title">Mapping Status</h3>
              <a href="#mappings" className="btn btn-sm btn-outline-primary">View Mappings</a>
            </div>
            <div className="card-body">
              {systemSummary?.mapping_status ? (
                <div>
                  <div className="row mb-4">
                    <div className="col-6 col-md-3 text-center mb-3">
                      <div className="display-6 mb-1 fw-bold text-success">
                        {systemSummary.mapping_status.validated || 0}
                      </div>
                      <div className="small text-muted">Validated</div>
                    </div>
                    <div className="col-6 col-md-3 text-center mb-3">
                      <div className="display-6 mb-1 fw-bold text-warning">
                        {systemSummary.mapping_status.proposed || 0}
                      </div>
                      <div className="small text-muted">Proposed</div>
                    </div>
                    <div className="col-6 col-md-3 text-center mb-3">
                      <div className="display-6 mb-1 fw-bold text-danger">
                        {systemSummary.mapping_status.issues || 0}
                      </div>
                      <div className="small text-muted">Issues</div>
                    </div>
                    <div className="col-6 col-md-3 text-center mb-3">
                      <div className="display-6 mb-1 fw-bold text-info">
                        {systemSummary.mapping_status.pending || 0}
                      </div>
                      <div className="small text-muted">Pending</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="chart-container" style={{ height: '200px' }}>
                      <canvas id="mappingStatusChart"></canvas>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <div className="text-center text-muted">
                    <i className="bi bi-exclamation-circle" style={{ fontSize: '2rem' }}></i>
                    <p className="mt-3">No mapping status data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
              <div></div>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-success me-3">
                      <i className="bi bi-check-circle"></i>
                    </span>
                    <div>
                      <div className="fw-bold">Customer 360 Build Completed</div>
                      <div className="text-muted">Successfully processed 24,305 customer records</div>
                    </div>
                  </div>
                  <small className="text-muted">2 hours ago</small>
                </li>
                
                <li className="list-group-item d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-primary me-3">
                      <i className="bi bi-arrows-angle-contract"></i>
                    </span>
                    <div>
                      <div className="fw-bold">New Mappings Created</div>
                      <div className="text-muted">5 new mappings added from CRM source system</div>
                    </div>
                  </div>
                  <small className="text-muted">4 hours ago</small>
                </li>
                
                <li className="list-group-item d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-info me-3">
                      <i className="bi bi-database"></i>
                    </span>
                    <div>
                      <div className="fw-bold">Source System Added</div>
                      <div className="text-muted">New source system "Marketing Analytics Platform" registered</div>
                    </div>
                  </div>
                  <small className="text-muted">1 day ago</small>
                </li>
                
                <li className="list-group-item d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-warning me-3">
                      <i className="bi bi-shield-exclamation"></i>
                    </span>
                    <div>
                      <div className="fw-bold">Data Quality Alert</div>
                      <div className="text-muted">Completeness score dropped below threshold for Email attribute</div>
                    </div>
                  </div>
                  <small className="text-muted">2 days ago</small>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="row">
        <div className="col-12">
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
              <div></div>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 col-md-3 mb-3">
                  <a href="#customer360" className="btn btn-outline-primary w-100 py-3">
                    <i className="bi bi-people d-block mb-2" style={{ fontSize: '1.5rem' }}></i>
                    View Customer Data
                  </a>
                </div>
                
                <div className="col-6 col-md-3 mb-3">
                  <a href="#sources" className="btn btn-outline-primary w-100 py-3">
                    <i className="bi bi-plus-circle d-block mb-2" style={{ fontSize: '1.5rem' }}></i>
                    Add Source System
                  </a>
                </div>
                
                <div className="col-6 col-md-3 mb-3">
                  <a href="#mappings" className="btn btn-outline-primary w-100 py-3">
                    <i className="bi bi-arrows-angle-contract d-block mb-2" style={{ fontSize: '1.5rem' }}></i>
                    Manage Mappings
                  </a>
                </div>
                
                <div className="col-6 col-md-3 mb-3">
                  <a href="#quality" className="btn btn-outline-primary w-100 py-3">
                    <i className="bi bi-shield-check d-block mb-2" style={{ fontSize: '1.5rem' }}></i>
                    Data Quality Report
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Setup the Mapping Status Chart when data is available
const setupMappingChart = (statusCounts) => {
  try {
    // Clear any existing chart
    const existingChart = Chart.getChart('mappingStatusChart');
    if (existingChart) {
      existingChart.destroy();
    }
    
    const ctx = document.getElementById('mappingStatusChart');
    
    if (!ctx || !statusCounts) return;
    
    const data = {
      labels: ['Validated', 'Proposed', 'Issues', 'Pending'],
      datasets: [{
        data: [
          statusCounts.validated || 0,
          statusCounts.proposed || 0,
          statusCounts.issues || 0,
          statusCounts.pending || 0
        ],
        backgroundColor: [
          '#4caf50',
          '#ff9800',
          '#f44336',
          '#2196f3'
        ],
        borderWidth: 0
      }]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    };
    
    new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: options
    });
  } catch (error) {
    console.error('Error setting up mapping chart:', error);
  }
};

// Export the Dashboard component
export default Dashboard;