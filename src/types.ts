export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  organism: string;
  cellCount: number;
  geneCount: number;
}

export interface Cell {
  id: string;
  uMapX: number;
  uMapY: number;
  tsneX: number;
  tsneY: number;
  pcaX: number;
  pcaY: number;
  clusterId: number;
  totalCounts: number;
  nGenes: number;
  mitoFrac: number; // 0 to 1
  doubletScore: number; // 0 to 1
  pseudotime?: number; // 0 to 1 (developmental progression)
  originalClusterId: number; // used to keep track when reclustering
}

export interface Gene {
  name: string;
  meanExpression: number;
  dispersion: number;
  isHVG: boolean;
}

export interface ClusterInfo {
  id: number;
  name: string;
  cellCount: number;
  proportion: number;
  predictedType?: string;
  confidence?: number;
  description?: string;
  markerGenes: string[];
}

export interface QCMetrics {
  minGenes: number;
  maxGenes: number;
  minCounts: number;
  maxMito: number;
  removeDoublets: boolean;
}

export interface DifferentialExpressionResult {
  gene: string;
  log2FC: number;
  pValue: number;
  score: number; // overall ranking score (e.g. log2FC * -log10(pValue))
}

export interface LigandReceptorPair {
  id: string;
  ligand: string;
  receptor: string;
  senderCluster: number;
  receiverCluster: number;
  senderCellType: string;
  receiverCellType: string;
  score: number; // interaction intensity
}

export interface ServerDatasetResponse {
  info: DatasetInfo;
  cells: Cell[];
  genes: Gene[];
  clusters: ClusterInfo[];
  expressions: Record<string, number[]>; // Gene name -> expression level array matching cell indices
}
