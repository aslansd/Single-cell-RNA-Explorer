import { useState, useMemo } from "react";
import { GitBranch, RefreshCw, Layers, Check, TrendingUp, HelpCircle } from "lucide-react";
import { Cell, ClusterInfo, Gene } from "../types.js";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { motion } from "motion/react";

interface TrajectoryInferenceProps {
  cells: Cell[];
  clusters: ClusterInfo[];
  genes: Gene[];
  expressions: Record<string, number[]>;
  onRunTrajectory: (rootClusterId: number) => Promise<void>;
}

export default function TrajectoryInference({
  cells,
  clusters,
  genes,
  expressions,
  onRunTrajectory
}: TrajectoryInferenceProps) {
  const [rootCluster, setRootCluster] = useState(0);
  const [isComputing, setIsComputing] = useState(false);
  const [selectedGene, setSelectedGene] = useState("");

  // Check if pseudotime has been computed yet
  const hasPseudotime = useMemo(() => {
    return cells.some(c => c.pseudotime !== undefined);
  }, [cells]);

  // Set default gene to visualize when pseudotime is available
  useMemo(() => {
    if (hasPseudotime && !selectedGene && genes.length > 0) {
      // Pick first marker gene or GAPDH
      setSelectedGene(genes[0].name);
    }
  }, [hasPseudotime, genes, selectedGene]);

  // Map pseudotime values to color gradient (Purple/Blue/Green/Yellow)
  const getPseudotimeColor = (val: number) => {
    // Interpolate from deep purple (#4c1d95) through teal (#0d9488) to yellow (#eab308)
    const ratio = Math.min(1, Math.max(0, val));
    let r, g, b;
    if (ratio < 0.5) {
      const subRatio = ratio * 2;
      r = Math.round(76 + (13 - 76) * subRatio);
      g = Math.round(29 + (148 - 29) * subRatio);
      b = Math.round(149 + (136 - 149) * subRatio);
    } else {
      const subRatio = (ratio - 0.5) * 2;
      r = Math.round(13 + (234 - 13) * subRatio);
      g = Math.round(148 + (179 - 148) * subRatio);
      b = Math.round(136 + (8 - 136) * subRatio);
    }
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Trajectory scatter coords
  const scatterData = useMemo(() => {
    return cells.map(cell => ({
      id: cell.id,
      x: parseFloat(cell.uMapX.toFixed(3)),
      y: parseFloat(cell.uMapY.toFixed(3)),
      pseudotime: cell.pseudotime !== undefined ? parseFloat(cell.pseudotime.toFixed(3)) : 0,
      fill: cell.pseudotime !== undefined ? getPseudotimeColor(cell.pseudotime) : "#cbd5e1"
    }));
  }, [cells]);

  // Generate trajectory skeleton path overlay in UMAP space
  const skeletonPath = useMemo(() => {
    if (!hasPseudotime) return [];
    
    // Sort cells by pseudotime to compute a rolling average skeleton representing the central developmental spline
    const sorted = [...cells]
      .filter(c => c.pseudotime !== undefined)
      .sort((a, b) => (a.pseudotime || 0) - (b.pseudotime || 0));

    const steps = 15;
    const pathPoints = [];
    const chunkSize = Math.floor(sorted.length / steps);

    for (let i = 0; i < steps; i++) {
      const chunk = sorted.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length === 0) continue;

      const avgX = chunk.reduce((sum, c) => sum + c.uMapX, 0) / chunk.length;
      const avgY = chunk.reduce((sum, c) => sum + c.uMapY, 0) / chunk.length;
      pathPoints.push({
        x: parseFloat(avgX.toFixed(3)),
        y: parseFloat(avgY.toFixed(3))
      });
    }

    return pathPoints;
  }, [cells, hasPseudotime]);

  // Prepare line chart data representing selected gene expression along pseudotime (binned for readability)
  const lineChartData = useMemo(() => {
    if (!hasPseudotime || !selectedGene || !expressions[selectedGene]) return [];

    const geneExprs = expressions[selectedGene];
    const cellsWithExpr = cells.map((c, idx) => ({
      pseudotime: c.pseudotime || 0,
      expr: geneExprs[idx] || 0
    }));

    // Sort by pseudotime
    cellsWithExpr.sort((a, b) => a.pseudotime - b.pseudotime);

    // Bin into 25 pseudotime intervals and compute average expression for clean line chart rendering
    const bins = 25;
    const binWidth = 1.0 / bins;
    const binnedData = Array.from({ length: bins }, (_, binIdx) => {
      const minP = binIdx * binWidth;
      const maxP = (binIdx + 1) * binWidth;
      const binCells = cellsWithExpr.filter(c => c.pseudotime >= minP && c.pseudotime < maxP);

      const avgExpr = binCells.length > 0 
        ? binCells.reduce((sum, c) => sum + c.expr, 0) / binCells.length 
        : 0;

      return {
        bin: parseFloat(((minP + maxP) / 2).toFixed(2)),
        expression: parseFloat(avgExpr.toFixed(3))
      };
    });

    return binnedData;
  }, [cells, hasPseudotime, selectedGene, expressions]);

  const handleRun = async () => {
    setIsComputing(true);
    try {
      await onRunTrajectory(rootCluster);
    } catch (err) {
      console.error(err);
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <div className="space-y-6" id="trajectory-inference-step">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-sans font-medium text-gray-900">Trajectory Path Inference (Pseudotime)</h2>
        <p className="text-xs text-gray-500">
          Reconstruct developmental paths and cell lineage splits. Cells are modeled along a continuous "pseudotime" scale tracking molecular changes from a selected ancestor state.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-indigo-600" />
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-slate-800">Inception Root Selection</span>
            <p className="text-[10px] text-slate-500">Select the early progenitor cluster to initiate pseudotime diffusion.</p>
          </div>
        </div>

        <div className="flex gap-3 items-center w-full sm:w-auto">
          <select
            value={rootCluster}
            onChange={(e) => setRootCluster(parseInt(e.target.value))}
            className="text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-semibold focus:outline-indigo-500 w-full sm:w-[220px]"
          >
            {clusters.map(c => (
              <option key={`traj-root-${c.id}`} value={c.id}>
                {c.predictedType || `Cluster ${c.id}`} (ID: {c.id})
              </option>
            ))}
          </select>

          <button
            onClick={handleRun}
            disabled={isComputing}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isComputing ? "animate-spin" : ""}`} />
            Recompute Trajectory
          </button>
        </div>
      </div>

      {hasPseudotime ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column: Pseudotime Projection Map */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-[420px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">Pseudotime Lineage Overlay</span>
              <div className="flex items-center gap-2 text-[9px] font-mono">
                <span>0.00 (Stem)</span>
                <div className="w-24 h-2 bg-gradient-to-r from-violet-900 via-teal-500 to-yellow-500 rounded-full"></div>
                <span>1.00 (Differentiated)</span>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="x" stroke="#e2e8f0" tickLine={false} tick={false} />
                  <YAxis type="number" dataKey="y" stroke="#e2e8f0" tickLine={false} tick={false} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const cell = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-md font-mono border border-slate-800">
                            <div className="font-semibold text-indigo-400">{cell.id}</div>
                            <div>Pseudotime Score: {cell.pseudotime}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Cells" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <circle
                        key={`traj-cell-${index}`}
                        cx={0}
                        cy={0}
                        r={3}
                        fill={entry.fill}
                        opacity={0.8}
                      />
                    ))}
                  </Scatter>
                  
                  {/* Trajectory central spline line */}
                  {skeletonPath.length > 0 && (
                    <Scatter
                      name="Lineage Spline"
                      data={skeletonPath}
                      line={{ stroke: "#f43f5e", strokeWidth: 3 }}
                      shape={() => <g />} // invisible points, line only
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Gene Expression along Pseudotime Line Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-[420px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Lineage Gene Expression Profile
              </span>

              {/* Select Gene to plot */}
              <select
                value={selectedGene}
                onChange={(e) => setSelectedGene(e.target.value)}
                className="text-[11px] border border-gray-300 rounded-md p-1.5 bg-slate-50 font-mono focus:outline-indigo-500"
              >
                {genes.map(g => (
                  <option key={`traj-gene-select-${g.name}`} value={g.name}>
                    {g.name} (Dispersion: {g.dispersion.toFixed(1)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="bin"
                    stroke="#94a3b8"
                    fontSize={9}
                    label={{ value: "Developmental Pseudotime (0 → 1)", fill: "#94a3b8", fontSize: 9, position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={9}
                    label={{ value: `${selectedGene} Expression (log)`, fill: "#94a3b8", fontSize: 9, angle: -90, position: "insideLeft", offset: 12 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white text-[10px] p-2 rounded shadow-md font-mono border border-slate-800">
                            <div>Pseudotime: {payload[0].payload.bin}</div>
                            <div className="text-emerald-400 font-bold">
                              Expr Avg: {payload[0].value}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expression"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={{ r: 4, stroke: "#0ea5e9", strokeWidth: 1, fill: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-sm font-semibold text-slate-800">Lineage Reconstruction Required</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
            Click "Recompute Trajectory" above to run our diffusion-pseudotime clustering algorithm, modeling cellular fate splits and continuous gene distributions in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
