import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Building2, TrendingUp } from 'lucide-react';
import { getMedicalRecords } from '../services/api';
import type { MedicalRecord } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import SeverityBadge from '../components/SeverityBadge';
import Alert from '../components/Alert';

export default function Reports() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await getMedicalRecords({
        limit: 50,
        offset: 0,
        record_type: filter || undefined,
      });
      setRecords(data.records);
    } catch (err) {
      setError('Failed to load records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const recordTypes = ['All', 'Blood Test', 'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'ECG', 'Other'];

  const getRecordIcon = (type: string) => {
    return <FileText className="w-6 h-6" />;
  };

  const getRecordColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Blood Test': 'from-red-500 to-pink-500',
      'X-Ray': 'from-gray-500 to-gray-700',
      'MRI': 'from-blue-500 to-cyan-500',
      'CT Scan': 'from-green-500 to-emerald-500',
      'Ultrasound': 'from-purple-500 to-pink-500',
      'ECG': 'from-orange-500 to-red-500',
    };
    return colors[type] || 'from-gray-500 to-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Medical Reports</h1>
          <p className="text-gray-600">View and manage all your medical records</p>
        </div>

        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-2">
            {recordTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type === 'All' ? '' : type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (filter === '' && type === 'All') || filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No records found</h3>
            <p className="text-gray-600 mb-6">Upload your first medical record to get started</p>
            <button
              onClick={() => navigate('/upload-records')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Upload Record
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {records.map((record) => (
              <div
                key={record.record_id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                onClick={() => navigate(`/reports/${record.record_id}`)}
              >
                <div className={`h-2 bg-gradient-to-r ${getRecordColor(record.record_type)}`}></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${getRecordColor(record.record_type)} text-white`}>
                      {getRecordIcon(record.record_type)}
                    </div>
                    <SeverityBadge level={record.status} />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{record.record_type}</h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(record.report_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Building2 className="w-4 h-4 mr-2" />
                      {record.lab_name}
                    </div>
                  </div>

                  <button className="mt-4 w-full bg-blue-50 text-blue-600 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
