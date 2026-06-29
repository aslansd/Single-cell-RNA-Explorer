import { useState, useMemo } from "react";
import { Sliders, CheckCircle, HelpCircle, ArrowRight, Activity, Zap } from "lucide-react";
import { Gene } from "../types.js";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";

interface NormalizationStepProps {
  genes: Gene[];
  onComplete: (hvgGenes: string[]) => void;
}

export default function NormalizationStep({ genes, onComplete }: NormalizationStepProps) {
  const [numHvgs, setNumHvgs] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);

  // Compute highly variable genes based on selected threshold
  const computedGenes = useMemo(() => {
    // Sort by dispersion descending to label top N as HVGs
    const sorted = [...genes].sort((a, b) => b.dispersion - a.dispersion);
    const hvgSet = new Set(sorted.slice(0, numHvgs).map(g => g.name));

    return genes.map(g => ({
      ...g,
      isHVG: hvgSet.has(g.name),
      fill: hvgSet.has(g.name) ? "#f97316" : "#94a3b8"
    }));
  }, [genes, numHvgs]);

  const hvgList = useMemo(() => {
    return computedGenes.filter(g => g.isHVG).map(g => g.name);
  }, [computedGenes]);

  const handleApply = () => {
    setIsProcessing(true);
    // Simulate short computational calculation delay
    setTimeout(() => {
      onComplete(hvgList);
      setIsProcessing(false);
    }, 800);
  };

  return (
    <div className="space-y-6" id="normalization-step">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-sans font-medium text-gray-900">Log-Normalization & Feature Selection</h2>
        <p className="text-xs text-gray-500">
          Transform raw counts using log-scale CPM-like scaling to prevent highly expressed genes from dominating downstream variance. Then, select Highly Variable Genes (HVGs) to focus embeddings on cell-to-cell differences.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Sliders & Stats (5 cols) */}
        <div className="xl:col-span-5 flex flex-col justify-between bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <Sliders className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-gray-900">Feature Selection Parameters</span>
            </div>

            {/* Slider to select number of HVGs */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Target Highly Variable Genes (HVG)</span>
                <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{numHvgs} / {genes.length}</span>
              </div>
              <input
                type="range"
                min="3"
                max={genes.length}
                step="1"
                value={numHvgs}
                onChange={(e) => setNumHvgs(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="text-[10px] text-gray-400 block leading-normal">
                Standard single-cell pipelines select the top dispersion scores to filter out ambient or invariant housekeeping genes.
              </span>
            </div>

            {/* Normalization Type Info */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>Log-Normalizing Scaling Formula</span>
              </div>
              <p className="text-slate-500 font-mono bg-slate-100 p-2 rounded text-center select-all border border-slate-200">
                X_norm = ln( (X_raw / Depth) * 10,000 + 1 )
              </p>
              <p className="text-slate-600 leading-normal pt-1">
                This centers reads into Counts-Per-Ten-Thousand (CP10K) equivalent, which accounts for cell size differences before applying logarithmic variance stabilization.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-50">
            <div className="flex flex-wrap gap-1.5">
              {hvgList.map(gName => (
                <span key={`hvg-badge-${gName}`} className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                  {gName}
                </span>
              ))}
            </div>

            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {isProcessing ? (
                <>
                  <Zap className="w-4 h-4 animate-spin text-white" />
                  Calculating Variance Co-factors...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Select Features & Run Dimensional Reduction
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Dispersion vs Mean Scatter Plot (7 cols) */}
        <div className="xl:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-800">Highly Variable Genes (HVG) Selection Plot</span>
            <div className="flex gap-4 text-[10px]">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span><span className="text-gray-500">Highly Variable (Selected)</span></div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-400 rounded-full"></span><span className="text-gray-500">Ambient / Housekeeping</span></div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 15, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="meanExpression" name="Mean Expression" stroke="#94a3b8" fontSize={9} label={{ value: "Mean Expression level (log)", fill: "#94a3b8", fontSize: 9, position: "insideBottom", offset: -5 }} />
                <YAxis type="number" dataKey="dispersion" name="Dispersion" stroke="#94a3b8" fontSize={9} label={{ value: "Standardized Dispersion Score", fill: "#94a3b8", fontSize: 9, angle: -90, position: "insideLeft", offset: 10 }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const gene = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-[10px] p-2 rounded shadow-md font-mono border border-slate-800">
                          <div className="font-semibold text-amber-400">{gene.name}</div>
                          <div>Mean Expr: {gene.meanExpression.toFixed(3)}</div>
                          <div>Dispersion: {gene.dispersion.toFixed(3)}</div>
                          <div className={gene.isHVG ? "text-orange-400 font-semibold" : "text-slate-400"}>
                            Classification: {gene.isHVG ? "Highly Variable" : "Standard Filtered"}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Genes" data={computedGenes}>
                  {computedGenes.map((entry, index) => (
                    <circle
                      key={`gene-dot-${index}`}
                      cx={0}
                      cy={0}
                      r={entry.isHVG ? 6 : 4}
                      fill={entry.fill}
                      opacity={entry.isHVG ? 0.9 : 0.6}
                      className="cursor-pointer transition-all hover:scale-125"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
