import { useState, useTransition } from "react";
import { Upload, Database, ChevronRight, FileText, Info } from "lucide-react";
import { DatasetInfo } from "../types.js";
import { motion } from "motion/react";

interface DatasetSelectorProps {
  onSelectDataset: (type: string, data?: any) => void;
  onUploadDataset: (fileName: string, content: string) => Promise<void>;
  isLoading: boolean;
}

const PRELOADED_METADATA = [
  {
    id: "pbmc",
    name: "Peripheral Blood Mononuclear Cells (PBMC)",
    organism: "Human (Homo sapiens)",
    cells: 1000,
    genes: 19,
    description: "Standard immunology profiling dataset containing T cells, B cells, NK cells, and myeloid subpopulations. Perfect for identifying immune cell subsets.",
    badge: "Immunology",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200"
  },
  {
    id: "brain",
    name: "Mouse Brain Cortex",
    organism: "Mouse (Mus musculus)",
    cells: 1000,
    genes: 17,
    description: "Cortical section mapping neuron subtypes (glutamatergic, GABAergic) and various neuroglial cells like astrocytes, microglia, and oligodendrocytes.",
    badge: "Neurobiology",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200"
  },
  {
    id: "stem",
    name: "hESC Direct Differentiation",
    organism: "Human (Homo sapiens)",
    cells: 1000,
    genes: 17,
    description: "A dynamic, continuous branching lineage model tracking human embryonic stem cells as they commit toward mesoderm, endoderm, and ectoderm fates.",
    badge: "Developmental / Trajectory",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200"
  }
];

export default function DatasetSelector({ onSelectDataset, onUploadDataset, isLoading }: DatasetSelectorProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv") && !file.name.endsWith(".txt")) {
      setUploadError("Invalid format. Please upload a structured .csv, .tsv, or .txt file.");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        await onUploadDataset(file.name, text);
      } catch (err: any) {
        setUploadError(err.message || "Failed to process the uploaded cell matrix.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div className="space-y-8" id="dataset-selector-step">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h2 className="text-3xl font-sans font-medium tracking-tight text-gray-900">
          Load Single-Cell Expression Matrix
        </h2>
        <p className="text-gray-500 text-sm">
          Upload your count matrix (genes × cells) to perform fully automated quality control, embeddings, 
          clustering, pseudo-temporal developmental pathways, and cell annotation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Preloaded Datasets */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Database className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-900">Preloaded Research Datasets</h3>
          </div>

          <div className="space-y-4">
            {PRELOADED_METADATA.map((ds) => (
              <motion.div
                key={ds.id}
                whileHover={{ y: -2, scale: 1.01 }}
                onClick={() => onSelectDataset(ds.id)}
                className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-sm cursor-pointer transition-all duration-200"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${ds.badgeColor}`}>
                        {ds.badge}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{ds.organism}</span>
                    </div>
                    <h4 className="text-base font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {ds.name}
                    </h4>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>

                <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                  {ds.description}
                </p>

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400 font-mono">
                  <span>Cells: <b className="text-gray-700">{ds.cells}</b></span>
                  <span>Detected Features: <b className="text-gray-700">{ds.genes} genes</b></span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column: Custom Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-900">Upload Gene Count Matrix</h3>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-[340px] ${
              isDragOver
                ? "border-indigo-500 bg-indigo-50/40 text-indigo-600"
                : "border-gray-300 bg-white hover:border-indigo-400"
            }`}
          >
            <input
              type="file"
              id="matrix-file-input"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-4 group-hover:scale-105 transition-transform">
              <Upload className="w-8 h-8" />
            </div>

            <label
              htmlFor="matrix-file-input"
              className="font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer text-sm"
            >
              Click to upload
            </label>
            <span className="text-gray-500 text-sm mt-1"> or drag & drop matrix here</span>
            <p className="text-gray-400 text-xs mt-2 max-w-xs">
              Supports standard scRNA-seq matrices: expression table CSV/TSV format (.csv, .tsv, .txt)
            </p>

            {uploadError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs max-w-sm">
                {uploadError}
              </div>
            )}
          </div>

          {/* Guidelines info card */}
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex gap-3 text-xs leading-normal">
            <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-600">
              <p className="font-semibold text-slate-800">Computational Core Pipeline Notes</p>
              <p>Uploaded custom text matrix files undergo instantaneous alignment and mapping simulations on the Express bioinformatic backend, utilizing cell profile projection matrices tailored to relevant animal organisms.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
