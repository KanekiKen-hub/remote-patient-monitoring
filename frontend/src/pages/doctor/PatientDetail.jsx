import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Brain, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import AlertLevelBadge from '../../components/AlertLevelBadge';
import HealthReadingCard from '../../components/HealthReadingCard';
import HealthChart from '../../components/HealthChart';
import SHAPExplanation from '../../components/SHAPExplanation';
import { patientService } from '../../services/patientService';
import { readingService } from '../../services/readingService';
import { alertService } from '../../services/alertService';
import { mlService } from '../../services/mlService';
import { recommendationService } from '../../services/recommendationService';
import { format, parseISO } from 'date-fns';

function safeFormat(ts) {
  try { return format(parseISO(ts), 'MMM d, yyyy HH:mm'); } catch { return ts || '—'; }
}

export default function PatientDetail() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [explainOpen, setExplainOpen] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);

  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, rRes, aRes] = await Promise.all([
        patientService.getPatient(patientId),
        readingService.getReadings(patientId, 50),
        alertService.getPatientAlerts(patientId),
      ]);
      setPatient(pRes.data?.data?.patient ?? pRes.data?.patient ?? pRes.data ?? null);
      const nextReadings =
        rRes.data?.data?.readings ??
        rRes.data?.readings ??
        (Array.isArray(rRes.data) ? rRes.data : []);
      const nextAlerts =
        aRes.data?.data?.alerts ??
        aRes.data?.alerts ??
        (Array.isArray(aRes.data) ? aRes.data : []);
      setReadings(Array.isArray(nextReadings) ? nextReadings : []);
      setAlerts(Array.isArray(nextAlerts) ? nextAlerts : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleExplain = async () => {
    setExplainOpen(true);
    if (explanation) return;
    setExplainLoading(true);
    try {
      const [expRes, recRes] = await Promise.all([
        mlService.getExplanation(patientId),
        recommendationService.getRecommendation(patientId).catch(() => ({ data: null })),
      ]);
      setExplanation(expRes.data);
      const recData = recRes.data?.data?.recommendation || recRes.data?.recommendation || recRes.data;
      setRecommendation(recData);
    } catch (err) {
      console.error('Explain error', err);
    } finally {
      setExplainLoading(false);
    }
  };

  const submitFeedback = async (correct) => {
    const latestAlert = alerts.find((a) => !a.reviewed);
    if (!latestAlert) return;
    setFeedbackLoading(true);
    try {
      await alertService.submitFeedback(latestAlert._id || latestAlert.id, latestAlert.readingId, correct, '');
      await alertService.reviewAlert(latestAlert._id || latestAlert.id);
      setFeedbackDone(true);
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const latestReading = readings[0];
  const currentLevel = patient?.alertLevel || latestReading?.alertLevel || 1;
  const unreviewedAlert = alerts.find((a) => !a.reviewed);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={10} /></div>;
  }

  if (!patient) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-medium">Patient not found</p>
        <Link to="/doctor/patients" className="text-blue-600 text-sm mt-2 inline-block">← Back to patients</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/doctor/patients" className="hover:text-blue-600 transition-colors">Patients</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-semibold text-gray-900">{patient.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patient.email} · {patient.gender} · DOB: {patient.dob || '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Button variant="primary" onClick={handleExplain}>
            <Brain className="h-4 w-4" /> Explain Latest Reading
          </Button>
        </div>
      </div>

      {/* Current readings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HealthReadingCard type="hr" value={latestReading?.heartRate} />
        <HealthReadingCard type="spo2" value={latestReading?.spo2} />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-2">Alert Level</p>
          <AlertLevelBadge level={currentLevel} size="lg" />
          {latestReading && (
            <p className="text-xs text-gray-400 mt-3">
              Updated: {safeFormat(latestReading.timestamp || latestReading.createdAt)}
            </p>
          )}
        </div>
      </div>

      {/* Feedback on unreviewed alert */}
      {unreviewedAlert && !feedbackDone && (
        <Card title="AI Prediction Feedback" subtitle="Help improve the model by rating the last alert">
          <div className="flex items-center gap-3">
            <Button
              variant="success"
              size="sm"
              loading={feedbackLoading}
              onClick={() => submitFeedback(true)}
            >
              <ThumbsUp className="h-4 w-4" /> AI Prediction Correct
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={feedbackLoading}
              onClick={() => submitFeedback(false)}
            >
              <ThumbsDown className="h-4 w-4" /> AI Prediction Incorrect
            </Button>
          </div>
        </Card>
      )}
      {feedbackDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
          ✓ Feedback submitted. Thank you for helping improve the model.
        </div>
      )}

      {/* Chart */}
      <Card title="Historical Readings" subtitle="Last 50 readings">
        <HealthChart readings={readings} />
      </Card>

      {/* Recent readings table */}
      <Card title="Recent Readings">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 pr-4">Timestamp</th>
                <th className="pb-3 pr-4">HR (BPM)</th>
                <th className="pb-3 pr-4">SpO2 (%)</th>
                <th className="pb-3">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {readings.slice(0, 10).map((r) => (
                <tr key={r._id || r.id} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-4 text-gray-500">{safeFormat(r.timestamp || r.createdAt)}</td>
                  <td className="py-2.5 pr-4 font-semibold text-gray-900">{r.heartRate}</td>
                  <td className="py-2.5 pr-4 font-semibold text-gray-900">{r.spo2}%</td>
                  <td className="py-2.5"><AlertLevelBadge level={r.alertLevel || 1} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {readings.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No readings yet</p>
          )}
        </div>
      </Card>

      {/* Alert history */}
      <Card title="Alert History">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 pr-4">Time</th>
                <th className="pb-3 pr-4">Level</th>
                <th className="pb-3 pr-4">HR</th>
                <th className="pb-3 pr-4">SpO2</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alerts.slice(0, 10).map((a) => (
                <tr key={a._id || a.id} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-4 text-gray-500">{safeFormat(a.createdAt)}</td>
                  <td className="py-2.5 pr-4"><AlertLevelBadge level={a.alertLevel || a.level} size="sm" /></td>
                  <td className="py-2.5 pr-4 text-gray-700">{a.heartRate}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{a.spo2}%</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-medium ${a.reviewed ? 'text-green-600' : 'text-amber-600'}`}>
                      {a.reviewed ? 'Reviewed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {alerts.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No alerts for this patient</p>
          )}
        </div>
      </Card>

      {/* Explain modal */}
      <Modal isOpen={explainOpen} onClose={() => setExplainOpen(false)} title="AI Reading Explanation">
        {explainLoading ? (
          <div className="flex justify-center py-8"><Spinner size={8} /></div>
        ) : explanation ? (
          <div className="space-y-6">
            {/* Section A: AI Analysis */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                A. AI Analysis
              </h4>
              <SHAPExplanation explanation={explanation} />
            </div>
            {/* Section B: Doctor Recommendation */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                B. Doctor's Recommendation
              </h4>
              {recommendation ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((lvl) => (
                    <div key={lvl} className={`p-3 rounded-lg text-sm ${lvl === 1 ? 'bg-green-50 text-green-800' : lvl === 2 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
                      <strong>Level {lvl}:</strong> {recommendation[`level${lvl}Text`] || recommendation[`level${lvl}`] || 'No recommendation set'}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No recommendations set for this patient.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">Failed to load explanation.</p>
        )}
      </Modal>
    </div>
  );
}
