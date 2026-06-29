import { useState, useTransition, useMemo } from "react";
import {
  Upload,
  Sliders,
  Activity,
  Layers,
  Sparkles,
  GitBranch,
  Network,
  BrainCircuit,
  ArrowRight,
  Menu,
  X,
  Database,
  Info
} from "lucide-react";
import { Cell, ClusterInfo, Gene, QCMetrics, DifferentialExpressionResult, LigandReceptorPair, ServerDatasetResponse } from "./types.js";
import DatasetSelector from "./components/DatasetSelector.js";
import QCStep from "./components/QCStep.js";
import NormalizationStep from "./components/NormalizationStep.js";
import EmbeddingDashboard from "./components/EmbeddingDashboard.js";
import DifferentialExpression from "./components/DifferentialExpression.js";
import TrajectoryInference from "./components/TrajectoryInference.js";
import CellCommunication from "./components/CellCommunication.js";
import FoundationModels from "./components/FoundationModels.js";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Navigation states
  const [activeStep, setActiveStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Bioinformatic pipeline data states
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState<{ id: string; name: string; description: string; organism: string } | null>(null);
  const [originalGenes, setOriginalGenes] = useState<Gene[]>([]);
  const [originalExpressions, setOriginalExpressions] = useState<Record<string, number[]>>({});

  // QC Working sets
  const [rawCells, setRawCells] = useState<Cell[]>([]);
  const [filteredCells, setFilteredCells] = useState<Cell[]>([]);
  const [qcMetricsApplied, setQcMetricsApplied] = useState<QCMetrics | null>(null);

  // Normalized/HVG Working sets
  const [hvgGenes, setHvgGenes] = useState<string[]>([]);
  const [activeCells, setActiveCells] = useState<Cell[]>([]);
  const [activeClusters, setActiveClusters] = useState<ClusterInfo[]>([]);

  // Transition & Loader states
  const [isPending, startTransition] = useTransition();
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // STEP DESCRIPTIONS FOR SIDEBAR
  const stepsList = [
    { id: 0, label: "Upload Matrix", icon: Upload, desc: "Load raw expression cells" },
    { id: 1, label: "Quality Control", icon: Sliders, desc: "Filter apoptotic dead cells" },
    { id: 2, label: "Normalization", icon: Activity, desc: "Normalize & feature HVGs" },
    { id: 3, label: "Embeddings & AI", icon: Layers, desc: "UMAP & Gemini Annotation" },
    { id: 4, label: "Differential Expr", icon: Sliders, desc: "Cluster pairwise comparisons" },
    { id: 5, label: "Trajectory Lines", icon: GitBranch, desc: "Lineage pseudotime mapping" },
    { id: 6, label: "Paracrine Signals", icon: Network, desc: "Ligand-receptor communication" },
    { id: 7, label: "Neural Manifolds", icon: BrainCircuit, desc: "scGPT / scVI embeddings" },
  ];

  // API 1: Load preloaded dataset
  const handleSelectPreloaded = (type: string) => {
    setLoadingState("Retrieving matrix from bioinformatic server...");
    setApiError(null);
    
    startTransition(async () => {
      try {
        const res = await fetch(`/api/datasets/${type}`);
        if (!res.ok) throw new Error("Could not retrieve preloaded dataset.");
        const data: ServerDatasetResponse = await res.json();
        
        setDatasetInfo(data.info);
        setRawCells(data.cells);
        setOriginalGenes(data.genes);
        setOriginalExpressions(data.expressions);
        
        // Reset pipeline steps
        setFilteredCells([]);
        setQcMetricsApplied(null);
        setHvgGenes([]);
        
        setDatasetLoaded(true);
        setActiveStep(1); // Auto move to QC
      } catch (err: any) {
        setApiError(err.message || "Failed to contact bioinformatic server.");
      } finally {
        setLoadingState(null);
      }
    });
  };

  // API 2: Upload custom CSV/TSV
  const handleUploadDataset = async (fileName: string, content: string) => {
    setLoadingState("Parsing coordinates and simulating organism alignment...");
    setApiError(null);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, content })
      });

      if (!res.ok) throw new Error("Invalid custom matrix structure.");
      const data: ServerDatasetResponse = await res.json();

      setDatasetInfo(data.info);
      setRawCells(data.cells);
      setOriginalGenes(data.genes);
      setOriginalExpressions(data.expressions);

      setFilteredCells([]);
      setQcMetricsApplied(null);
      setHvgGenes([]);

      setDatasetLoaded(true);
      setActiveStep(1); // Auto move to QC
    } catch (err: any) {
      setApiError(err.message || "Failed to parse upload file.");
      throw err;
    } finally {
      setLoadingState(null);
    }
  };

  // Step 1 callback: QC filters applied
  const handleApplyQC = (filtered: Cell[], metrics: QCMetrics) => {
    setFilteredCells(filtered);
    setQcMetricsApplied(metrics);
    setActiveStep(2); // Move to Normalization
  };

  // Step 2 callback: Normalization completed
  const handleCompleteNormalization = (hvgs: string[]) => {
    setHvgGenes(hvgs);
    
    // Seed active cells and cluster frequencies based on the filtered set
    setActiveCells(filteredCells);
    
    // Calculate initial cluster proportions on filtered cells
    const totalFiltered = filteredCells.length;
    const initialClusters = Array.from(new Set(filteredCells.map(c => c.clusterId))).map(clusterId => {
      const cellCount = filteredCells.filter(c => c.clusterId === clusterId).length;
      return {
        id: clusterId,
        name: `Cluster ${clusterId}`,
        cellCount,
        proportion: parseFloat((cellCount / totalFiltered).toFixed(4)),
        markerGenes: hvgs.slice(0, 3) // seed marker genes from HVGs
      };
    });

    initialClusters.sort((a, b) => a.id - b.id);
    setActiveClusters(initialClusters);
    
    setActiveStep(3); // Move to main dashboard
  };

  // API 3: Re-cluster Cells
  const handleRecluster = async (algorithm: string, resolution: number, k: number) => {
    setLoadingState("Aligning neural manifolds and re-calculating centroids...");
    try {
      const res = await fetch("/api/recluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cells: activeCells,
          algorithm,
          resolution,
          k,
          hvgGenes,
          originalExpressions
        })
      });

      if (!res.ok) throw new Error("Failed to re-cluster cells.");
      const data = await res.json();
      
      setActiveCells(data.cells);
      setActiveClusters(data.clusters);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingState(null);
    }
  };

  // Step 3 callback: AI Cell annotation completed (Gemini output mapped back)
  const handleAnnotateClusters = (annotations: any[]) => {
    const updated = activeClusters.map(cluster => {
      const found = annotations.find(ann => ann.clusterId === cluster.id);
      if (found) {
        return {
          ...cluster,
          predictedType: found.predictedType,
          confidence: found.confidence,
          description: found.description
        };
      }
      return cluster;
    });
    setActiveClusters(updated);
  };

  // API 4: Pairwise Differential Expression
  const handleRunDE = async (clusterAId: number, clusterBId: number): Promise<DifferentialExpressionResult[]> => {
    const res = await fetch("/api/differential-expression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cells: activeCells,
        expressions: originalExpressions,
        clusterAId,
        clusterBId
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to calculate differential expression.");
    }
    return await res.json();
  };

  // API 5: Run Trajectory / Pseudotime diffusion
  const handleRunTrajectory = async (rootClusterId: number) => {
    setLoadingState("Reconstructing developmental lineages along geodesic lines...");
    try {
      const res = await fetch("/api/trajectory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cells: activeCells,
          rootClusterId
        })
      });

      if (!res.ok) throw new Error("Failed trajectory calculations.");
      const data = await res.json();
      setActiveCells(data.cells);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingState(null);
    }
  };

  // API 6: Run Cell-cell signaling communication
  const handleRunCommunication = async (): Promise<LigandReceptorPair[]> => {
    const res = await fetch("/api/cell-communication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cells: activeCells,
        clusters: activeClusters,
        expressions: originalExpressions,
        organism: datasetInfo?.organism
      })
    });

    if (!res.ok) throw new Error("Failed communication predictions.");
    return await res.json();
  };

  // Lock checking for sequential pipeline logic
  const checkStepAccessibility = (stepId: number) => {
    if (stepId === 0) return true;
    if (!datasetLoaded) return false;
    if (stepId === 1) return true;
    if (stepId === 2) return filteredCells.length > 0;
    // Embeddings, DE, Trajectory, Communication and ML require normalization completed (having active cells)
    return activeCells.length > 0;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800 antialiased" id="main-sc-explorer-app">
      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-200 h-16 px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs font-mono shadow-sm">SC</div>
            <h1 className="font-sans font-semibold tracking-tight text-gray-900 text-sm hidden sm:block">
              Single-cell RNA Explorer
            </h1>
          </div>
        </div>

        {/* ACTIVE DATASET STATUS BADGE */}
        {datasetLoaded && datasetInfo && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs max-w-sm sm:max-w-md">
            <Database className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div className="truncate text-left leading-tight">
              <span className="font-semibold text-slate-800">{datasetInfo.name}</span>
              <p className="text-[10px] text-slate-400 font-mono truncate">{datasetInfo.organism} • {rawCells.length} cells</p>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 flex min-h-0 relative">
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ${
            sidebarOpen ? "w-[240px]" : "w-0 overflow-hidden border-r-0"
          } fixed md:static h-[calc(100vh-64px)] z-20`}
        >
          <div className="py-4 space-y-1 overflow-y-auto">
            <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 font-bold px-4 block pb-2">Analysis Steps</span>
            
            {stepsList.map((step) => {
              const isAccessible = checkStepAccessibility(step.id);
              const isActive = activeStep === step.id;

              return (
                <button
                  key={`step-nav-${step.id}`}
                  disabled={!isAccessible}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all relative ${
                    isActive
                      ? "bg-slate-800 text-white font-medium"
                      : isAccessible
                      ? "text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer"
                      : "text-slate-600 cursor-not-allowed opacity-50"
                  }`}
                >
                  <step.icon className={`w-4 h-4 ${isActive ? "text-indigo-400 animate-pulse" : isAccessible ? "text-slate-400" : "text-slate-600"}`} />
                  <div className="truncate leading-tight">
                    <span className="text-xs block">{step.label}</span>
                    <p className="text-[9px] text-slate-500 truncate">{step.desc}</p>
                  </div>
                  {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l" />}
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
            Platform Version 1.4.2
          </div>
        </aside>

        {/* MAIN DISPLAY VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative min-h-0">
          {/* LOADER OVERLAY */}
          {loadingState && (
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm flex flex-col items-center justify-center z-40 transition-all">
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xl max-w-sm text-center space-y-4">
                <Sparkles className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800">Processing cellular profiles...</h4>
                  <p className="text-xs text-slate-500">{loadingState}</p>
                </div>
              </div>
            </div>
          )}

          {/* PIPELINE ACCESS DENIED STEP BLOCK */}
          {!checkStepAccessibility(activeStep) ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm my-12">
              <Sliders className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-800">Pipeline Stage Locked</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Before accessing this advanced comparative stage, you must complete prior steps. Load a count matrix, apply Quality Control metrics to exclude apoptotic cells, and computeHighly Variable Genes.
              </p>
              <button
                onClick={() => setActiveStep(0)}
                className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-lg shadow-sm transition-all"
              >
                Go to Upload Matrix
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`pipeline-stage-${activeStep}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {activeStep === 0 && (
                  <DatasetSelector
                    onSelectDataset={handleSelectPreloaded}
                    onUploadDataset={handleUploadDataset}
                    isLoading={isPending}
                  />
                )}

                {activeStep === 1 && (
                  <QCStep
                    cells={rawCells}
                    onApplyQC={handleApplyQC}
                  />
                )}

                {activeStep === 2 && (
                  <NormalizationStep
                    genes={originalGenes}
                    onComplete={handleCompleteNormalization}
                  />
                )}

                {activeStep === 3 && (
                  <EmbeddingDashboard
                    cells={activeCells}
                    clusters={activeClusters}
                    genes={originalGenes}
                    expressions={originalExpressions}
                    organism={datasetInfo?.organism || "Human"}
                    description={datasetInfo?.description || ""}
                    onRecluster={handleRecluster}
                    onAnnotateClusters={handleAnnotateClusters}
                  />
                )}

                {activeStep === 4 && (
                  <DifferentialExpression
                    cells={activeCells}
                    clusters={activeClusters}
                    expressions={originalExpressions}
                    onRunDE={handleRunDE}
                  />
                )}

                {activeStep === 5 && (
                  <TrajectoryInference
                    cells={activeCells}
                    clusters={activeClusters}
                    genes={originalGenes}
                    expressions={originalExpressions}
                    onRunTrajectory={handleRunTrajectory}
                  />
                )}

                {activeStep === 6 && (
                  <CellCommunication
                    cells={activeCells}
                    clusters={activeClusters}
                    expressions={originalExpressions}
                    organism={datasetInfo?.organism || "Human"}
                    onRunCommunication={handleRunCommunication}
                  />
                )}

                {activeStep === 7 && (
                  <FoundationModels
                    cells={activeCells}
                    genes={originalGenes}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
