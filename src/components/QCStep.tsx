import { useState, useMemo } from "react";
import { Sliders, RefreshCw, Filter, CheckCircle2, Award, Zap } from "lucide-react";
import { Cell, QCMetrics } from "../types.js";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";

interface QCStepProps {
  cells: Cell[];
  onApplyQC: (filteredCells: Cell[], metrics: QCMetrics) => void;
}

export default function QCStep({ cells, onApplyQC }: QCStepProps) {
  // QC slider states
  const [minGenes, setMinGenes] = useState(200);
  const [maxGenes, setMaxGenes] = useState(3500);
  const [minCounts, setMinCounts] = useState(1000);
  const [maxMito, setMaxMito] = useState(10); // in percent
  const [removeDoublets, setRemoveDoublets] = useState(true);

  // Compute cell statuses dynamically based on slider thresholds
  const qcStats = useMemo(() => {
    let passedCount = 0;
    let failedMito = 0;
    let failedGenes = 0;
    let failedCounts = 0;
    let failedDoublets = 0;

    const filteredCells = cells.map(cell => {
      const isMitoOutlier = cell.mitoFrac * 100 > maxMito;
      const isGeneOutlier = cell.nGenes < minGenes || cell.nGenes > maxGenes;
      const isCountOutlier = cell.totalCounts < minCounts;
      const isDoubletOutlier = removeDoublets && cell.doubletScore > 0.45;

      const passed = !isMitoOutlier && !isGeneOutlier && !isCountOutlier && !isDoubletOutlier;

      if (passed) passedCount++;
      else {
        if (isMitoOutlier) failedMito++;
        if (isGeneOutlier) failedGenes++;
        if (isCountOutlier) failedCounts++;
        if (isDoubletOutlier) failedDoublets++;
      }

      return {
        ...cell,
        passed,
        mitoPct: parseFloat((cell.mitoFrac * 100).toFixed(2))
      };
    });

    return {
      filteredCells,
      total: cells.length,
      passed: passedCount,
      failed: cells.length - passedCount,
      failedMito,
      failedGenes,
      failedCounts,
      failedDoublets
    };
  }, [cells, minGenes, maxGenes, minCounts, maxMito, removeDoublets]);

  // Downsample cells for rendering high performance scatter plots
  const chartData = useMemo(() => {
    // Select 300 cells evenly for visual scatter plotting
    const step = Math.max(1, Math.floor(qcStats.filteredCells.length / 300));
    return qcStats.filteredCells
      .filter((_, idx) => idx % step === 0)
      .map(c => ({
        id: c.id,
        nGenes: c.nGenes,
        totalCounts: c.totalCounts,
        mitoPct: parseFloat((c.mitoFrac * 100).toFixed(2)),
        passed: c.passed ? "Passed" : "Filtered",
        fill: c.passed ? "#6366f1" : "#f43f5e"
      }));
  }, [qcStats.filteredCells]);

  const handleApply = () => {
    const finalFiltered = qcStats.filteredCells.filter(c => c.passed);
    onApplyQC(finalFiltered, {
      minGenes,
      maxGenes,
      minCounts,
      maxMito,
      removeDoublets
    });
  };

  const handleReset = () => {
    setMinGenes(200);
    setMaxGenes(3500);
    setMinCounts(1000);
    setMaxMito(10);
    setRemoveDoublets(true);
  };

  return (
    <div className="space-y-6" id="qc-step">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-sans font-medium text-gray-900">Cell Quality Control & Filtering</h2>
          <p className="text-xs text-gray-500">
            Exclude dead cells (high mitochondrial % due to membrane lysis), doublets (abnormally high genes), and empty droplets (low sequencing depth).
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 hover:border-indigo-100 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Thresholds
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Sliders & Filter Parameters (5 cols) */}
        <div className="xl:col-span-5 space-y-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">QC Filter Parameters</span>
          </div>

          <div className="space-y-4">
            {/* Min Genes expressed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Minimum Genes per Cell</span>
                <span className="font-mono font-semibold text-gray-900">{minGenes}</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="10"
                value={minGenes}
                onChange={(e) => setMinGenes(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] text-gray-400 block">Excludes low-complexity empty droplets.</span>
            </div>

            {/* Max Genes expressed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Maximum Genes per Cell</span>
                <span className="font-mono font-semibold text-gray-900">{maxGenes}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="8000"
                step="100"
                value={maxGenes}
                onChange={(e) => setMaxGenes(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] text-gray-400 block">Excludes potential doublets (2+ cells in one droplet).</span>
            </div>

            {/* Min Sequencing Depth */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Minimum Sequencing Depth (Reads)</span>
                <span className="font-mono font-semibold text-gray-900">{minCounts}</span>
              </div>
              <input
                type="range"
                min="200"
                max="3000"
                step="50"
                value={minCounts}
                onChange={(e) => setMinCounts(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] text-gray-400 block">Removes cells with insufficient read coverage.</span>
            </div>

            {/* Max Mito fraction */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Max Mitochondrial Reads %</span>
                <span className="font-mono font-semibold text-gray-900">{maxMito}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={maxMito}
                onChange={(e) => setMaxMito(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] text-gray-400 block">Flags apoptotic, ruptured, or dead cells.</span>
            </div>

            {/* Remove Doublets score threshold */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
              <input
                type="checkbox"
                id="doublet-checkbox"
                checked={removeDoublets}
                onChange={(e) => setRemoveDoublets(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="doublet-checkbox" className="text-xs text-gray-700 cursor-pointer font-medium select-none">
                Automated Doublet Exclusion (Score &gt; 0.45)
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-50">
            <button
              onClick={handleApply}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all"
            >
              <Filter className="w-4 h-4" />
              Apply Filter Thresholds ({qcStats.passed} cells pass)
            </button>
          </div>
        </div>

        {/* Middle Column: QC Charts (7 cols) */}
        <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Depth vs Mito Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col h-[340px]">
            <span className="text-xs font-semibold text-gray-800 mb-2 block">Mito % vs Count Depth</span>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="totalCounts"
                    name="Reads"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  />
                  <YAxis type="number" dataKey="mitoPct" name="Mito %" stroke="#94a3b8" fontSize={9} unit="%" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const cell = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-[10px] p-2 rounded shadow-md font-mono border border-slate-800">
                            <div>ID: {cell.id}</div>
                            <div>Depth: {cell.totalCounts} reads</div>
                            <div>Mito: {cell.mitoPct}%</div>
                            <div className={cell.passed === "Passed" ? "text-emerald-400" : "text-rose-400"}>
                              Status: {cell.passed}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Cells" data={chartData} fill="#6366f1">
                    {chartData.map((entry, index) => (
                      <circle
                        key={`cell-dot-${index}`}
                        cx={0}
                        cy={0}
                        r={3}
                        fill={entry.fill}
                        opacity={0.65}
                      />
                    ))}
                  </Scatter>
                  <ReferenceLine y={maxMito} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: "Max Mito %", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
                  <ReferenceLine x={minCounts} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: "Min Depth", fill: "#f43f5e", fontSize: 9, position: "insideBottomLeft" }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Depth vs Gene Counts Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col h-[340px]">
            <span className="text-xs font-semibold text-gray-800 mb-2 block">Gene Complexity vs Depth</span>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="totalCounts"
                    name="Reads"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  />
                  <YAxis type="number" dataKey="nGenes" name="Genes" stroke="#94a3b8" fontSize={9} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const cell = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-[10px] p-2 rounded shadow-md font-mono border border-slate-800">
                            <div>ID: {cell.id}</div>
                            <div>Depth: {cell.totalCounts} reads</div>
                            <div>Genes: {cell.nGenes}</div>
                            <div className={cell.passed === "Passed" ? "text-emerald-400" : "text-rose-400"}>
                              Status: {cell.passed}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Cells" data={chartData} fill="#10b981">
                    {chartData.map((entry, index) => (
                      <circle
                        key={`cell-gene-dot-${index}`}
                        cx={0}
                        cy={0}
                        r={3}
                        fill={entry.fill}
                        opacity={0.65}
                      />
                    ))}
                  </Scatter>
                  <ReferenceLine y={minGenes} stroke="#ea580c" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: "Min Genes", fill: "#ea580c", fontSize: 9, position: "insideBottomLeft" }} />
                  <ReferenceLine y={maxGenes} stroke="#b45309" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: "Max Genes", fill: "#b45309", fontSize: 9, position: "insideTopRight" }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* QC Bioinformatic Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold font-mono">Cell Viability Pass</span>
          <span className="text-2xl font-bold text-indigo-600 font-mono mt-1">
            {Math.round((qcStats.passed / qcStats.total) * 100)}%
          </span>
          <span className="text-xs text-slate-500 mt-2">
            Passed: <b className="text-slate-800">{qcStats.passed}</b> of <b className="text-slate-800">{qcStats.total}</b> cells
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold font-mono">Mitochondrial Flags</span>
          <span className="text-2xl font-bold text-rose-500 font-mono mt-1">
            {qcStats.failedMito}
          </span>
          <span className="text-xs text-slate-500 mt-2">
            Cells exceeding {maxMito}% mito read limit
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold font-mono">Outlier Gene Counts</span>
          <span className="text-2xl font-bold text-amber-500 font-mono mt-1">
            {qcStats.failedGenes}
          </span>
          <span className="text-xs text-slate-500 mt-2">
            Below {minGenes} or above {maxGenes} detected genes
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold font-mono">Doublets Excluded</span>
          <span className="text-2xl font-bold text-violet-500 font-mono mt-1">
            {qcStats.failedDoublets}
          </span>
          <span className="text-xs text-slate-500 mt-2">
            Droplets containing co-encapsulated doublets
          </span>
        </div>
      </div>
    </div>
  );
}
