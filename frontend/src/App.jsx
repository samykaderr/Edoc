import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateForm from './pages/CreateForm';
import ViewForm from './pages/ViewForm';
import DocumentsList from './pages/DocumentsList';
import './components/Layout/Layout.css';
import './components/Sidebar/Sidebar.css';
import './components/TopNav/TopNav.css';
import './components/Dashboard/Dashboard.css';
import './components/FormRenderer/FormRenderer.css';
import './components/Shared/EmployeeLookup.css';
import './components/Shared/Skeleton.css';
import DocumentTypeManager from './pages/DocumentTypeManager';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path='/document-manager/:schemaName' element={<DocumentTypeManager />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<DocumentsList />} />
          <Route path="/create" element={<CreateForm />} />
          <Route path="/view/:schemaName" element={<ViewForm />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
