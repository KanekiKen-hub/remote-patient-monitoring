import { useEffect, useState, useCallback } from 'react';
import { Save, Info } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import AlertBanner from '../../components/ui/AlertBanner';
import AlertLevelBadge from '../../components/AlertLevelBadge';
import { patientService } from '../../services/patientService';
import { recommendationService } from '../../services/recommendationService';

function RecommendationForm({ patient }) {
  const [rec, setRec] = useState(null);
  const [form, setForm] = useState({ level1: '', level2: '', level3: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const patientId = patient._id || patient.id;

  useEffect(() => {
    recommendationService.getRecommendation(patientId)
      .then((res) => {
        const raw = res.data?.data?.recommendation ?? res.data?.recommendation ?? res.data;
        const data = raw && typeof raw === 'object' ? raw : null;
        if (data) {
          setRec(data);
          setForm({ level1: data.level1 || '', level2: data.level2 || '', level3: data.level3 || '' });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      if (rec) {
        await recommendationService.updateRecommendation(rec._id || rec.id, { patientId, ...form });
      } else {
        const res = await recommendationService.createRecommendation({ patientId, ...form });
        setRec(res.data);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-4 flex justify-center"><Spinner size={5} /></div>;

  return (
    <div className="space-y-4">
      {success && <AlertBanner variant="success" message="Recommendations saved successfully." dismissible />}
      {error && <AlertBanner variant="error" message={error} dismissible />}

      {[1, 2, 3].map((lvl) => (
        <div key={lvl}>
          <div className="flex items-center gap-2 mb-1.5">
            <AlertLevelBadge level={lvl} size="sm" />
            <label className="text-sm font-medium text-gray-700">Recommendation</label>
          </div>
          <textarea
            value={form[`level${lvl}`]}
            onChange={(e) => setForm({ ...form, [`level${lvl}`]: e.target.value })}
            placeholder={`Guidance for Level ${lvl} alerts...`}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      ))}

      <Button variant="primary" loading={saving} onClick={handleSave}>
        <Save className="h-4 w-4" /> Save Recommendations
      </Button>
    </div>
  );
}

export default function RecommendationEditor() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await patientService.getPatients();
      const list =
        res.data?.data?.patients ??
        res.data?.patients ??
        (Array.isArray(res.data) ? res.data : []);
      setPatients(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { fetchPatients(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Set patient-specific guidance for each alert level</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          These recommendations will be shown to patients during alerts.{' '}
          <strong>Do not include medication prescriptions.</strong>
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={8} /></div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No patients found</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient list */}
          <div className="lg:col-span-1">
            <Card title="Patients">
              <div className="space-y-1">
                {patients.map((p) => (
                  <button
                    key={p._id || p.id}
                    onClick={() => setSelected(p)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      selected?._id === p._id || selected?.id === p.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3">
            {selected ? (
              <Card title={`Recommendations for ${selected.name}`}>
                <RecommendationForm patient={selected} key={selected._id || selected.id} />
              </Card>
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">Select a patient to edit recommendations</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
