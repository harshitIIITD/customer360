// Customer360 Dashboard - Sidebar Navigation Component

const Sidebar = ({ activePage, onNavigate, collapsed }) => {
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'bi-speedometer2'
    },
    {
      id: 'customer360',
      label: 'Customer 360 Data',
      icon: 'bi-people'
    },
    {
      id: 'quality',
      label: 'Data Quality',
      icon: 'bi-shield-check'
    },
    {
      id: 'lineage',
      label: 'Data Lineage',
      icon: 'bi-diagram-3'
    },
    {
      id: 'sources',
      label: 'Source Systems',
      icon: 'bi-database'
    },
    {
      id: 'mappings',
      label: 'Data Mappings',
      icon: 'bi-arrows-angle-contract'
    },
    {
      id: 'etl',
      label: 'ETL Monitoring',
      icon: 'bi-arrow-repeat'
    }
  ];
  
  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <ul className="sidebar-nav">
        {navigationItems.map(item => (
          <li key={item.id} className="nav-item">
            <a 
              href={`#${item.id}`}
              className={`nav-link ${activePage === item.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
        
        <li className="nav-item mt-4">
          <hr className="dropdown-divider mx-3" />
        </li>
        
        <li className="nav-item">
          <a 
            href="#" 
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              // This would trigger the Customer360 build process
              if (confirm('Are you sure you want to rebuild the Customer 360 view? This may take some time.')) {
                axios.post('/api/build-customer360', {
                  include_pending: false
                })
                .then(response => {
                  if (response.data.success) {
                    alert('Customer 360 build initiated successfully.');
                  } else {
                    alert(`Error: ${response.data.error}`);
                  }
                })
                .catch(error => {
                  console.error('Error building Customer 360:', error);
                  alert('Failed to initiate Customer 360 build. Check console for details.');
                });
              }
            }}
          >
            <i className="bi bi-play-circle"></i>
            <span>Run Customer 360 Build</span>
          </a>
        </li>
        
        <li className="nav-item">
          <a 
            href="#" 
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              // Open documentation in a new tab/window
              window.open('/docs', '_blank');
            }}
          >
            <i className="bi bi-file-earmark-text"></i>
            <span>Documentation</span>
          </a>
        </li>
      </ul>
      
      <div className="mt-auto p-3 small text-muted">
        <div>Customer 360 Dashboard</div>
        <div>Version 1.0.0</div>
      </div>
    </aside>
  );
};