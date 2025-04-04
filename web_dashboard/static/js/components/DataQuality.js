// DataQuality.js - Customer360 Data Quality Component
// Provides detailed data quality metrics, issue breakdowns, and remediation suggestions

const { useState, useEffect } = React;
const axios = window.axios || axios;

const DataQuality = () => {
  const [qualityData, setQualityData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [fieldIssues, setFieldIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30days');

  useEffect(() => {
    // Load data quality metrics when component mounts
    fetchDataQuality();
  }, []);

  useEffect(() => {
    // Load historical data when timeRange changes
    if (!loading) {
      fetchHistoricalData(timeRange);
    }
  }, [timeRange]);

  useEffect(() => {
    // Set up Chart.js charts when data is available
    if (historicalData && !loading) {
      setupTrendChart();
    }
  }, [historicalData]);

  const fetchDataQuality = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/data-quality');
      if (response.data.success) {
        setQualityData(response.data.metrics || {});
        fetchHistoricalData(timeRange);
        fetchFieldIssues();
      } else {
        console.error('Error fetching data quality metrics:', response.data.error);
        setError('Failed to load data quality metrics');
      }
    } catch (error) {
      console.error('Error fetching data quality metrics:', error);
      setError('Failed to load data quality metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async (range) => {
    try {
      const response = await axios.get(`/api/data-quality/history?range=${range}`);
      if (response.data.success) {
        setHistoricalData(response.data.history || []);
      } else {
        console.error('Error fetching historical data:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const fetchFieldIssues = async () => {
    try {
      const response = await axios.get('/api/data-quality/fields');
      if (response.data.success) {
        setFieldIssues(response.data.issues || []);
      } else {
        console.error('Error fetching field issues:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching field issues:', error);
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

  // Get severity level badge for issues
  const getSeverityBadge = (severity) => {
    const badges = {
      'high': 'danger',
      'medium': 'warning',
      'low': 'info'
    };
    return badges[severity] || 'secondary';
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
  };

  // Set up the trend chart for historical data
  const setupTrendChart = () => {
    try {
      // Clear any existing chart
      const existingChart = Chart.getChart('qualityTrendChart');
      if (existingChart) {
        existingChart.destroy();
      }
      
      const ctx = document.getElementById('qualityTrendChart');
      if (!ctx || !historicalData || historicalData.length === 0) return;
      
      // Prepare data for the chart
      const dates = historicalData.map(item => item.date);
      const completeness = historicalData.map(item => item.completeness * 100);
      const accuracy = historicalData.map(item => item.accuracy * 100);
      const consistency = historicalData.map(item => item.consistency * 100);
      const timeliness = historicalData.map(item => item.timeliness * 100);
      
      const data = {
        labels: dates,
        datasets: [
          {
            label: 'Completeness',
            data: completeness,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Accuracy',
            data: accuracy,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Consistency',
            data: consistency,
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Timeliness',
            data: timeliness,
            borderColor: '#9C27B0',
            backgroundColor: 'rgba(156, 39, 176, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      };
      
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(1) + '%';
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            },
            title: {
              display: true,
              text: 'Quality Score'
            }
          }
        }
      };
      
      new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
      });
    } catch (error) {
      console.error('Error setting up quality trend chart:', error);
    }
  };

  return (
    <div className="data-quality-container">
      <div className="mb-4">
        <h2 className="mb-3">Data Quality Dashboard</h2>
        <p className="text-muted">
          Comprehensive view of your Customer360 data quality metrics, issues, and recommendations.
        </p>
      </div>

      {/* Quality Score Summary */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="dashboard-card">
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
                <div className="row align-items-center">
                  <div className="col-md-3 text-center">
                    <div className="quality-score-circle">
                      <div className="quality-score-value">
                        {(calculateOverallScore() * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-2">Overall Quality Score</div>
                  </div>
                  <div className="col-md-9">
                    <div className="row">
                      <div className="col-md-3 col-6 mb-3">
                        <div className="metric-card text-center p-3">
                          <div className="metric-value text-info">
                            {((qualityData?.completeness || 0) * 100).toFixed(1)}%
                          </div>
                          <div className="metric-name">Completeness</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-3">
                        <div className="metric-card text-center p-3">
                          <div className="metric-value text-primary">
                            {((qualityData?.accuracy || 0) * 100).toFixed(1)}%
                          </div>
                          <div className="metric-name">Accuracy</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-3">
                        <div className="metric-card text-center p-3">
                          <div className="metric-value text-warning">
                            {((qualityData?.consistency || 0) * 100).toFixed(1)}%
                          </div>
                          <div className="metric-name">Consistency</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-3">
                        <div className="metric-card text-center p-3">
                          <div className="metric-value text-success">
                            {((qualityData?.timeliness || 0) * 100).toFixed(1)}%
                          </div>
                          <div className="metric-name">Timeliness</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-3">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} 
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'trends' ? 'active' : ''}`}
              onClick={() => setActiveTab('trends')}
            >
              Trends
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'issues' ? 'active' : ''}`}
              onClick={() => setActiveTab('issues')}
            >
              Issues
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              Recommendations
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-pane active">
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="dashboard-card h-100">
                  <div className="card-header">
                    <h3 className="card-title">Quality Metrics by Source System</h3>
                  </div>
                  <div className="card-body">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Source System</th>
                          <th>Completeness</th>
                          <th>Accuracy</th>
                          <th>Consistency</th>
                          <th>Timeliness</th>
                          <th>Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>CRM System</td>
                          <td>92.5%</td>
                          <td>89.3%</td>
                          <td>94.1%</td>
                          <td>98.7%</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                <div className="progress-bar bg-success" role="progressbar" style={{ width: '93.7%' }}></div>
                              </div>
                              <span>93.7%</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>ERP System</td>
                          <td>87.2%</td>
                          <td>92.0%</td>
                          <td>82.5%</td>
                          <td>79.9%</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                <div className="progress-bar bg-primary" role="progressbar" style={{ width: '85.4%' }}></div>
                              </div>
                              <span>85.4%</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>Marketing Platform</td>
                          <td>78.6%</td>
                          <td>76.2%</td>
                          <td>72.0%</td>
                          <td>95.8%</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                <div className="progress-bar bg-warning" role="progressbar" style={{ width: '80.7%' }}></div>
                              </div>
                              <span>80.7%</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>E-Commerce Platform</td>
                          <td>94.7%</td>
                          <td>90.3%</td>
                          <td>91.5%</td>
                          <td>99.2%</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                <div className="progress-bar bg-success" role="progressbar" style={{ width: '93.9%' }}></div>
                              </div>
                              <span>93.9%</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>Support Ticketing</td>
                          <td>65.3%</td>
                          <td>72.8%</td>
                          <td>60.4%</td>
                          <td>82.1%</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                <div className="progress-bar bg-danger" role="progressbar" style={{ width: '70.2%' }}></div>
                              </div>
                              <span>70.2%</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="dashboard-card h-100">
                  <div className="card-header">
                    <h3 className="card-title">Quality Impact</h3>
                  </div>
                  <div className="card-body">
                    <div className="mb-4">
                      <h5>Critical Customer Attributes</h5>
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                          Email Address
                          <span className="badge bg-success rounded-pill">98.3%</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                          Phone Number
                          <span className="badge bg-warning rounded-pill">82.7%</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                          Shipping Address
                          <span className="badge bg-success rounded-pill">94.2%</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                          Customer Preferences
                          <span className="badge bg-danger rounded-pill">68.5%</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h5>Business Impact Areas</h5>
                      <div className="alert alert-warning">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Low data quality in Customer Preferences is affecting personalized marketing campaigns.
                      </div>
                      <div className="alert alert-info">
                        <i className="bi bi-info-circle me-2"></i>
                        Improved data quality in Email Address has reduced bounce rates by 12%.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="tab-pane active">
            <div className="row mb-4">
              <div className="col-12">
                <div className="dashboard-card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h3 className="card-title">Data Quality Trends</h3>
                    <div>
                      <select 
                        className="form-select" 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                      >
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="90days">Last 90 Days</option>
                        <option value="1year">Last Year</option>
                      </select>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="chart-container" style={{ height: '400px' }}>
                      <canvas id="qualityTrendChart"></canvas>
                    </div>
                    <div className="row mt-4">
                      <div className="col-md-3">
                        <div className="trend-stat">
                          <div className="trend-label">Completeness Trend</div>
                          <div className="trend-value text-success">
                            <i className="bi bi-arrow-up-right"></i> +3.2%
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="trend-stat">
                          <div className="trend-label">Accuracy Trend</div>
                          <div className="trend-value text-success">
                            <i className="bi bi-arrow-up-right"></i> +1.7%
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="trend-stat">
                          <div className="trend-label">Consistency Trend</div>
                          <div className="trend-value text-danger">
                            <i className="bi bi-arrow-down-right"></i> -0.8%
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="trend-stat">
                          <div className="trend-label">Timeliness Trend</div>
                          <div className="trend-value text-success">
                            <i className="bi bi-arrow-up-right"></i> +4.5%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="tab-pane active">
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="dashboard-card h-100">
                  <div className="card-header">
                    <h3 className="card-title">Data Quality Issues</h3>
                  </div>
                  <div className="card-body p-0">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Issue Type</th>
                          <th>Severity</th>
                          <th>Affected Records</th>
                          <th>Source System</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Email Address</td>
                          <td>Invalid Format</td>
                          <td>
                            <span className="badge bg-warning">Medium</span>
                          </td>
                          <td>327</td>
                          <td>Marketing Platform</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">Fix</button>
                          </td>
                        </tr>
                        <tr>
                          <td>Phone Number</td>
                          <td>Missing Country Code</td>
                          <td>
                            <span className="badge bg-danger">High</span>
                          </td>
                          <td>842</td>
                          <td>CRM System</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">Fix</button>
                          </td>
                        </tr>
                        <tr>
                          <td>Customer ID</td>
                          <td>Duplicate Values</td>
                          <td>
                            <span className="badge bg-danger">High</span>
                          </td>
                          <td>53</td>
                          <td>ERP System</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">Fix</button>
                          </td>
                        </tr>
                        <tr>
                          <td>Purchase Date</td>
                          <td>Future Date</td>
                          <td>
                            <span className="badge bg-warning">Medium</span>
                          </td>
                          <td>18</td>
                          <td>E-Commerce Platform</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">Fix</button>
                          </td>
                        </tr>
                        <tr>
                          <td>Address Line 1</td>
                          <td>Incomplete</td>
                          <td>
                            <span className="badge bg-info">Low</span>
                          </td>
                          <td>215</td>
                          <td>CRM System</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">Fix</button>
                          </td>
                        </tr>
                        <tr>
                          <td>Preferences</td>
                          <td>Invalid JSON</td>
                          <td>
                            <span className="badge bg-danger">High</span>
                          </td>
                          <td>124</td>
                          <td>Marketing Platform</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">Fix</button>
                          </td>
                        </tr>
                        <tr>
                          <td>Postal Code</td>
                          <td>Format Inconsistency</td>
                          <td>
                            <span className="badge bg-warning">Medium</span>
                          </td>
                          <td>498</td>
                          <td>Multiple</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">Fix</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="dashboard-card mb-4">
                  <div className="card-header">
                    <h3 className="card-title">Issue Summary</h3>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <h5>Issues by Severity</h5>
                      <div className="d-flex justify-content-between mb-2">
                        <span>High</span>
                        <span className="fw-bold text-danger">3 issues (1,019 records)</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Medium</span>
                        <span className="fw-bold text-warning">3 issues (843 records)</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Low</span>
                        <span className="fw-bold text-info">1 issue (215 records)</span>
                      </div>
                    </div>
                    <div>
                      <h5>Issues by Type</h5>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Format Issues</span>
                        <span className="fw-bold">3 issues</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Missing Values</span>
                        <span className="fw-bold">1 issue</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Duplicates</span>
                        <span className="fw-bold">1 issue</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Validation Failures</span>
                        <span className="fw-bold">2 issues</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3 className="card-title">Batch Fix Options</h3>
                  </div>
                  <div className="card-body">
                    <div className="d-grid gap-2">
                      <button className="btn btn-outline-primary">
                        <i className="bi bi-telephone me-2"></i>
                        Standardize Phone Numbers
                      </button>
                      <button className="btn btn-outline-primary">
                        <i className="bi bi-envelope me-2"></i>
                        Validate All Emails
                      </button>
                      <button className="btn btn-outline-primary">
                        <i className="bi bi-geo-alt me-2"></i>
                        Format Postal Codes
                      </button>
                      <button className="btn btn-primary">
                        <i className="bi bi-lightning-charge me-2"></i>
                        Run Auto-Fix Process
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="tab-pane active">
            <div className="row mb-4">
              <div className="col-12">
                <div className="dashboard-card mb-4">
                  <div className="card-header">
                    <h3 className="card-title">Improvement Recommendations</h3>
                  </div>
                  <div className="card-body">
                    <div className="recommendation-item">
                      <div className="d-flex align-items-center mb-2">
                        <span className="badge bg-danger me-2">High Priority</span>
                        <h5 className="mb-0">Implement Phone Number Standardization</h5>
                      </div>
                      <p>
                        Standardize phone number format across all systems to include country codes. This will affect 842 records and improve the consistency score by approximately 3.2%.
                      </p>
                      <div className="d-flex align-items-center">
                        <button className="btn btn-outline-primary me-2">Implement Fix</button>
                        <button className="btn btn-outline-secondary">Learn More</button>
                        <div className="ms-auto">
                          <span className="badge bg-primary">Data Consistency</span>
                          <span className="badge bg-info ms-1">CRM Integration</span>
                        </div>
                      </div>
                    </div>
                    
                    <hr />
                    
                    <div className="recommendation-item">
                      <div className="d-flex align-items-center mb-2">
                        <span className="badge bg-danger me-2">High Priority</span>
                        <h5 className="mb-0">Resolve Customer ID Duplicates</h5>
                      </div>
                      <p>
                        Fix 53 duplicate customer IDs in the ERP system. This is causing severe data consistency issues and affecting reporting accuracy.
                      </p>
                      <div className="d-flex align-items-center">
                        <button className="btn btn-outline-primary me-2">Implement Fix</button>
                        <button className="btn btn-outline-secondary">Learn More</button>
                        <div className="ms-auto">
                          <span className="badge bg-primary">Data Integrity</span>
                          <span className="badge bg-info ms-1">ERP Integration</span>
                        </div>
                      </div>
                    </div>
                    
                    <hr />
                    
                    <div className="recommendation-item">
                      <div className="d-flex align-items-center mb-2">
                        <span className="badge bg-warning me-2">Medium Priority</span>
                        <h5 className="mb-0">Add Email Validation at Collection Points</h5>
                      </div>
                      <p>
                        Implement real-time email validation in the Marketing Platform to prevent future issues with invalid email formats. This will improve data accuracy and reduce the need for later data cleansing.
                      </p>
                      <div className="d-flex align-items-center">
                        <button className="btn btn-outline-primary me-2">Implement Fix</button>
                        <button className="btn btn-outline-secondary">Learn More</button>
                        <div className="ms-auto">
                          <span className="badge bg-primary">Data Validation</span>
                          <span className="badge bg-info ms-1">Marketing Platform</span>
                        </div>
                      </div>
                    </div>
                    
                    <hr />
                    
                    <div className="recommendation-item">
                      <div className="d-flex align-items-center mb-2">
                        <span className="badge bg-warning me-2">Medium Priority</span>
                        <h5 className="mb-0">Standardize Postal Code Format</h5>
                      </div>
                      <p>
                        Implement a standardized postal code format across all systems based on country. This will improve searchability and address validation processes.
                      </p>
                      <div className="d-flex align-items-center">
                        <button className="btn btn-outline-primary me-2">Implement Fix</button>
                        <button className="btn btn-outline-secondary">Learn More</button>
                        <div className="ms-auto">
                          <span className="badge bg-primary">Data Standardization</span>
                          <span className="badge bg-info ms-1">Multiple Systems</span>
                        </div>
                      </div>
                    </div>
                    
                    <hr />
                    
                    <div className="recommendation-item">
                      <div className="d-flex align-items-center mb-2">
                        <span className="badge bg-info me-2">Low Priority</span>
                        <h5 className="mb-0">Enhance Customer Preferences Data Collection</h5>
                      </div>
                      <p>
                        Improve the structure and validation of customer preferences data to ensure consistency across marketing platforms and improve personalization capabilities.
                      </p>
                      <div className="d-flex align-items-center">
                        <button className="btn btn-outline-primary me-2">Implement Fix</button>
                        <button className="btn btn-outline-secondary">Learn More</button>
                        <div className="ms-auto">
                          <span className="badge bg-primary">Data Enhancement</span>
                          <span className="badge bg-info ms-1">Customer Experience</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-card">
                  <div className="card-header">
                    <h3 className="card-title">Data Quality Process Improvements</h3>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4 mb-4">
                        <div className="process-card">
                          <div className="process-icon">
                            <i className="bi bi-shield-check"></i>
                          </div>
                          <h5>Implement Data Governance</h5>
                          <p>Establish formal data governance policies and procedures to maintain high data quality standards.</p>
                          <button className="btn btn-outline-primary btn-sm">Learn More</button>
                        </div>
                      </div>
                      <div className="col-md-4 mb-4">
                        <div className="process-card">
                          <div className="process-icon">
                            <i className="bi bi-gear-wide-connected"></i>
                          </div>
                          <h5>Automate Data Validation</h5>
                          <p>Implement automated data validation checks at all data entry points to prevent quality issues.</p>
                          <button className="btn btn-outline-primary btn-sm">Learn More</button>
                        </div>
                      </div>
                      <div className="col-md-4 mb-4">
                        <div className="process-card">
                          <div className="process-icon">
                            <i className="bi bi-bell"></i>
                          </div>
                          <h5>Proactive Alerting</h5>
                          <p>Set up proactive alerts for data quality issues to address problems before they impact business operations.</p>
                          <button className="btn btn-outline-primary btn-sm">Learn More</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export the DataQuality component
export default DataQuality;
