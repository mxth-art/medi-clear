import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';
import { getRecordDetails, explainReport, getHealthTrends } from '../services/api';
import type { RecordDetails, ReportExplanation, HealthTrend } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import SeverityBadge from '../components/SeverityBadge';
import Alert from '../components/Alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportDetail() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<RecordDetails | null>(null);
  const [explanation, setExplanation] = useState<ReportExplanation | null>(null);
  const [trends, setTrends] = useState<HealthTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'explanation' | 'trends'>('overview');

  useEffect(() => {
    fetchRecordData();
  }, [recordId]);

  const fetchRecordData = async () => {
    if (!recordId) return;

    try {
      setLoading(true);
      const [recordData, explanationData, trendsData] = await Promise.all([
        getRecordDetails(recordId),
        explainReport(recordId).catch(() => null),
        getHealthTrends(recordId).catch(() => ({ test_trends: [] })),
      ]);

      setRecord(recordData);
      setExplanation(explanationData?.explanation || null);
      setTrends(trendsData.test_trends);
    } catch (err) {
      setError('Failed to load report details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert type="error" message={error || 'Record not found'} />
          <button
            onClick={() => navigate('/reports')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Reports
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{record.record_type}</h1>
                <p className="text-blue-100">
                  {record.lab_name} • {new Date(record.report_date).toLocaleDateString()}
                </p>
              </div>
              {explanation && <SeverityBadge level={explanation.risk_level} />}
            </div>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex space-x-1 px-6">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'explanation', label: 'Explanation' },
                { id: 'trends', label: 'Trends' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Results</h3>
                  {Object.keys(record.parsed_data).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                              Test Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                              Your Value
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                              Normal Range
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(record.parsed_data).map(([testName, data]) => (
                            <tr key={testName} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {testName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {data.value} {data.unit}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {data.normal_range[0]} - {data.normal_range[1]} {data.unit}
                              </td>
                              <td className="px-4 py-3">
                                <SeverityBadge level={data.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <p className="text-gray-600">No parsed data available</p>
                    </div>
                  )}
                </div>

                {record.analysis.simple_explanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Summary</h4>
                    <p className="text-blue-800">{record.analysis.simple_explanation}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'explanation' && explanation && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Simple Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{explanation.simple_summary}</p>
                </div>

                {explanation.overall_health_score > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Health Score</h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full ${
                              explanation.overall_health_score >= 80
                                ? 'bg-green-500'
                                : explanation.overall_health_score >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${explanation.overall_health_score}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-3xl font-bold text-gray-900">
                        {explanation.overall_health_score}
                      </span>
                    </div>
                  </div>
                )}

                {explanation.key_findings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Findings</h3>
                    <div className="space-y-3">
                      {explanation.key_findings.map((finding, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{finding.test_name}</h4>
                            <SeverityBadge level={finding.severity} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                              <span className="text-gray-600">Your Value: </span>
                              <span className="font-medium text-gray-900">{finding.your_value}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Normal: </span>
                              <span className="font-medium text-gray-900">{finding.normal_range}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{finding.meaning}</p>
                          <p className="text-sm text-blue-600 font-medium">{finding.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {explanation.positive_findings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Positive Findings</h3>
                    <ul className="space-y-2">
                      {explanation.positive_findings.map((finding, index) => (
                        <li key={index} className="flex items-start text-green-700">
                          <TrendingUp className="w-5 h-5 mr-2 flex-shrink-0" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {explanation.concerns.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Concerns</h3>
                    <ul className="space-y-2">
                      {explanation.concerns.map((concern, index) => (
                        <li key={index} className="flex items-start text-red-700">
                          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {explanation.next_steps.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-3">Next Steps</h3>
                    <ul className="space-y-2">
                      {explanation.next_steps.map((step, index) => (
                        <li key={index} className="text-yellow-800">
                          • {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="space-y-6">
                {trends.length > 0 ? (
                  trends.map((trend, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{trend.test_name}</h3>
                        <SeverityBadge
                          level={
                            trend.trend_direction === 'IMPROVING'
                              ? 'NORMAL'
                              : trend.trend_direction === 'WORSENING'
                              ? 'URGENT'
                              : 'MODERATE'
                          }
                          label={trend.trend_direction}
                        />
                      </div>
                      {trend.historical_values.length > 1 && (
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={trend.historical_values}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      <div className="mt-4 text-sm text-gray-600">
                        <p>
                          Velocity: {trend.velocity > 0 ? '+' : ''}
                          {trend.velocity}
                        </p>
                        {trend.forecast && <p>Forecast: {trend.forecast}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 rounded-lg p-12 text-center">
                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No trend data available
                    </h3>
                    <p className="text-gray-600">Upload more reports to see health trends over time</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
