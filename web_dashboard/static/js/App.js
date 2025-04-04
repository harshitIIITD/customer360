// Customer360 Dashboard - Main App Component

const { useState, useEffect } = React;

const App = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [systemSummary, setSystemSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load system summary when app initializes
    fetchSystemSummary();
    
    // Check for active page in URL hash
    const hash = window.location.hash.substring(1);
    if (hash) {
      setActivePage(hash);
    }
    
    // Add hash change listener
    const handleHashChange = () => {
      const newHash = window.location.hash.substring(1);
      if (newHash) {
        setActivePage(newHash);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const fetchSystemSummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/system-summary');
      if (response.data.success) {
        setSystemSummary(response.data.system_summary);
      } else {
        setError('Failed to load system summary: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error fetching system summary:', error);
      setError('Failed to load system summary. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNavigation = (page) => {
    setActivePage(page);
    window.location.hash = page;
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard systemSummary={systemSummary} />;
      case 'customer360':
        return <Customer360Data />;
      case 'quality':
        return <DataQuality />;
      case 'lineage':
        return <DataLineage />;
      case 'sources':
        return <SourceSystems />;
      case 'mappings':
        return <DataMappings />;
      case 'etl':
        return <ETLMonitoring />;
      default:
        return <Dashboard systemSummary={systemSummary} />;
    }
  };

  return (
    <div className="app-container">
      <Header />
      
      <div className="main-content">
        <Sidebar 
          activePage={activePage} 
          onNavigate={handleNavigation}
          collapsed={sidebarCollapsed}
        />
        
        <button 
          className={`sidebar-toggle ${sidebarCollapsed ? 'collapsed' : ''}`}
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <i className={`bi bi-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
        </button>
        
        <div className={`page-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {error ? (
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          ) : loading && !systemSummary ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            renderPage()
          )}
        </div>
      </div>
    </div>
  );
};

// Header Component
const Header = () => {
  return (
    <header className="app-header">
      <div className="logo">
        <i className="bi bi-people-fill me-2" style={{ fontSize: '1.75rem' }}></i>
        <h1>Customer 360 Dashboard</h1>
      </div>
      
      <div className="user-menu">
        <div className="dropdown">
          <button className="dropdown-toggle" type="button" id="userMenuDropdown" data-bs-toggle="dropdown" aria-expanded="false">
            <i className="bi bi-person-circle me-2"></i>
            <span>Admin</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuDropdown">
            <li><a className="dropdown-item" href="#"><i className="bi bi-gear me-2"></i> Settings</a></li>
            <li><a className="dropdown-item" href="#"><i className="bi bi-file-earmark-text me-2"></i> Documentation</a></li>
            <li><hr className="dropdown-divider" /></li>
            <li><a className="dropdown-item" href="#"><i className="bi bi-box-arrow-right me-2"></i> Logout</a></li>
          </ul>
        </div>
      </div>
    </header>
  );
};

// Mount the App to the DOM
ReactDOM.render(<App />, document.getElementById('root'));