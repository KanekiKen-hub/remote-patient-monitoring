import { useEffect, useState, useCallback } from 'react';
import { Brain, Clock, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import AlertLevelBadge from '../../components/AlertLevelBadge';
import HealthReadingCard from '../../components/HealthReadingCard';
import HealthChart from '../../components/HealthChart';
import SHAPExplanation from '../../components/SHAPExplanation';
import MockSensorPanel from '../../components/MockSensorPanel';
import { readingService } from '../../services/readingService';
import { mlService } from '../../services/mlService';
import { recommendationService } from '../../services/recommendationService';
import { format, parseISO } from 'date-fns';

function safeFormat(ts) {
  try { return format(parseISO(ts), 'MMM d, yyyy HH:mm:ss'); } catch { return ts || '—'; }
}

const levelRecommendationText = {
  1: null,
  2: 'Please monitor your condition. If symptoms worsen, contact your doctor.',
  3: 'Your readings indicate you may need medical attention. Please contact your doctor immediately.',
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const patientId = user?.patientId || user?.id || user?._id;

  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [explanation, setExplanation] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainVisible, setExplainVisible] = useState(false);

  const fetchReadings = useCallback(async () => {
    try {
      const res = await readingService.getReadings(patientId, 20);
      const nextReadings =
        res.data?.data?.readings ??
        res.data?.readings ??
        (Array.isArray(res.data) ? res.data : []);
      setReadings(Array.isArray(nextReadings) ? nextReadings : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchReadings();
    const interval = setInterval(fetchReadings, 3000);
    return () => clearInterval(interval);
  }, [fetchReadings]);

  const handleExplain = async () => {
    setExplainVisible(true);
    setExplainLoading(true);
    try {
      const [expRes, recRes] = await Promise.all([
        mlService.getExplanation(patientId),
        recommendationService.getRecommendation(patientId).catch(() => ({ data: null })),
      ]);
      const expData = expRes.data?.data?.explanation || expRes.data?.explanation || expRes.data;
      const recData = recRes.data?.data?.recommendation || recRes.data?.recommendation || recRes.data;
      setExplanation(expData);
      setRecommendation(recData);
    } catch (err) {
      console.error(err);
    } finally {
      setExplainLoading(false);
    }
  };

  const latestReading = readings[0];
  const currentLevel = latestReading?.alertLevel || 1;

  const hrReadings = readings.slice(0, 2);
  const hrTrend =
    hrReadings.length >= 2
      ? hrReadings[0].heartRate > hrReadings[1].heartRate
        ? 'up'
        : hrReadings[0].heartRate < hrReadings[1].heartRate
        ? 'down'
        : 'stable'
      : 'stable';
  const spo2Trend =
    hrReadings.length >= 2
      ? hrReadings[0].spo2 > hrReadings[1].spo2
        ? 'up'
        : hrReadings[0].spo2 < hrReadings[1].spo2
        ? 'down'
        : 'stable'
      : 'stable';

  const recText =
    recommendation?.[`level${currentLevel}Text`] ||
    recommendation?.[`level${currentLevel}`] ||
    levelRecommendationText[currentLevel];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Health Monitor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome, {user?.name}</p>
        </div>
        {latestReading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {safeFormat(latestReading.timestamp || latestReading.createdAt)}
          </div>
        )}
      </div>

      {/* Metric cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={10} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HealthReadingCard type="hr" value={latestReading?.heartRate} trend={hrTrend} />
            <HealthReadingCard type="spo2" value={latestReading?.spo2} trend={spo2Trend} />
          </div>

          {/* Alert level banner */}
          <AlertLevelBadge level={currentLevel} size="lg" />

          {/* Explain button */}
          <div>
            <Button variant="primary" onClick={handleExplain} loading={explainLoading} className="w-full sm:w-auto">
              <Brain className="h-4 w-4" /> Explain This Reading
            </Button>
          </div>

          {/* Explanation section */}
          {explainVisible && (
            <Card title="AI Reading Explanation">
              {explainLoading ? (
                <div className="flex justify-center py-8"><Spinner size={8} /></div>
              ) : explanation ? (
                <div className="space-y-6">
                  {/* Section A: AI Analysis */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">A. AI Analysis</p>
                    <SHAPExplanation explanation={explanation} />
                  </div>

                  {/* Section B: Doctor's Guidance */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">B. Doctor's Guidance</p>
                    {recText ? (
                      <div className={`p-4 rounded-xl text-sm ${
                        currentLevel === 1 ? 'bg-green-50 text-green-800 border border-green-200'
                          : currentLevel === 2 ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <ShieldCheck className="h-4 w-4 inline mr-2 mb-0.5" />
                        {recText}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No specific guidance from your doctor for this level.</p>
                    )}
                  </div>

                  {/* Disclaimer */}
                  <div className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 italic">
                      This AI analysis explains the monitoring model's pattern detection, not a medical diagnosis.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-6">
                  No readings available to explain yet.
                </p>
              )}
            </Card>
          )}

          {/* Historical chart */}
          <Card title="Reading History" subtitle="Last 20 readings">
            <HealthChart readings={readings} />
          </Card>

          {/* Mock sensor */}
          <MockSensorPanel patientId={patientId} onReadingSent={fetchReadings} />
        </>
      )}
    </div>
  );
}
