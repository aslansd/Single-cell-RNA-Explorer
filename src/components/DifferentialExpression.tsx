import { useState, useMemo } from "react";
import { ArrowLeftRight, CheckCircle, ListFilter, HelpCircle, Activity, Sparkles } from "lucide-react";
import { Cell, ClusterInfo, DifferentialExpressionResult } from "../types.js";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";

interface DifferentialExpressionProps {
  cells: Cell[];
  clusters: ClusterInfo[];
  expressions: Record<string, number[]>;
  onRunDE: (clusterAId: number, clusterBId: number) => Promise<DifferentialExpressionResult[]>;
}

export default function DifferentialExpression({ cells, clusters, expressions, onRunDE }: DifferentialExpressionProps) {
  const [clusterA, setClusterA] = useState(0);
  const [clusterB, setClusterB] = useState(1);
  const [deResults, setDeResults] = useState<DifferentialExpressionResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clusterChoices = useMemo(() => {
    return clusters.map(c => ({ id: c.id, label: c.predictedType || `Cluster ${c.id}` }));
  }, [clusters]);

  const handleCalculate = async () => {
    if (clusterA === clusterB) {
      setError("Please select two different clusters to perform differential comparison.");
      return;
    }
    setError(null);
    setIsCalculating(true);

    try {
      const results = await onRunDE(clusterA, clusterB);
      setDeResults(results);
    } catch (err: any) {
      setError(err.message || "Failed to calculate differential expression.");
    } finally {
      setIsCalculating(false);
    }
  };

  // Process DE results for Volcano Plot rendering
  const volcanoData = useMemo(() => {
    return deResults.map(res => {
      // Calculate -log10 of pValue
      const logPValue = -Math.log10(res.pValue || 1);
      
      // Categorize gene upregulation status
      let significance = "NS"; // Non-significant
      let fill = "#94a3b8"; // slate-400

      if (logPValue > 1.3 && res.log2FC >= 1.0) {
        significance = "Upregulated in A";
        fill = "#ef4444"; // red-500
      } else if (logPValue > 1.3 && res.log2FC <= -1.0) {
        significance = "Upregulated in B";
        fill = "#3b82f6"; // blue-500
      }

      return {
        ...res,
        logPValue: parseFloat(logPValue.toFixed(4)),
        significance,
        fill
      };
    });
  }, [deResults]);

  // Top Up-regulated genes in Cluster A (Positive log2FC)
  const topUpGenes = useMemo(() => {
    return volcanoData
      .filter(g => g.log2FC > 0.5)
      .sort((a, b) => b.log2FC - a.log2FC)
      .slice(0, 5);
  }, [volcanoData]);

  // Top Up-regulated genes in Cluster B (Negative log2FC / Down-regulated in A)
  const topDownGenes = useMemo(() => {
    return volcanoData
      .filter(g => g.log2FC < -0.5)
      .sort((a, b) => a.log2FC - b.log2FC)
      .slice(0, 5);
  }, [volcanoData]);

  const clusterAName = clusterChoices.find(c => c.id === clusterA)?.label || `Cluster ${clusterA}`;
  const clusterBName = clusterChoices.find(c => c.id === clusterB)?.label || `Cluster ${clusterB}`;

  return (
    <div className="space-y-6" id="differential-expression-step">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-sans font-medium text-gray-900">Pairwise Differential Gene Expression</h2>
        <p className="text-xs text-gray-500">
          Compare transcription profiles between any two cell clusters to automatically discover statistically significant marker genes that distinguish their identities.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
          {/* Cluster A Select */}
          <div className="w-full space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Group A (Base)</label>
            <select
              value={clusterA}
              onChange={(e) => setClusterA(parseInt(e.target.value))}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-medium focus:outline-indigo-500"
            >
              {clusterChoices.map(c => (
                <option key={`de-choice-a-${c.id}`} value={c.id}>
                  {c.label} (Cluster {c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Interchange Arrow */}
          <ArrowLeftRight className="w-5 h-5 text-slate-400 mt-5 hidden sm:block flex-shrink-0" />

          {/* Cluster B Select */}
          <div className="w-full space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Group B (Comparison)</label>
            <select
              value={clusterB}
              onChange={(e) => setClusterB(parseInt(e.target.value))}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-medium focus:outline-indigo-500"
            >
              {clusterChoices.map(c => (
                <option key={`de-choice-b-${c.id}`} value={c.id}>
                  {c.label} (Cluster {c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Compute Button */}
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="w-full sm:w-auto self-end bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-all h-[42px] mt-5 flex items-center justify-center gap-2 flex-shrink-0"
          >
            {isCalculating ? (
              <Sparkles className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            {isCalculating ? "Calculating..." : "Compute DE"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs text-center max-w-lg mx-auto">
            {error}
          </div>
        )}
      </div>

      {deResults.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Volcano Plot (7 cols) */}
          <div className="xl:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-[420px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">Volcano Plot Matrix Comparison</span>
              <div className="flex gap-4 text-[9px] font-mono">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span><span>Up in Group A</span></div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span><span>Up in Group B</span></div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-400 rounded-full"></span><span>NS / LogFold &lt; 1</span></div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 15, bottom: 20, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="log2FC" name="Log2FC" stroke="#94a3b8" fontSize={9} domain={[-5, 5]} label={{ value: "log2 Fold Change", fill: "#94a3b8", fontSize: 9, position: "insideBottom", offset: -5 }} />
                  <YAxis type="number" dataKey="logPValue" name="-log10(p)" stroke="#94a3b8" fontSize={9} domain={[0, "auto"]} label={{ value: "-log10 p-value", fill: "#94a3b8", fontSize: 9, angle: -90, position: "insideLeft", offset: 12 }} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const gene = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-[10px] p-2.5 rounded-lg shadow-md font-mono border border-slate-800 space-y-1">
                            <div className="font-semibold text-amber-400">{gene.gene}</div>
                            <div>Log2 FC: {gene.log2FC.toFixed(4)}</div>
                            <div>p-value: {gene.pValue.toExponential(3)}</div>
                            <div style={{ color: gene.fill }}>
                              Significance: {gene.significance}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Genes" data={volcanoData}>
                    {volcanoData.map((entry, index) => (
                      <circle
                        key={`de-gene-${index}`}
                        cx={0}
                        cy={0}
                        r={5}
                        fill={entry.fill}
                        opacity={entry.significance === "NS" ? 0.45 : 0.9}
                        className="cursor-pointer transition-all hover:scale-125"
                      />
                    ))}
                  </Scatter>
                  <ReferenceLine x={1.0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} label={{ value: "+1.0 FC", fill: "#94a3b8", fontSize: 8, position: "insideTopRight" }} />
                  <ReferenceLine x={-1.0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} label={{ value: "-1.0 FC", fill: "#94a3b8", fontSize: 8, position: "insideTopLeft" }} />
                  <ReferenceLine y={1.3} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} label={{ value: "p=0.05", fill: "#f43f5e", fontSize: 8, position: "insideRight" }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Top Genes Table (5 cols) */}
          <div className="xl:col-span-5 flex flex-col justify-between space-y-4">
            {/* Top Group A */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full inline-block">
                  Enriched in {clusterAName}
                </span>
                <p className="text-[10px] text-gray-400 mt-1">Highest relative log fold change</p>
              </div>
              <div className="space-y-2 mt-3">
                {topUpGenes.map(g => (
                  <div key={`top-up-${g.gene}`} className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                    <span className="font-mono font-semibold text-slate-800">{g.gene}</span>
                    <div className="flex gap-4 font-mono">
                      <span className="text-red-600 font-bold">+{g.log2FC.toFixed(2)} FC</span>
                      <span className="text-slate-400">p={g.pValue.toExponential(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Group B */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase text-blue-500 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full inline-block">
                  Enriched in {clusterBName}
                </span>
                <p className="text-[10px] text-gray-400 mt-1">Highest negative log fold change</p>
              </div>
              <div className="space-y-2 mt-3">
                {topDownGenes.map(g => (
                  <div key={`top-down-${g.gene}`} className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                    <span className="font-mono font-semibold text-slate-800">{g.gene}</span>
                    <div className="flex gap-4 font-mono">
                      <span className="text-blue-600 font-bold">{g.log2FC.toFixed(2)} FC</span>
                      <span className="text-slate-400">p={g.pValue.toExponential(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
