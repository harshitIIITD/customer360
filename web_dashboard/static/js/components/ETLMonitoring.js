// Customer360 Dashboard - ETL Monitoring Component

const { useState, useEffect } = React;

const ETLMonitoring = () => {
  const [jobs, setJobs] = useState([]);
  const [etlProcesses, setEtlProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [statistics, setStatistics] = useState({
    total_jobs: 0,
    completed_jobs: 0,
    processing_jobs: 0,
    failed_jobs: 0
  });
  const [newProcessData, setNewProcessData] = useState({
    name: '',
    source_system: '',
    target_system: '',
    schedule: '0 0 * * *', // Daily at midnight by default
    enabled: true
  });

  useEffect(() => {
    fetchEtlProcesses();
    // Set up polling to refresh data every 30 seconds
    const intervalId = setInterval(fetchEtlProcesses, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchEtlProcesses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/etl/processes');
      if (response.data.success) {
        setEtlProcesses(response.data.processes);
      } else {
        setError('Failed to load ETL processes: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error fetching ETL processes:', error);
      setError('Failed to load ETL processes. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProcess = async (processId) => {
    try {
      const response = await axios.post(`/api/etl/processes/${processId}/start`);
      if (response.data.success) {
        fetchEtlProcesses(); // Refresh the list
        showToast('ETL process started successfully');
      } else {
        showToast('Error starting ETL process: ' + response.data.error, 'danger');
      }
    } catch (error) {
      console.error('Error starting ETL process:', error);
      showToast('Failed to start ETL process. Check console for details.', 'danger');
    }
  };

  // Helper function to show toast messages
  const showToast = (message, type = 'success') => {
    // Simple implementation using console
    console.log(`[${type}] ${message}`);
  };
  
  const [newJobDialog, setNewJobDialog] = useState(false);
  const [newJob, setNewJob] = useState({
    job_name: '',
    job_type: 'full_load',
    source_id: ''
  });
  const [sources, setSources] = useState([
    { id: 'crm', name: 'CRM System' },
    { id: 'erp', name: 'ERP System' },
    { id: 'marketing', name: 'Marketing Platform' },
    { id: 'web_analytics', name: 'Web Analytics' }
  ]);
  const [jobTypes] = useState([
    { value: 'full_load', label: 'Full Load' },
    { value: 'incremental', label: 'Incremental Update' },
    { value: 'refresh_metadata', label: 'Refresh Metadata' }
  ]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);

  // Load jobs and statistics on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle tab change
  const handleTabChange = (tabIndex) => {
    setTabValue(tabIndex);
    fetchJobs(tabIndex === 0 ? 'active' : 'all');
  };

  // Fetch both jobs and statistics
  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchJobs('active'),
        fetchStatistics()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch jobs based on status filter
  const fetchJobs = async (statusFilter) => {
    try {
      const response = await fetch(`/api/etl/jobs?status=${statusFilter}`);
      const result = await response.json();
      
      if (result.success && result.data && result.data.jobs) {
        setJobs(result.data.jobs);
      } else {
        console.error('Error fetching jobs:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  // Fetch ETL statistics
  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/etl/statistics');
      const result = await response.json();
      
      if (result.success) {
        // Convert the backend statistics format to our frontend format
        setStatistics({
          total_jobs: result.statistics?.status_counts?.queued + 
                     result.statistics?.status_counts?.running + 
                     result.statistics?.status_counts?.completed + 
                     result.statistics?.status_counts?.error || 0,
          completed_jobs: result.statistics?.status_counts?.completed || 0,
          processing_jobs: result.statistics?.status_counts?.running || 0,
          failed_jobs: result.statistics?.status_counts?.error || 0
        });
      } else {
        console.error('Error fetching statistics:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  // Submit new ETL job
  const submitJob = async () => {
    try {
      const response = await fetch('/api/etl/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newJob)
      });
      
      const result = await response.json();
      if (result.success) {
        setNewJobDialog(false);
        fetchJobs('active');
        showToast('ETL job submitted successfully');
      } else {
        alert(`Error submitting job: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to submit job:', error);
      alert('Failed to submit job. See console for details.');
    }
  };

  // Cancel a running ETL job
  const cancelJob = async (jobId) => {
    if (window.confirm('Are you sure you want to cancel this job?')) {
      try {
        const response = await fetch(`/api/etl/jobs/${jobId}/cancel`, {
          method: 'POST'
        });
        
        const result = await response.json();
        if (result.success) {
          fetchJobs(tabValue === 0 ? 'active' : 'all');
          showToast('ETL job cancelled successfully');
        } else {
          alert(`Error cancelling job: ${result.error}`);
        }
      } catch (error) {
        console.error('Failed to cancel job:', error);
        alert('Failed to cancel job. See console for details.');
      }
    }
  };

  // View job details
  const viewJobDetails = (job) => {
    setSelectedJob(job);
    setJobDetailsOpen(true);
  };

  // Handle job form input changes
  const handleJobFormChange = (e) => {
    const { name, value } = e.target;
    setNewJob(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getJobStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-success';
      case 'running': return 'bg-warning';
      case 'queued': return 'bg-info';
      case 'failed': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="etl-monitoring-container">
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>ETL Process Monitoring</h2>
          <div>
            <button className="btn btn-primary me-2" onClick={() => setNewJobDialog(true)}>
              <i className="bi bi-play-fill"></i> New ETL Job
            </button>
            <button className="btn btn-outline-secondary" onClick={fetchData}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Jobs</h5>
              <h3>{statistics.total_jobs}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-success bg-opacity-10">
            <div className="card-body">
              <h5 className="card-title">Completed</h5>
              <h3>{statistics.completed_jobs}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-warning bg-opacity-10">
            <div className="card-body">
              <h5 className="card-title">In Progress</h5>
              <h3>{statistics.processing_jobs}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-danger bg-opacity-10">
            <div className="card-body">
              <h5 className="card-title">Failed</h5>
              <h3>{statistics.failed_jobs}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${tabValue === 0 ? 'active' : ''}`} 
                onClick={() => handleTabChange(0)}
              >
                Active Jobs
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${tabValue === 1 ? 'active' : ''}`}
                onClick={() => handleTabChange(1)}
              >
                Job History
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length > 0 ? jobs.map(job => (
                    <tr key={job.job_id}>
                      <td>{job.job_id}</td>
                      <td>{job.job_name}</td>
                      <td>{job.job_type.replace('_', ' ').charAt(0).toUpperCase() + job.job_type.replace('_', ' ').slice(1)}</td>
                      <td>{sources.find(s => s.id === job.source_id)?.name || job.source_id}</td>
                      <td>
                        <span className={`badge ${getJobStatusBadgeClass(job.status)}`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                      </td>
                      <td>{new Date(job.created_at).toLocaleString()}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={() => viewJobDetails(job)}
                        >
                          Details
                        </button>
                        {job.status === 'running' && (
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => cancelJob(job.job_id)}
                          >
                            <i className="bi bi-stop-fill"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="text-center">No jobs found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      {jobDetailsOpen && selectedJob && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Job Details: {selectedJob.job_name}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setJobDetailsOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Status:</strong> <span className={`badge ${getJobStatusBadgeClass(selectedJob.status)}`}>
                      {selectedJob.status.charAt(0).toUpperCase() + selectedJob.status.slice(1)}
                    </span></p>
                    <p><strong>Type:</strong> {selectedJob.job_type.replace('_', ' ').charAt(0).toUpperCase() + selectedJob.job_type.replace('_', ' ').slice(1)}</p>
                    <p><strong>Created:</strong> {new Date(selectedJob.created_at).toLocaleString()}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Source:</strong> {sources.find(s => s.id === selectedJob.source_id)?.name || selectedJob.source_id}</p>
                    <p><strong>Updated:</strong> {selectedJob.updated_at ? new Date(selectedJob.updated_at).toLocaleString() : 'N/A'}</p>
                    <p><strong>Created By:</strong> {selectedJob.created_by || 'System'}</p>
                  </div>
                </div>
                
                {selectedJob.start_time && selectedJob.end_time && (
                  <div className="row">
                    <div className="col-12">
                      <p><strong>Duration:</strong> {selectedJob.duration ? `${selectedJob.duration.toFixed(2)} seconds` : 'Calculating...'}</p>
                    </div>
                  </div>
                )}

                {selectedJob.error_message && (
                  <div className="mt-3">
                    <h6 className="text-danger">Error Message</h6>
                    <div className="bg-danger bg-opacity-10 p-2 rounded" style={{ maxHeight: '150px', overflow: 'auto' }}>
                      <pre className="mb-0">{selectedJob.error_message}</pre>
                    </div>
                  </div>
                )}
                
                {selectedJob.result && (
                  <div className="mt-3">
                    <h6>Result Summary</h6>
                    <div className="bg-light p-2 rounded" style={{ maxHeight: '150px', overflow: 'auto' }}>
                      <pre className="mb-0">{JSON.stringify(selectedJob.result, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {selectedJob.steps && selectedJob.steps.length > 0 && (
                  <div className="mt-3">
                    <h6>Job Steps</h6>
                    <div className="list-group">
                      {selectedJob.steps.map((step, index) => (
                        <div key={step.step_id} className="list-group-item">
                          <div className="row">
                            <div className="col-md-6">
                              <h6 className="mb-1">{step.step_name}</h6>
                              <span className={`badge ${getJobStatusBadgeClass(step.status)}`}>
                                {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                              </span>
                            </div>
                            <div className="col-md-6">
                              <p className="mb-1">Processed: {step.records_processed} records</p>
                              <p className="mb-1">Failed: {step.records_failed} records</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {selectedJob.status === 'running' && (
                  <button 
                    className="btn btn-danger"
                    onClick={() => {
                      cancelJob(selectedJob.job_id);
                      setJobDetailsOpen(false);
                    }}
                  >
                    Cancel Job
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setJobDetailsOpen(false)}>Close</button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </div>
      )}
      
      {/* New Job Dialog */}
      {newJobDialog && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Submit New ETL Job</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setNewJobDialog(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="job_name" className="form-label">Job Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="job_name"
                    name="job_name"
                    value={newJob.job_name}
                    onChange={handleJobFormChange}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="job_type" className="form-label">Job Type</label>
                  <select
                    className="form-select"
                    id="job_type"
                    name="job_type"
                    value={newJob.job_type}
                    onChange={handleJobFormChange}
                  >
                    {jobTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="source_id" className="form-label">Data Source</label>
                  <select
                    className="form-select"
                    id="source_id"
                    name="source_id"
                    value={newJob.source_id}
                    onChange={handleJobFormChange}
                  >
                    <option value="">Select a source</option>
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>{source.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setNewJobDialog(false)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={submitJob}
                  disabled={!newJob.job_name || !newJob.source_id}
                >
                  Submit Job
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </div>
      )}
    </div>
  );
};

// Make component available globally
window.ETLMonitoring = ETLMonitoring;