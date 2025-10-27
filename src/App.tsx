import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SymptomChecker from './pages/SymptomChecker';
import UploadRecords from './pages/UploadRecords';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import HealthChat from './pages/HealthChat';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/symptom-checker" element={<SymptomChecker />} />
          <Route path="/upload-records" element={<UploadRecords />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:recordId" element={<ReportDetail />} />
          <Route path="/chat" element={<HealthChat />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
