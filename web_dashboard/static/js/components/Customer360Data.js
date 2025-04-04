// Customer360 Dashboard - Customer360 Data View Component

const { useState, useEffect } = React;

const Customer360Data = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [columns, setColumns] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomerData();
  }, [page, limit, filters]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      // Build query params for API call
      const params = new URLSearchParams({
        limit: limit,
      });
      
      // Add active filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await axios.get(`/api/customer360-data?${params.toString()}`);
      
      if (response.data.success) {
        setCustomers(response.data.customers || []);
        setTotalRecords(response.data.count || 0);
        
        // Extract column names from first customer if available
        if (response.data.customers && response.data.customers.length > 0) {
          setColumns(Object.keys(response.data.customers[0])
            .filter(key => key !== 'id' && key !== 'data_sources') // Exclude certain columns
          );
        }
      } else {
        console.error('Error fetching Customer 360 data:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching Customer 360 data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1); // Reset to first page when filters change
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearch = () => {
    if (searchTerm.trim()) {
      // Add search term to filters
      setFilters(prev => ({
        ...prev,
        search: searchTerm
      }));
    } else {
      // Remove search filter if search term is empty
      const newFilters = { ...filters };
      delete newFilters.search;
      setFilters(newFilters);
    }
    setPage(1); // Reset to first page
  };
  
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(1);
  };
  
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  const handleLimitChange = (e) => {
    setLimit(parseInt(e.target.value, 10));
    setPage(1); // Reset to first page when limit changes
  };
  
  const viewCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
  };
  
  const closeCustomerDetails = () => {
    setSelectedCustomer(null);
  };

  return (
    <div className="customer360-container">
      <div className="dashboard-card mb-4">
        <div className="card-header">
          <h3 className="card-title">Customer 360 View</h3>
          <div className="d-flex">
            <button className="btn btn-sm btn-primary me-2" onClick={fetchCustomerData}>
              <i className="bi bi-arrow-repeat"></i> Refresh
            </button>
            <button className="btn btn-sm btn-outline-primary" onClick={clearFilters}>
              <i className="bi bi-x-circle"></i> Clear Filters
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Search and Filters */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="input-group">
                <input 
                  type="text"
                  className="form-control"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleSearch}
                >
                  <i className="bi bi-search"></i> Search
                </button>
              </div>
            </div>
            <div className="col-md-6">
              <div className="row">
                <div className="col-6">
                  <select 
                    className="form-select"
                    aria-label="Filter by data source"
                    name="data_source"
                    value={filters.data_source || ''}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Data Sources</option>
                    <option value="CORE_BANKING">Core Banking</option>
                    <option value="CRM">CRM</option>
                    <option value="ONLINE_BANKING">Online Banking</option>
                    <option value="CARD_SYSTEM">Card System</option>
                  </select>
                </div>
                <div className="col-6">
                  <select 
                    className="form-select"
                    aria-label="Records per page"
                    value={limit}
                    onChange={handleLimitChange}
                  >
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Data Table */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : customers.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      {columns.map(column => (
                        <th key={column}>{formatColumnName(column)}</th>
                      ))}
                      <th>Data Sources</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(customer => (
                      <tr key={customer.customer_id}>
                        <td>{customer.customer_id}</td>
                        {columns.map(column => (
                          <td key={column}>{renderCellValue(customer[column])}</td>
                        ))}
                        <td>
                          {renderDataSources(customer.data_sources)}
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => viewCustomerDetails(customer)}
                          >
                            <i className="bi bi-eye"></i> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div>
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} customers
                </div>
                <nav aria-label="Customer data pagination">
                  <ul className="pagination">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(Math.min(5, Math.ceil(totalRecords / limit)))].map((_, i) => (
                      <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => handlePageChange(i + 1)}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${page >= Math.ceil(totalRecords / limit) ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= Math.ceil(totalRecords / limit)}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </>
          ) : (
            <div className="alert alert-info">
              No customer records found. {Object.keys(filters).length > 0 && 'Try clearing the filters.'}
            </div>
          )}
        </div>
      </div>
      
      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal 
          customer={selectedCustomer} 
          onClose={closeCustomerDetails} 
        />
      )}
    </div>
  );
};

// Customer Details Modal Component
const CustomerDetailsModal = ({ customer, onClose }) => {
  if (!customer) return null;
  
  // Parse data sources
  let dataSources = [];
  try {
    if (typeof customer.data_sources === 'string') {
      dataSources = JSON.parse(customer.data_sources);
    } else if (Array.isArray(customer.data_sources)) {
      dataSources = customer.data_sources;
    }
  } catch (error) {
    console.error('Error parsing data sources:', error);
  }
  
  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Customer Details: {customer.customer_id}</h5>
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
                    <h5 className="card-title">Basic Information</h5>
                  </div>
                  <div className="card-body">
                    <table className="table table-borderless">
                      <tbody>
                        {Object.entries(customer)
                          .filter(([key]) => 
                            key !== 'data_sources' && 
                            key !== 'id' &&
                            !key.includes('address') && 
                            !key.includes('contact')
                          )
                          .map(([key, value]) => (
                            <tr key={key}>
                              <td><strong>{formatColumnName(key)}</strong></td>
                              <td>{renderCellValue(value)}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header">
                    <h5 className="card-title">Contact Information</h5>
                  </div>
                  <div className="card-body">
                    <table className="table table-borderless">
                      <tbody>
                        {Object.entries(customer)
                          .filter(([key]) => 
                            key.includes('address') || 
                            key.includes('contact') ||
                            key.includes('phone') ||
                            key.includes('email')
                          )
                          .map(([key, value]) => (
                            <tr key={key}>
                              <td><strong>{formatColumnName(key)}</strong></td>
                              <td>{renderCellValue(value)}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title">Data Sources</h5>
                  </div>
                  <div className="card-body">
                    <div className="mb-0">
                      {dataSources.length > 0 ? (
                        <ul className="list-group">
                          {dataSources.map((source, index) => (
                            <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                              {source}
                              <span className="badge bg-primary rounded-pill">
                                <i className="bi bi-check-circle-fill"></i>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted">No data source information available</p>
                      )}
                    </div>
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
const formatColumnName = (columnName) => {
  if (!columnName) return '';
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const renderCellValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  return value.toString();
};

const renderDataSources = (dataSources) => {
  let sources = [];
  
  try {
    if (typeof dataSources === 'string') {
      sources = JSON.parse(dataSources);
    } else if (Array.isArray(dataSources)) {
      sources = dataSources;
    }
  } catch (error) {
    return '-';
  }
  
  if (!sources.length) return '-';
  
  return (
    <div>
      {sources.slice(0, 2).map((source, index) => (
        <span key={index} className="badge bg-info me-1">{source}</span>
      ))}
      {sources.length > 2 && (
        <span className="badge bg-secondary">+{sources.length - 2}</span>
      )}
    </div>
  );
};

// Make component available globally
window.Customer360Data = Customer360Data;

// Export the component
export default Customer360Data;