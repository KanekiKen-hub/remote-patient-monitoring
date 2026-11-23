import { Info } from 'lucide-react';

const featureLabels = {
  heartRate: 'Heart Rate',
  spo2: 'Blood Oxygen (SpO2)',
  prevHeartRate: 'Previous Heart Rate',
  prevSpo2: 'Previous SpO2',
  hrChange: 'Heart Rate Change',
  spo2Change: 'SpO2 Change',
};

function ContributionLabel({ normalized }) {
  if (normalized >= 0.67) return <span className="text-xs font-semibold text-red-600">High</span>;
  if (normalized >= 0.33) return <span className="text-xs font-semibold text-amber-600">Medium</span>;
  return <span className="text-xs font-semibold text-green-600">Low</span>;
}

export default function SHAPExplanation({ explanation }) {
  if (!explanation) return null;

  // Normalize: explanation may have shapValues array or nested in shapValues.shapValues
  const features = Array.isArray(explanation?.shapValues)
    ? explanation.shapValues
    : Array.isArray(explanation?.shapValues?.shapValues)
    ? explanation.shapValues.shapValues
    : Array.isArray(explanation?.features)
    ? explanation.features
    : [];
  const maxAbs = Math.max(...features.map((f) => Math.abs(f.shapValue ?? f.value ?? 0)), 0.001);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-blue-500" />
          Why did this alert occur?
        </h4>
        <div className="space-y-3">
          {features.map((feat, idx) => {
            const name = featureLabels[feat.feature] || feat.feature;
            const shapVal = feat.shapValue ?? feat.value ?? 0;
            const absVal = Math.abs(shapVal);
            const normalized = absVal / maxAbs;
            const barWidth = Math.max(normalized * 100, 4);
            const positive = shapVal > 0;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{name}</span>
                  <div className="flex items-center gap-3">
                    {feat.actualValue != null && (
                      <span className="text-gray-500 text-xs">
                        Value: <strong>{feat.actualValue}</strong>
                      </span>
                    )}
                    <ContributionLabel normalized={normalized} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all ${positive ? 'bg-orange-400' : 'bg-green-400'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">
                    {positive ? '+' : ''}{shapVal.toFixed(3)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-orange-400 inline-block" /> Increases alert level
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-green-400 inline-block" /> Reduces alert level
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-3">
        This explanation reflects pattern analysis by the monitoring model. It is not a medical diagnosis.
      </p>
    </div>
  );
}
