// Customer360 Dashboard - Header Component

const Header = ({ title, onRefresh }) => {
  return (
    <header className="dashboard-header">
      <h1 className="dashboard-title">{title}</h1>
      <div>
        <button 
          className="btn btn-outline-primary me-2" 
          onClick={onRefresh}
          title="Refresh Data"
        >
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>
    </header>
  );
};