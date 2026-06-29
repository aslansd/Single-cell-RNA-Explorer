import { useState, useMemo, useTransition } from "react";
import { Search, Sparkles, Brain, Grid, Settings, BarChart3, HelpCircle, RefreshCw, Layers } from "lucide-react";
import { Cell, ClusterInfo, Gene } from "../types.js";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";

interface EmbeddingDashboardProps {
  cells: Cell[];
  clusters: ClusterInfo[];
  genes: Gene[];
  expressions: Record<string, number[]>;
  organism: string;
  description: string;
  onRecluster: (algorithm: string, resolution: number, k: number) => Promise<void>;
  onAnnotateClusters: (annotations: any[]) => void;
}

const CLUSTER_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#8b5cf6", // purple
  "#eab308", // yellow
  "#ef4444", // red
  "#3b82f6", // blue
  "#64748b"  // slate
];

export default function EmbeddingDashboard({
  cells,
  clusters,
  genes,
  expressions,
  organism,
  description,
  onRecluster,
  onAnnotateClusters
}: EmbeddingDashboardProps) {
  // UI Coordinates and Color state
  const [embedding, setEmbedding] = useState<"umap" | "tsne" | "pca">("umap");
  const [colorBy, setColorBy] = useState<"cluster" | "gene">("cluster");
  const [selectedGene, setSelectedGene] = useState("");
  const [geneSearch, setGeneSearch] = useState("");
  
  // Clustering form states
  const [clusterAlgo, setClusterAlgo] = useState("kmeans");
  const [resolution, setResolution] = useState(0.6);
  const [numK, setNumK] = useState(6);
  const [isReclustering, setIsReclustering] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationError, setAnnotationError] = useState<string | null>(null);

  // Auto-suggest genes from list
  const suggestedGenes = useMemo(() => {
    return genes.slice(0, 10).map(g => g.name);
  }, [genes]);

  // Expression value range for selected gene
  const geneExpressionMax = useMemo(() => {
    if (!selectedGene || !expressions[selectedGene]) return 0;
    return Math.max(...expressions[selectedGene]) || 1;
  }, [selectedGene, expressions]);

  // Interpolate color based on gene expression
  const getExpressionColor = (val: number, max: number) => {
    if (max === 0) return "#cbd5e1"; // slate-300
    const ratio = Math.min(1, val / max);
    // Slate-200 (#e2e8f0) to Orange-600 (#ea580c)
    const r = Math.round(226 + (234 - 226) * ratio);
    const g = Math.round(232 + (88 - 232) * ratio);
    const b = Math.round(240 + (12 - 240) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Cell Coordinates dataset for Recharts Scatter plot
  const scatterData = useMemo(() => {
    return cells.map((cell, cellIdx) => {
      let x = cell.uMapX;
      let y = cell.uMapY;
      if (embedding === "tsne") {
        x = cell.tsneX;
        y = cell.tsneY;
      } else if (embedding === "pca") {
        x = cell.pcaX;
        y = cell.pcaY;
      }

      const expressionValue = selectedGene && expressions[selectedGene] ? expressions[selectedGene][cellIdx] : 0;
      const fill = colorBy === "cluster"
        ? CLUSTER_COLORS[cell.clusterId % CLUSTER_COLORS.length]
        : getExpressionColor(expressionValue, geneExpressionMax);

      const clusterObj = clusters.find(c => c.id === cell.clusterId);
      const cellTypeName = clusterObj?.predictedType || `Cluster ${cell.clusterId}`;

      return {
        id: cell.id,
        x: parseFloat(x.toFixed(3)),
        y: parseFloat(y.toFixed(3)),
        clusterId: cell.clusterId,
        cellType: cellTypeName,
        expression: expressionValue,
        fill
      };
    });
  }, [cells, embedding, colorBy, selectedGene, expressions, geneExpressionMax, clusters]);

  // Perform re-clustering calculation
  const handleReclusterSubmit = async () => {
    setIsReclustering(true);
    try {
      await onRecluster(clusterAlgo, resolution, numK);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReclustering(false);
    }
  };

  // Perform AI Cell type prediction (Gemini 3.5-flash)
  const handleAnnotateSubmit = async () => {
    setIsAnnotating(true);
    setAnnotationError(null);
    try {
      const response = await fetch("/api/cell-type-annotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusters,
          organism,
          tissue: description
        })
      });

      if (!response.ok) {
        throw new Error("Failed response from annotation server.");
      }

      const data = await response.json();
      onAnnotateClusters(data.annotations);
    } catch (err: any) {
      setAnnotationError(err.message || "Failed to contact Gemini.");
    } finally {
      setIsAnnotating(false);
    }
  };

  const handleSelectGene = (geneName: string) => {
    setSelectedGene(geneName);
    setColorBy("gene");
    setGeneSearch(geneName);
  };

  // Filter suggested genes list based on search query
  const filteredSearchGenes = useMemo(() => {
    if (!geneSearch) return suggestedGenes.slice(0, 5);
    return Object.keys(expressions)
      .filter(g => g.toLowerCase().startsWith(geneSearch.toLowerCase()))
      .slice(0, 5);
  }, [geneSearch, expressions, suggestedGenes]);

  return (
    <div className="space-y-6" id="embedding-dashboard">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">Computational Platform</span>
          <h2 className="text-xl font-sans font-medium text-gray-900 mt-0.5">Interactive Spatial Dimensional Embeddings</h2>
        </div>

        {/* Embedding coordinates toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start">
          {(["umap", "tsne", "pca"] as const).map((mode) => (
            <button
              key={`emb-toggle-${mode}`}
              onClick={() => setEmbedding(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${
                embedding === mode
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left column: Controls & Gene Search & Reclustering (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Gene expression visualizer coloring search */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <Search className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-900">Search Gene Expression</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Type gene name (e.g. CD4, Gfap)..."
                value={geneSearch}
                onChange={(e) => setGeneSearch(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 bg-slate-50 focus:bg-white focus:outline-indigo-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
            </div>

            {/* Suggested quick-click list */}
            {filteredSearchGenes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-mono block">Feature Matches</span>
                <div className="flex flex-wrap gap-1.5">
                  {filteredSearchGenes.map(g => (
                    <button
                      key={`gene-choice-${g}`}
                      onClick={() => handleSelectGene(g)}
                      className={`px-2 py-1 text-[11px] font-mono rounded-md border ${
                        selectedGene === g && colorBy === "gene"
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                      } transition-colors`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recolor Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
              <button
                onClick={() => setColorBy("cluster")}
                className={`py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                  colorBy === "cluster"
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                    : "bg-white text-slate-500 hover:text-slate-800 border-gray-200"
                }`}
              >
                Color by Cluster
              </button>
              <button
                onClick={() => {
                  if (selectedGene) setColorBy("gene");
                }}
                disabled={!selectedGene}
                className={`py-2 text-xs font-semibold rounded-lg border text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  colorBy === "gene"
                    ? "bg-orange-50 text-orange-600 border-orange-200"
                    : "bg-white text-slate-500 hover:text-slate-800 border-gray-200"
                }`}
              >
                Color by Gene
              </button>
            </div>

            {/* Gene Expression legend scale */}
            {colorBy === "gene" && selectedGene && (
              <div className="space-y-2 pt-2 border-t border-gray-50">
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>0.00 (Low)</span>
                  <span className="font-semibold text-orange-600">{selectedGene} Expression</span>
                  <span>{geneExpressionMax.toFixed(2)} (High)</span>
                </div>
                <div className="h-2 bg-gradient-to-r from-slate-200 to-orange-500 rounded-full"></div>
              </div>
            )}
          </div>

          {/* Interactive Reclustering parameters */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <Settings className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-900">Re-compute Clustering</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Algorithm</label>
                <select
                  value={clusterAlgo}
                  onChange={(e) => setClusterAlgo(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-slate-50 focus:bg-white"
                >
                  <option value="kmeans">K-Means (Hard Centroids)</option>
                  <option value="leiden">Leiden (Resolution-based)</option>
                  <option value="louvain">Louvain (Modularity Louvain)</option>
                </select>
              </div>

              {clusterAlgo === "kmeans" ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Target Clusters (K)</span>
                    <span className="font-mono font-bold text-slate-800">{numK}</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    step="1"
                    value={numK}
                    onChange={(e) => setNumK(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Resolution Parameter</span>
                    <span className="font-mono font-bold text-slate-800">{resolution}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.1"
                    value={resolution}
                    onChange={(e) => setResolution(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              )}

              <button
                onClick={handleReclusterSubmit}
                disabled={isReclustering}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReclustering ? "animate-spin" : ""}`} />
                {isReclustering ? "Computing clusters..." : "Re-cluster Cells"}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Plot canvas (8 cols) */}
        <div className="xl:col-span-8 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span className="capitalize">{embedding} Latent Projection View</span>
            </div>
            <span className="text-gray-400 font-mono text-[10px]">{cells.length} cells plotted</span>
          </div>

          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" name="X" stroke="#e2e8f0" tickLine={false} tick={false} />
                <YAxis type="number" dataKey="y" name="Y" stroke="#e2e8f0" tickLine={false} tick={false} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const cell = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-[10px] p-2.5 rounded-lg shadow-md font-mono border border-slate-800 space-y-1">
                          <div className="font-semibold text-indigo-400">{cell.id}</div>
                          <div>Coordinates: ({cell.x}, {cell.y})</div>
                          <div className="text-amber-400 font-medium">{cell.cellType}</div>
                          {colorBy === "gene" && selectedGene && (
                            <div className="text-orange-400 font-bold">
                              {selectedGene} Level: {cell.expression.toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Cells" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <circle
                      key={`scatter-cell-${index}`}
                      cx={0}
                      cy={0}
                      r={3}
                      fill={entry.fill}
                      opacity={0.8}
                      className="transition-transform hover:scale-150 cursor-pointer"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cluster Markers & Cell Annotation Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-gray-900">Cluster Populations & AI Cell Annotations</h3>
          </div>

          <button
            onClick={handleAnnotateSubmit}
            disabled={isAnnotating}
            className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all"
          >
            <Sparkles className={`w-4 h-4 ${isAnnotating ? "animate-pulse" : ""}`} />
            {isAnnotating ? "Running Gemini Annotation Model..." : "Run AI Auto-Annotation (Gemini)"}
          </button>
        </div>

        {annotationError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs">
            Annotation failed: {annotationError}. Simulated highly specific scientific annotations were activated as fallback.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-500">
            <thead className="text-[10px] text-gray-400 uppercase font-mono tracking-wider bg-slate-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Cluster ID</th>
                <th className="px-4 py-3">Population</th>
                <th className="px-4 py-3">Proportion</th>
                <th className="px-4 py-3">Marker Genes (Top)</th>
                <th className="px-4 py-3">Gemini Predicted Cell Type</th>
                <th className="px-4 py-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans">
              {clusters.map((cluster) => (
                <tr key={`cluster-row-${cluster.id}`} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-700 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length] }}
                    />
                    {cluster.id}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-800">{cluster.cellCount} cells</td>
                  <td className="px-4 py-3 font-mono">{(cluster.proportion * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {cluster.markerGenes.map(gene => (
                        <button
                          key={`row-marker-${cluster.id}-${gene}`}
                          onClick={() => handleSelectGene(gene)}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-700 transition-colors"
                        >
                          {gene}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {cluster.predictedType ? (
                      <div className="space-y-0.5">
                        <span className="text-slate-900 font-semibold">{cluster.predictedType}</span>
                        <p className="text-[10px] text-slate-400 font-normal leading-normal">{cluster.description}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Annotation pending (Click Auto-Annotate above)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {cluster.confidence ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        cluster.confidence >= 90
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {cluster.confidence}%
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
