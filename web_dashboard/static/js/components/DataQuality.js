// DataQuality.js - Component to display data quality metrics

const { useState, useEffect } = React;
const axios = window.axios || axios;

const DataQuality = () => {
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState({});
  const [systemFilter, setSystemFilter] = useState('all');
  const [sourceSystems, setSourceSystems] = useState([]);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [detailView, setDetailView] = useState(false);

  useEffect(() => {
    // Load data quality metrics when the component mounts
    fetchDataQualityMetrics();
    fetchSourceSystems();
  }, []);

  useEffect(() => {
    // Update charts when data changes
    if (qualityData && qualityData.overall) {
      setupQualityCharts();
    }
  }, [qualityData, systemFilter]);

  const fetchDataQualityMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/data-quality/metrics');
      setQualityData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data quality metrics:', error);
      setLoading(false);
    }
  };

  const fetchSourceSystems = async () => {
    try {
      const response = await axios.get('/api/source-systems');
      setSourceSystems(response.data);
    } catch (error) {
      console.error('Error fetching source systems:', error);
    }
  };

  const fetchMappingDetails = async (mappingId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/data-mappings/${mappingId}/validation`);
      setSelectedMapping(response.data);
      setDetailView(true);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching mapping details:', error);
      setLoading(false);
    }
  };

  const setupQualityCharts = () => {
    // Get filtered data based on selected source system
    let filteredData = qualityData.mappings || [];
    
    if (systemFilter !== 'all') {
      filteredData = filteredData.filter(m => m.source_system_id === parseInt(systemFilter));
    }

    // Setup completeness chart
    setupCompletenessChart(filteredData);
    
    // Setup validation status chart
    setupValidationStatusChart(filteredData);
    
    // Setup data profile chart
    setupDataProfileChart(qualityData.overall || {});
  };

  const setupCompletenessChart = (mappings) => {
    try {
      // Clear any existing chart
      const existingChart = Chart.getChart('completenessChart');
      if (existingChart) {
        existingChart.destroy();
      }

      // Calculate completeness by attribute category
      const categories = {};
      mappings.forEach(mapping => {
        const category = mapping.attribute_category || 'Other';
        if (!categories[category]) {
          categories[category] = {
            total: 0,
            complete: 0
          };
        }
        categories[category].total++;
        if (mapping.completeness >= 95) {
          categories[category].complete++;
        }
      });

      const ctx = document.getElementById('completenessChart');
      if (!ctx) return;

      const labels = Object.keys(categories);
      const completenessData = labels.map(label => {
        const { total, complete } = categories[label];
        return (complete / total) * 100 || 0;
      });

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Completeness %',
            data: completenessData,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Completeness %'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Data Completeness by Category'
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y.toFixed(1);
                  return `${label}: ${value}%`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error setting up completeness chart:', error);
    }
  };

  const setupValidationStatusChart = (mappings) => {
    try {
      // Clear any existing chart
      const existingChart = Chart.getChart('validationStatusChart');
      if (existingChart) {
        existingChart.destroy();
      }

      // Count mappings by status
      const statusCounts = {
        validated: 0,
        proposed: 0,
        issues: 0,
        pending: 0
      };

      mappings.forEach(mapping => {
        const status = mapping.mapping_status || 'pending';
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        }
      });

      const ctx = document.getElementById('validationStatusChart');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Validated', 'Proposed', 'Issues', 'Pending'],
          datasets: [{
            data: [
              statusCounts.validated,
              statusCounts.proposed,
              statusCounts.issues,
              statusCounts.pending
            ],
            backgroundColor: [
              '#4caf50', // green
              '#ff9800', // orange
              '#f44336', // red
              '#2196f3' // blue
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Data Mapping Validation Status'
            },
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.raw;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error setting up validation status chart:', error);
    }
  };

  const setupDataProfileChart = (overallMetrics) => {
    try {
      // Clear any existing chart
      const existingChart = Chart.getChart('dataProfileChart');
      if (existingChart) {
        existingChart.destroy();
      }

      // Get overall data quality metrics
      const metrics = [
        { name: 'Completeness', value: overallMetrics.avg_completeness || 0 },
        { name: 'Uniqueness', value: overallMetrics.avg_uniqueness || 0 },
        { name: 'Consistency', value: overallMetrics.consistency_score || 0 },
        { name: 'Accuracy', value: overallMetrics.accuracy_score || 0 },
        { name: 'PII Compliance', value: overallMetrics.pii_compliance_score || 0 }
      ];

      const ctx = document.getElementById('dataProfileChart');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'radar',
        data: {
          labels: metrics.map(m => m.name),
          datasets: [{
            label: 'Data Quality Score',
            data: metrics.map(m => m.value),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: {
                display: true
              },
              suggestedMin: 0,
              suggestedMax: 100
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Data Quality Profile'
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.raw.toFixed(1);
                  return `${label}: ${value}%`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error setting up data profile chart:', error);
    }
  };

  const handleSystemChange = (e) => {
    setSystemFilter(e.target.value);
  };

  const handleBackToOverview = () => {
    setDetailView(false);
    setSelectedMapping(null);
  };

  return (
    <div className="data-quality-container">
      <h2>Data Quality Dashboard</h2>
      
      {!detailView ? (
        <>
          <div className="filter-controls">
            <label htmlFor="system-filter">Source System:</label>
            <select 
              id="system-filter" 
              value={systemFilter} 
              onChange={handleSystemChange}
            >
              <option value="all">All Systems</option>
              {sourceSystems.map(system => (
                <option key={system.id} value={system.id}>
                  {system.system_name}
                </option>
              ))}
            </select>
          </div>
          
          {loading ? (
            <div className="loading">Loading data quality metrics...</div>
          ) : (
            <>
              <div className="quality-summary">
                <div className="metric-card">
                  <h3>Overall Score</h3>
                  <div className="score">
                    {(qualityData.overall?.overall_score || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="metric-card">
                  <h3>Mappings</h3>
                  <div className="count">{qualityData.mappings?.length || 0}</div>
                </div>
                <div className="metric-card">
                  <h3>Issues</h3>
                  <div className="count">{qualityData.overall?.total_issues || 0}</div>
                </div>
              </div>
              
              <div className="charts-grid">
                <div className="chart-container">
                  <canvas id="completenessChart"></canvas>
                </div>
                <div className="chart-container">
                  <canvas id="validationStatusChart"></canvas>
                </div>
                <div className="chart-container">
                  <canvas id="dataProfileChart"></canvas>
                </div>
              </div>
              
              <h3>Data Mapping Quality</h3>
              <div className="mappings-table-container">
                <table className="mappings-table">
                  <thead>
                    <tr>
                      <th>Source System</th>
                      <th>Source Attribute</th>
                      <th>Target Attribute</th>
                      <th>Completeness</th>
                      <th>Status</th>
                      <th>Confidence</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualityData.mappings?.filter(m => 
                      systemFilter === 'all' || 
                      m.source_system_id === parseInt(systemFilter)
                    ).map(mapping => (
                      <tr key={mapping.id}>
                        <td>{mapping.source_system}</td>
                        <td>{mapping.source_attribute}</td>
                        <td>{mapping.target_attribute}</td>
                        <td>
                          <div className="progress-bar">
                            <div 
                              className="progress" 
                              style={{width: `${mapping.completeness}%`}}
                            ></div>
                            <span>{mapping.completeness.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${mapping.mapping_status}`}>
                            {mapping.mapping_status}
                          </span>
                        </td>
                        <td>
                          <div className="confidence-score">
                            {(mapping.confidence_score * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td>
                          <button 
                            className="details-btn" 
                            onClick={() => fetchMappingDetails(mapping.id)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        selectedMapping && (
          <div className="mapping-details">
            <button 
              className="back-btn" 
              onClick={handleBackToOverview}
            >
              &larr; Back to Overview
            </button>
            
            <h3>Data Mapping Details</h3>
            
            <div className="detail-grid">
              <div className="detail-card">
                <h4>Mapping Information</h4>
                <dl>
                  <dt>Source System:</dt>
                  <dd>{selectedMapping.source_system}</dd>
                  
                  <dt>Source Attribute:</dt>
                  <dd>{selectedMapping.source_attribute}</dd>
                  
                  <dt>Target Attribute:</dt>
                  <dd>{selectedMapping.target_attribute}</dd>
                  
                  <dt>Status:</dt>
                  <dd>
                    <span className={`status-badge ${selectedMapping.mapping_status}`}>
                      {selectedMapping.mapping_status}
                    </span>
                  </dd>
                  
                  <dt>Confidence Score:</dt>
                  <dd>{(selectedMapping.confidence_score * 100).toFixed(1)}%</dd>
                </dl>
              </div>
              
              <div className="detail-card">
                <h4>Data Quality Metrics</h4>
                <dl>
                  <dt>Completeness:</dt>
                  <dd>{selectedMapping.data_quality_metrics?.completeness?.toFixed(1)}%</dd>
                  
                  <dt>Distinct Values:</dt>
                  <dd>{selectedMapping.data_quality_metrics?.distinct_count}</dd>
                  
                  <dt>Uniqueness:</dt>
                  <dd>{selectedMapping.data_quality_metrics?.uniqueness?.toFixed(1)}%</dd>
                  
                  {selectedMapping.data_quality_metrics?.min !== undefined && (
                    <>
                      <dt>Min Value:</dt>
                      <dd>{selectedMapping.data_quality_metrics.min}</dd>
                      
                      <dt>Max Value:</dt>
                      <dd>{selectedMapping.data_quality_metrics.max}</dd>
                      
                      <dt>Mean:</dt>
                      <dd>{selectedMapping.data_quality_metrics.mean?.toFixed(2)}</dd>
                    </>
                  )}
                  
                  {selectedMapping.data_quality_metrics?.min_date && (
                    <>
                      <dt>Date Range:</dt>
                      <dd>
                        {new Date(selectedMapping.data_quality_metrics.min_date).toLocaleDateString()} -
                        {new Date(selectedMapping.data_quality_metrics.max_date).toLocaleDateString()}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
            
            {selectedMapping.validation_issues?.length > 0 && (
              <div className="issues-section">
                <h4>Validation Issues</h4>
                <ul className="issues-list">
                  {selectedMapping.validation_issues.map((issue, idx) => (
                    <li key={idx}>
                      <span className="issue-icon">⚠️</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedMapping.sample_results?.length > 0 && (
              <div className="sample-section">
                <h4>Sample Data Transformation</h4>
                <table className="sample-table">
                  <thead>
                    <tr>
                      <th>Input Value</th>
                      <th>Transformed Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMapping.sample_results.map((sample, idx) => (
                      <tr key={idx}>
                        <td>{sample.input}</td>
                        <td>{sample.is_null ? '<null>' : sample.output}</td>
                        <td>
                          <span className={`status-dot ${sample.is_null ? 'invalid' : 'valid'}`}></span>
                          {sample.is_null ? 'Null Value' : 'Valid'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="action-buttons">
              <button className="action-btn edit">Edit Mapping</button>
              <button className="action-btn validate">Re-validate</button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default DataQuality;