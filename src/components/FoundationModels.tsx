import { useState, useMemo } from "react";
import { BrainCircuit, Cpu, GitFork, Key, HelpCircle, Activity, Sparkles, Network } from "lucide-react";
import { Cell, Gene } from "../types.js";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { motion } from "motion/react";

interface FoundationModelsProps {
  cells: Cell[];
  genes: Gene[];
}

export default function FoundationModels({ cells, genes }: FoundationModelsProps) {
  const [activeModel, setActiveModel] = useState<"scvi" | "gnn" | "transformer">("transformer");
  const [isComputing, setIsComputing] = useState(false);

  // Trigger simulated computation transitions
  const handleRunModel = () => {
    setIsComputing(true);
    setTimeout(() => {
      setIsComputing(false);
    }, 1000);
  };

  // Generate model-specific perturbed coordinates for visual shift demonstrations
  const visualShiftData = useMemo(() => {
    return cells.map((cell) => {
      let x = cell.uMapX;
      let y = cell.uMapY;

      if (activeModel === "scvi") {
        // scVI VAE latent space centers and tightens clusters
        const angle = (cell.clusterId / 6) * 2 * Math.PI;
        const R = 3.5;
        x = R * Math.cos(angle) + (cell.uMapX - cell.uMapX) * 0.1 + (Math.random() - 0.5) * 0.4;
        y = R * Math.sin(angle) + (cell.uMapY - cell.uMapY) * 0.1 + (Math.random() - 0.5) * 0.4;
      } else if (activeModel === "gnn") {
        // GNN aggregates cells closely based on local KNN connectivity
        const offsets = [
          { x: -2, y: -2 }, { x: 2, y: -2 }, { x: -2, y: 2 },
          { x: 2, y: 2 }, { x: 0, y: -3.5 }, { x: 0, y: 3.5 }
        ];
        const offset = offsets[cell.clusterId % offsets.length];
        x = offset.x + (Math.random() - 0.5) * 0.6;
        y = offset.y + (Math.random() - 0.5) * 0.6;
      } else {
        // Foundation Model (scGPT) aligns embeddings into dense cell-type manifolds
        const centroids = [
          { x: -3, y: 1.5 }, { x: 3, y: 1.5 }, { x: -1.5, y: -3 },
          { x: 1.5, y: -3 }, { x: -4, y: -2 }, { x: 4, y: -2 }
        ];
        const centroid = centroids[cell.clusterId % centroids.length];
        x = centroid.x + (Math.random() - 0.5) * 0.35;
        y = centroid.y + (Math.random() - 0.5) * 0.35;
      }

      return {
        id: cell.id,
        x: parseFloat(x.toFixed(3)),
        y: parseFloat(y.toFixed(3)),
        clusterId: cell.clusterId,
        fill: [
          "#6366f1", "#10b981", "#f97316", "#ec4899", "#14b8a6", "#8b5cf6"
        ][cell.clusterId % 6]
      };
    });
  }, [cells, activeModel]);

  // Generate transformer attention weights matrix (e.g. CD4 vs other markers)
  const transformerAttentionMatrix = useMemo(() => {
    const subset = genes.slice(0, 6).map(g => g.name);
    const matrix: { source: string; target: string; weight: number }[] = [];

    subset.forEach((source, sIdx) => {
      subset.forEach((target, tIdx) => {
        // High self-attention, and high biological marker co-attention
        let weight = 0.05 + Math.random() * 0.15;
        if (source === target) weight = 0.75 + Math.random() * 0.15;
        else if (
          (source.startsWith("CD") && target.startsWith("CD")) ||
          (source.startsWith("MT") && target.startsWith("MT")) ||
          (source.startsWith("Gad") && target.startsWith("Gad"))
        ) {
          weight = 0.45 + Math.random() * 0.2;
        }

        matrix.push({
          source,
          target,
          weight: parseFloat(weight.toFixed(3))
        });
      });
    });

    return { subset, matrix };
  }, [genes]);

  return (
    <div className="space-y-6" id="foundation-models-step">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-sans font-medium text-gray-900">Modern Single-Cell Machine Learning Core</h2>
        <p className="text-xs text-gray-500">
          Analyze deep neural architectures that learn rich transcriptomic manifolds. Compare classic neural autoencoders (scVI), local network topologies (GNN), and foundational multi-million cell transformers (scGPT).
        </p>
      </div>

      {/* Model Type Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* scGPT Transformer */}
        <div
          onClick={() => setActiveModel("transformer")}
          className={`border rounded-xl p-5 cursor-pointer transition-all hover:shadow-sm ${
            activeModel === "transformer"
              ? "border-violet-500 bg-violet-50/20 shadow-sm"
              : "border-gray-200 bg-white hover:border-violet-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 bg-violet-100 text-violet-700 rounded-lg">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">scGPT Foundation</span>
          </div>
          <h3 className="text-sm font-bold text-gray-900 mt-4">Transformers (scGPT / Geneformer)</h3>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
            Generative pre-trained transformers treating gene transcripts as tokens. Learns deep attention vectors to predict gene-to-gene interactions and cell-type classes.
          </p>
        </div>

        {/* scVI VAE */}
        <div
          onClick={() => setActiveModel("scvi")}
          className={`border rounded-xl p-5 cursor-pointer transition-all hover:shadow-sm ${
            activeModel === "scvi"
              ? "border-indigo-500 bg-indigo-50/20 shadow-sm"
              : "border-gray-200 bg-white hover:border-indigo-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">scVI VAE</span>
          </div>
          <h3 className="text-sm font-bold text-gray-900 mt-4">Variational Autoencoders (scVI)</h3>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
            Neural autoencoders modeling technical dropouts and batch biases via a Zero-Inflated Negative Binomial (ZINB) distribution, yielding batch-corrected latent codes.
          </p>
        </div>

        {/* GNNs */}
        <div
          onClick={() => setActiveModel("gnn")}
          className={`border rounded-xl p-5 cursor-pointer transition-all hover:shadow-sm ${
            activeModel === "gnn"
              ? "border-emerald-500 bg-emerald-50/20 shadow-sm"
              : "border-gray-200 bg-white hover:border-emerald-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Network className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">KNN GNN</span>
          </div>
          <h3 className="text-sm font-bold text-gray-900 mt-4">Graph Neural Networks (GNN)</h3>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
            Models cells as interconnected nodes within a K-Nearest Neighbors (KNN) transcriptional similarity graph, performing messaging passing to partition cellular phenotypes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Latent space projection showing rearrangement shifts (7 cols) */}
        <div className="xl:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-[420px]">
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-800">Neural Latent Space Rearrangement</span>
              <p className="text-[10px] text-slate-400">Visualization of cells shifting into ML harmonized coordinates.</p>
            </div>
            <button
              onClick={handleRunModel}
              disabled={isComputing}
              className="flex items-center gap-1.5 text-[10px] font-semibold bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              {isComputing ? "Recomputing manifolds..." : "Optimize Embedding Layout"}
            </button>
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
                        <div className="bg-slate-900 text-white text-[10px] p-2 rounded shadow-md font-mono border border-slate-800">
                          <div>Cell ID: {cell.id}</div>
                          <div>Latent X: {cell.x}</div>
                          <div>Latent Y: {cell.y}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Cells" data={visualShiftData}>
                  {visualShiftData.map((entry, index) => (
                    <circle
                      key={`ml-cell-dot-${index}`}
                      cx={0}
                      cy={0}
                      r={3.5}
                      fill={entry.fill}
                      opacity={0.8}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Attention Heatmap or GNN stats (5 cols) */}
        <div className="xl:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-[420px] space-y-4">
          {activeModel === "transformer" ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-violet-500 animate-pulse" />
                  scGPT Gene-to-Gene Self-Attention Weights
                </span>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Transformer self-attention scores learning transcript co-expression dynamics directly.
                </p>
              </div>

              {/* Grid heatmap rendering */}
              <div className="grid grid-cols-6 gap-1.5 p-3 bg-slate-50 border border-slate-100 rounded-lg mt-3">
                {transformerAttentionMatrix.matrix.map((cell, idx) => {
                  // Map attention score to violet bg opacity
                  const bgVal = Math.floor(cell.weight * 100);
                  const bgStyle = { backgroundColor: `rgba(139, 92, 246, ${cell.weight})` };

                  return (
                    <div
                      key={`att-cell-${idx}`}
                      style={bgStyle}
                      className="aspect-square flex flex-col items-center justify-center rounded text-[8px] font-mono text-slate-800 font-bold border border-white hover:border-violet-500 hover:scale-105 cursor-pointer transition-all"
                      title={`${cell.source} ↔ ${cell.target}: ${cell.weight}`}
                    >
                      {cell.weight >= 0.5 ? cell.weight.toFixed(2) : ""}
                    </div>
                  );
                })}
              </div>

              {/* Axis labels key */}
              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-50 text-[9px] font-mono text-slate-500">
                <span>Genes indexed:</span>
                {transformerAttentionMatrix.subset.map(g => (
                  <span key={`index-g-${g}`} className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{g}</span>
                ))}
              </div>
            </div>
          ) : activeModel === "scvi" ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800">scVI Latent Generative Objectives</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  ZINB loss stabilization models parameters over cellular batches.
                </p>
              </div>

              <div className="space-y-4 bg-slate-50 border border-slate-100 p-4 rounded-xl font-mono text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">KL Divergence:</span>
                  <span className="text-slate-800 font-bold">0.0241</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Reconstruction Loss:</span>
                  <span className="text-slate-800 font-bold">-214.35</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Dropout Probability:</span>
                  <span className="text-slate-800 font-bold">0.183</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ZINB Dispersion:</span>
                  <span className="text-emerald-600 font-bold">Converged</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-50 pt-2">
                *scVI projects expression counts into normal multivariate prior distributions, separating biological variances from technical ambient contamination.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800">GNN Message-Passing Parameters</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Local K-Nearest Neighbor (KNN) cell network density distributions.
                </p>
              </div>

              <div className="space-y-4 bg-slate-50 border border-slate-100 p-4 rounded-xl font-mono text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">KNN Neighborhood Size:</span>
                  <span className="text-slate-800 font-bold">K = 15</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Graph Densities:</span>
                  <span className="text-slate-800 font-bold">0.083</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Louvain Partition Score:</span>
                  <span className="text-slate-800 font-bold">Q = 0.812</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Message Kernels:</span>
                  <span className="text-indigo-600 font-bold">ChebNet Conv</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-50 pt-2">
                *The graph convolutional framework performs spatial smoothing across neighboring cell nodes, consolidating robust cluster partitions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
