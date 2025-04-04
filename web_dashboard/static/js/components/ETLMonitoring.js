// Customer360 Dashboard - ETL Monitoring Component

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent,
  Grid, 
  Paper, 
  Tabs, 
  Tab, 
  Divider, 
  CircularProgress,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
  PlayArrow, 
  Refresh as RefreshIcon, 
  CheckCircle, 
  Pending, 
  Error, 
  Stop 
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const ETLMonitoring = () => {
  const theme = useTheme();
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
    // Implementation depends on your toast library
    console.log(`[${type}] ${message}`);
    // For a real implementation, you might use a toast library or context
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

  // Status colors
  const statusColors = {
    queued: theme.palette.info.light,
    running: theme.palette.warning.main,
    completed: theme.palette.success.main,
    failed: theme.palette.error.main,
    cancelled: theme.palette.grey[500]
  };

  // Columns for job tables
  const jobColumns = [
    { 
      field: 'job_id', 
      headerName: 'ID', 
      width: 90 
    },
    { 
      field: 'job_name', 
      headerName: 'Name',
      width: 200 
    },
    { 
      field: 'job_type', 
      headerName: 'Type',
      width: 150,
      valueFormatter: (params) => {
        const type = params.value.replace('_', ' ');
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    },
    { 
      field: 'source_id', 
      headerName: 'Source',
      width: 150,
      valueFormatter: (params) => {
        const source = sources.find(s => s.id === params.value);
        return source ? source.name : params.value;
      }
    },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: statusColors[params.value] || theme.palette.text.primary 
        }}>
          {params.value === 'completed' && <CheckCircle sx={{ mr: 1 }} />}
          {params.value === 'running' && <Pending sx={{ mr: 1 }} />}
          {params.value === 'failed' && <Error sx={{ mr: 1 }} />}
          <span>{params.value.charAt(0).toUpperCase() + params.value.slice(1)}</span>
        </Box>
      )
    },
    { 
      field: 'created_at', 
      headerName: 'Created',
      width: 180,
      valueFormatter: (params) => new Date(params.value).toLocaleString()
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Button 
            size="small" 
            onClick={() => viewJobDetails(params.row)}
          >
            Details
          </Button>
          {params.row.status === 'running' && (
            <Button 
              size="small" 
              color="error"
              onClick={() => cancelJob(params.row.job_id)}
            >
              <Stop fontSize="small" />
            </Button>
          )}
        </Box>
      )
    }
  ];

  // Load jobs and statistics on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    fetchJobs(newValue === 0 ? 'active' : 'all');
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4" component="h2">ETL Process Monitoring</Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<PlayArrow />}
            onClick={() => setNewJobDialog(true)}
            sx={{ mr: 1 }}
          >
            New ETL Job
          </Button>
          <Button 
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">Total Jobs</Typography>
              <Typography variant="h3" component="div">{statistics.total_jobs}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: theme.palette.success.light }}>
            <CardContent>
              <Typography variant="h6" component="div">Completed</Typography>
              <Typography variant="h3" component="div">{statistics.completed_jobs}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: theme.palette.warning.light }}>
            <CardContent>
              <Typography variant="h6" component="div">In Progress</Typography>
              <Typography variant="h3" component="div">{statistics.processing_jobs}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: theme.palette.error.light }}>
            <CardContent>
              <Typography variant="h6" component="div">Failed</Typography>
              <Typography variant="h3" component="div">{statistics.failed_jobs}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Active Jobs" />
          <Tab label="Job History" />
        </Tabs>
        <Divider />
        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <div style={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={jobs}
                columns={jobColumns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                getRowId={(row) => row.job_id}
                components={{
                  Toolbar: GridToolbar,
                }}
              />
            </div>
          )}
        </Box>
      </Paper>

      {/* New Job Dialog */}
      <Dialog open={newJobDialog} onClose={() => setNewJobDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit New ETL Job</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              name="job_name"
              label="Job Name"
              fullWidth
              value={newJob.job_name}
              onChange={handleJobFormChange}
              sx={{ mb: 3 }}
            />
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Job Type</InputLabel>
              <Select
                name="job_type"
                value={newJob.job_type}
                onChange={handleJobFormChange}
                label="Job Type"
              >
                {jobTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Data Source</InputLabel>
              <Select
                name="source_id"
                value={newJob.source_id}
                onChange={handleJobFormChange}
                label="Data Source"
              >
                {sources.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    {source.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewJobDialog(false)}>Cancel</Button>
          <Button 
            onClick={submitJob} 
            variant="contained" 
            color="primary"
            disabled={!newJob.job_name || !newJob.source_id}
          >
            Submit Job
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Details Dialog */}
      <Dialog open={jobDetailsOpen} onClose={() => setJobDetailsOpen(false)} maxWidth="md" fullWidth>
        {selectedJob && (
          <>
            <DialogTitle>
              Job Details: {selectedJob.job_name}
              <Typography variant="subtitle2">ID: {selectedJob.job_id}</Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Status</Typography>
                  <Typography variant="body1" sx={{ color: statusColors[selectedJob.status] }}>
                    {selectedJob.status.charAt(0).toUpperCase() + selectedJob.status.slice(1)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Type</Typography>
                  <Typography variant="body1">
                    {selectedJob.job_type.replace('_', ' ').charAt(0).toUpperCase() + 
                     selectedJob.job_type.replace('_', ' ').slice(1)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Created</Typography>
                  <Typography variant="body1">
                    {new Date(selectedJob.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Updated</Typography>
                  <Typography variant="body1">
                    {selectedJob.updated_at ? new Date(selectedJob.updated_at).toLocaleString() : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Source</Typography>
                  <Typography variant="body1">
                    {sources.find(s => s.id === selectedJob.source_id)?.name || selectedJob.source_id}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Created By</Typography>
                  <Typography variant="body1">{selectedJob.created_by || 'System'}</Typography>
                </Grid>
                
                {selectedJob.start_time && selectedJob.end_time && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Duration</Typography>
                    <Typography variant="body1">
                      {selectedJob.duration ? `${selectedJob.duration.toFixed(2)} seconds` : 'Calculating...'}
                    </Typography>
                  </Grid>
                )}

                {selectedJob.error_message && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" color="error">Error Message</Typography>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        backgroundColor: theme.palette.error.light,
                        maxHeight: 150,
                        overflow: 'auto'
                      }}
                    >
                      <Typography variant="body2" component="pre">
                        {selectedJob.error_message}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                
                {selectedJob.result && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Result Summary</Typography>
                    <Paper 
                      sx={{ 
                        p: 2,
                        backgroundColor: theme.palette.background.default,
                        maxHeight: 150,
                        overflow: 'auto'
                      }}
                    >
                      <Typography variant="body2" component="pre">
                        {JSON.stringify(selectedJob.result, null, 2)}
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {/* Add job steps section */}
                {selectedJob.steps && selectedJob.steps.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mt: 2 }}>Job Steps</Typography>
                    <Paper sx={{ p: 1, mt: 1 }}>
                      {selectedJob.steps.map((step, index) => (
                        <Box key={step.step_id} sx={{ 
                          p: 1, 
                          mb: 1, 
                          backgroundColor: theme.palette.action.hover,
                          borderRadius: 1
                        }}>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2">{step.step_name}</Typography>
                              <Typography variant="body2" sx={{ color: statusColors[step.status] }}>
                                {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">
                                Processed: {step.records_processed} records
                              </Typography>
                              <Typography variant="body2">
                                Failed: {step.records_failed} records
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                )}

                {/* Add logs section */}
                {selectedJob.logs && selectedJob.logs.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mt: 2 }}>Job Logs</Typography>
                    <Paper 
                      sx={{ 
                        mt: 1, 
                        maxHeight: 200, 
                        overflow: 'auto', 
                        backgroundColor: theme.palette.grey[900],
                        color: theme.palette.common.white,
                        fontFamily: 'monospace'
                      }}
                    >
                      {selectedJob.logs.map((log, index) => (
                        <Box key={index} sx={{ p: 0.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                          <Typography variant="caption" 
                            sx={{ 
                              color: log.log_level === 'ERROR' 
                                ? theme.palette.error.light 
                                : log.log_level === 'WARNING'
                                ? theme.palette.warning.light
                                : theme.palette.info.light
                            }}
                          >
                            [{new Date(log.timestamp).toLocaleString()}] [{log.log_level}]
                          </Typography>
                          <Typography variant="body2">{log.message}</Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              {selectedJob.status === 'running' && (
                <Button 
                  color="error" 
                  onClick={() => {
                    cancelJob(selectedJob.job_id);
                    setJobDetailsOpen(false);
                  }}
                >
                  Cancel Job
                </Button>
              )}
              <Button onClick={() => setJobDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ETLMonitoring;