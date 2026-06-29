import { Cell, Gene, ClusterInfo, ServerDatasetResponse } from "./types.js";

// Helper to generate normal (Gaussian) distributed numbers
function randomNormal(mean = 0, stdDev = 1) {
  const u1 = Math.random();
  const u2 = Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return mean + stdDev * randStdNormal;
}

export function generateDataset(type: string): ServerDatasetResponse {
  const cellCount = 1000;
  const cells: Cell[] = [];
  const expressions: Record<string, number[]> = {};

  if (type === "pbmc") {
    // Organism: Human
    // 6 distinct clusters of immune cells
    const geneNames = [
      "CD3D", "CD4", "CD8A", "CD8B", "MS4A1", "CD79A", "CD19", "CD14", "LYZ", "GNLY", 
      "NKG7", "FCER1A", "CD40", "GAPDH", "MT-CO1", "MT-CO2", "IL7R", "CD16", "CD56"
    ];

    const clusters: ClusterInfo[] = [
      { id: 0, name: "Cluster 0", cellCount: 280, proportion: 0.28, markerGenes: ["CD3D", "CD4", "IL7R"] },
      { id: 1, name: "Cluster 1", cellCount: 220, proportion: 0.22, markerGenes: ["CD3D", "CD8A", "CD8B"] },
      { id: 2, name: "Cluster 2", cellCount: 180, proportion: 0.18, markerGenes: ["MS4A1", "CD79A", "CD19"] },
      { id: 3, name: "Cluster 3", cellCount: 140, proportion: 0.14, markerGenes: ["GNLY", "NKG7", "CD56"] },
      { id: 4, name: "Cluster 4", cellCount: 120, proportion: 0.12, markerGenes: ["CD14", "LYZ"] },
      { id: 5, name: "Cluster 5", cellCount: 60, proportion: 0.06, markerGenes: ["FCER1A", "CD40"] },
    ];

    // Initialize expressions
    geneNames.forEach(g => { expressions[g] = []; });

    // Cluster positions in embedding space
    const centers = [
      { uMap: [-1.5, 2.5], tsne: [-12, 18], pca: [-2.5, 1.2] }, // CD4+ T Cells
      { uMap: [-2.2, -0.5], tsne: [-18, -10], pca: [-1.8, -1.5] }, // CD8+ T Cells
      { uMap: [4.0, 3.2], tsne: [22, 12], pca: [2.0, 3.0] }, // B Cells
      { uMap: [-4.5, -2.8], tsne: [-30, -22], pca: [-3.5, -3.2] }, // NK Cells
      { uMap: [2.5, -3.5], tsne: [15, -25], pca: [3.2, -2.0] }, // Monocytes
      { uMap: [5.0, -1.0], tsne: [32, -5], pca: [2.5, -0.5] }, // Dendritic Cells
    ];

    for (let i = 0; i < cellCount; i++) {
      // Assign cluster based on proportions
      let clusterId = 0;
      const rand = Math.random();
      if (rand < 0.28) clusterId = 0;
      else if (rand < 0.50) clusterId = 1;
      else if (rand < 0.68) clusterId = 2;
      else if (rand < 0.82) clusterId = 3;
      else if (rand < 0.94) clusterId = 4;
      else clusterId = 5;

      const center = centers[clusterId];
      const uMapX = center.uMap[0] + randomNormal(0, 0.6);
      const uMapY = center.uMap[1] + randomNormal(0, 0.6);
      const tsneX = center.tsne[0] + randomNormal(0, 4.0);
      const tsneY = center.tsne[1] + randomNormal(0, 4.0);
      const pcaX = center.pca[0] + randomNormal(0, 0.4);
      const pcaY = center.pca[1] + randomNormal(0, 0.4);

      // QC parameters
      // Dead cell simulation: 4% of cells have extremely high mitochondrial reads and low counts
      const isDead = Math.random() < 0.04;
      const countsBase = isDead ? 800 : 4500;
      const totalCounts = Math.max(300, Math.floor(countsBase + randomNormal(0, isDead ? 150 : 1000)));
      const nGenes = Math.max(50, Math.floor((totalCounts * 0.35) + randomNormal(0, 150)));
      const mitoFrac = isDead ? (0.22 + Math.random() * 0.15) : (0.02 + Math.random() * 0.04);
      
      // Doublet simulation: 5% of cells are doublets, typically have high count depth and doublet score
      const isDoublet = Math.random() < 0.05;
      const doubletScore = isDoublet ? (0.55 + Math.random() * 0.35) : (0.01 + Math.random() * 0.08);
      const countsMod = isDoublet ? totalCounts * 1.8 : totalCounts;
      const finalCounts = Math.floor(countsMod);

      cells.push({
        id: `cell_${String(i).padStart(4, "0")}`,
        uMapX,
        uMapY,
        tsneX,
        tsneY,
        pcaX,
        pcaY,
        clusterId,
        totalCounts: finalCounts,
        nGenes,
        mitoFrac,
        doubletScore,
        originalClusterId: clusterId
      });

      // Generate realistic expression matrix
      geneNames.forEach(gene => {
        let baseExpression = 0.1; // ambient baseline

        // Marker genes express highly in specific clusters
        if (clusterId === 0 && ["CD3D", "CD4", "IL7R"].includes(gene)) {
          baseExpression = 3.5 + Math.random() * 2;
        } else if (clusterId === 1 && ["CD3D", "CD8A", "CD8B"].includes(gene)) {
          baseExpression = 4.0 + Math.random() * 2;
        } else if (clusterId === 2 && ["MS4A1", "CD79A", "CD19"].includes(gene)) {
          baseExpression = 4.5 + Math.random() * 2;
        } else if (clusterId === 3 && ["GNLY", "NKG7", "CD56"].includes(gene)) {
          baseExpression = 5.0 + Math.random() * 2;
        } else if (clusterId === 4 && ["CD14", "LYZ", "CD16"].includes(gene)) {
          baseExpression = 3.8 + Math.random() * 2;
        } else if (clusterId === 5 && ["FCER1A", "CD40"].includes(gene)) {
          baseExpression = 4.2 + Math.random() * 2;
        }

        // Housekeeping genes (expressed in all cells)
        if (gene === "GAPDH") {
          baseExpression = 2.5 + Math.random() * 1.5;
        }

        // Mitochondrial genes (higher in dead cells)
        if (gene.startsWith("MT-")) {
          baseExpression = isDead ? (4.0 + Math.random() * 1.5) : (1.0 + Math.random() * 0.8);
        }

        // Add Poisson-like dropout noise (highly characteristic of scRNA-seq!)
        const exprVal = Math.max(0, parseFloat((baseExpression + randomNormal(0, 0.5)).toFixed(2)));
        // Introduce dropouts (0 values) based on expression level
        const dropoutProb = Math.max(0, 0.85 - exprVal * 0.2);
        expressions[gene].push(Math.random() < dropoutProb ? 0 : exprVal);
      });
    }

    const genes: Gene[] = geneNames.map(name => {
      const isHVG = !["GAPDH", "MT-CO1", "MT-CO2"].includes(name) && Math.random() > 0.3;
      return {
        name,
        meanExpression: isHVG ? 1.8 + Math.random() : 0.8 + Math.random(),
        dispersion: isHVG ? 2.5 + Math.random() * 1.5 : 0.8 + Math.random() * 0.5,
        isHVG
      };
    });

    return {
      info: {
        id: "pbmc",
        name: "Peripheral Blood Mononuclear Cells (PBMC)",
        description: "Simulated subset of 1,000 human immune cells from a healthy donor, characteristic of standard 10x Genomics scRNA-seq datasets.",
        organism: "Human (Homo sapiens)",
        cellCount: 1000,
        geneCount: geneNames.length
      },
      cells,
      genes,
      clusters,
      expressions
    };

  } else if (type === "brain") {
    // Organism: Mouse
    // 6 distinct clusters of brain cortical cells
    const geneNames = [
      "Slc17a7", "Neurod2", "Gad1", "Gad2", "Gfap", "Aldh1l1", "Mbp", "Plp1", "Cx3cr1", 
      "Trem2", "Cldn5", "Gapdh", "Mt-co1", "Mt-co2", "Map2", "Tubb3", "Dlg4"
    ];

    const clusters: ClusterInfo[] = [
      { id: 0, name: "Cluster 0", cellCount: 300, proportion: 0.30, markerGenes: ["Slc17a7", "Neurod2", "Map2"] },
      { id: 1, name: "Cluster 1", cellCount: 180, proportion: 0.18, markerGenes: ["Gad1", "Gad2", "Map2"] },
      { id: 2, name: "Cluster 2", cellCount: 200, proportion: 0.20, markerGenes: ["Gfap", "Aldh1l1"] },
      { id: 3, name: "Cluster 3", cellCount: 160, proportion: 0.16, markerGenes: ["Mbp", "Plp1"] },
      { id: 4, name: "Cluster 4", cellCount: 110, proportion: 0.11, markerGenes: ["Cx3cr1", "Trem2"] },
      { id: 5, name: "Cluster 5", cellCount: 50, proportion: 0.05, markerGenes: ["Cldn5"] },
    ];

    geneNames.forEach(g => { expressions[g] = []; });

    // Cluster positions
    const centers = [
      { uMap: [1.2, 3.5], tsne: [10, 25], pca: [2.2, 1.8] }, // Excitatory Neurons
      { uMap: [3.8, 1.5], tsne: [28, 8], pca: [1.5, 2.5] }, // Inhibitory Neurons
      { uMap: [-3.0, 1.0], tsne: [-22, 5], pca: [-1.8, 0.8] }, // Astrocytes
      { uMap: [-1.5, -3.2], tsne: [-10, -28], pca: [-2.0, -2.2] }, // Oligodendrocytes
      { uMap: [0.5, -4.5], tsne: [5, -35], pca: [0.2, -3.0] }, // Microglia
      { uMap: [-4.2, -2.0], tsne: [-32, -15], pca: [-3.2, -1.2] }, // Endothelial
    ];

    for (let i = 0; i < cellCount; i++) {
      let clusterId = 0;
      const rand = Math.random();
      if (rand < 0.30) clusterId = 0;
      else if (rand < 0.48) clusterId = 1;
      else if (rand < 0.68) clusterId = 2;
      else if (rand < 0.84) clusterId = 3;
      else if (rand < 0.95) clusterId = 4;
      else clusterId = 5;

      const center = centers[clusterId];
      const uMapX = center.uMap[0] + randomNormal(0, 0.75);
      const uMapY = center.uMap[1] + randomNormal(0, 0.75);
      const tsneX = center.tsne[0] + randomNormal(0, 5.0);
      const tsneY = center.tsne[1] + randomNormal(0, 5.0);
      const pcaX = center.pca[0] + randomNormal(0, 0.45);
      const pcaY = center.pca[1] + randomNormal(0, 0.45);

      const isDead = Math.random() < 0.05;
      const countsBase = isDead ? 500 : 6000;
      const totalCounts = Math.max(250, Math.floor(countsBase + randomNormal(0, isDead ? 120 : 1200)));
      const nGenes = Math.max(40, Math.floor((totalCounts * 0.32) + randomNormal(0, 200)));
      const mitoFrac = isDead ? (0.25 + Math.random() * 0.12) : (0.01 + Math.random() * 0.035);
      
      const isDoublet = Math.random() < 0.04;
      const doubletScore = isDoublet ? (0.60 + Math.random() * 0.30) : (0.01 + Math.random() * 0.07);
      const countsMod = isDoublet ? totalCounts * 1.7 : totalCounts;
      const finalCounts = Math.floor(countsMod);

      cells.push({
        id: `cell_${String(i).padStart(4, "0")}`,
        uMapX,
        uMapY,
        tsneX,
        tsneY,
        pcaX,
        pcaY,
        clusterId,
        totalCounts: finalCounts,
        nGenes,
        mitoFrac,
        doubletScore,
        originalClusterId: clusterId
      });

      geneNames.forEach(gene => {
        let baseExpression = 0.05;

        if (clusterId === 0 && ["Slc17a7", "Neurod2", "Map2", "Tubb3", "Dlg4"].includes(gene)) {
          baseExpression = 4.2 + Math.random() * 1.8;
        } else if (clusterId === 1 && ["Gad1", "Gad2", "Map2", "Tubb3", "Dlg4"].includes(gene)) {
          baseExpression = 4.5 + Math.random() * 1.8;
        } else if (clusterId === 2 && ["Gfap", "Aldh1l1"].includes(gene)) {
          baseExpression = 4.0 + Math.random() * 2.0;
        } else if (clusterId === 3 && ["Mbp", "Plp1"].includes(gene)) {
          baseExpression = 5.2 + Math.random() * 1.5;
        } else if (clusterId === 4 && ["Cx3cr1", "Trem2"].includes(gene)) {
          baseExpression = 4.4 + Math.random() * 1.6;
        } else if (clusterId === 5 && ["Cldn5"].includes(gene)) {
          baseExpression = 4.8 + Math.random() * 1.5;
        }

        if (gene === "Gapdh") {
          baseExpression = 2.8 + Math.random() * 1.2;
        }

        if (gene.startsWith("Mt-")) {
          baseExpression = isDead ? (4.2 + Math.random() * 1.5) : (1.2 + Math.random() * 0.6);
        }

        const exprVal = Math.max(0, parseFloat((baseExpression + randomNormal(0, 0.45)).toFixed(2)));
        const dropoutProb = Math.max(0, 0.88 - exprVal * 0.22);
        expressions[gene].push(Math.random() < dropoutProb ? 0 : exprVal);
      });
    }

    const genes: Gene[] = geneNames.map(name => {
      const isHVG = !["Gapdh", "Mt-co1", "Mt-co2"].includes(name) && Math.random() > 0.35;
      return {
        name,
        meanExpression: isHVG ? 1.5 + Math.random() : 0.7 + Math.random(),
        dispersion: isHVG ? 2.2 + Math.random() * 1.8 : 0.6 + Math.random() * 0.6,
        isHVG
      };
    });

    return {
      info: {
        id: "brain",
        name: "Mouse Brain Cortex",
        description: "Simulated dataset of 1,000 cortical cells from a mouse brain, representing neuronal subtypes (excitatory, inhibitory) and glial subsets (astrocytes, microglia, oligodendrocytes).",
        organism: "Mouse (Mus musculus)",
        cellCount: 1000,
        geneCount: geneNames.length
      },
      cells,
      genes,
      clusters,
      expressions
    };

  } else {
    // stem: Stem Cell Differentiation Trajectory
    // Continuous developmental pathway with a branch!
    // Cluster 0: Stem Cells (Center)
    // Branch 1: Mesoderm (bottom-left) -> Cardiomyocytes (Cluster 1)
    // Branch 2: Endoderm (bottom-right) -> Hepatocytes (Cluster 2)
    // Branch 3: Ectoderm (top-middle) -> Neurons (Cluster 3)
    const geneNames = [
      "POU5F1", "SOX2", "NANOG", "MESP1", "T", "GATA4", "SOX17", "GATA6", "PAX6", 
      "NES", "GAPDH", "MT-CO1", "MT-CO2", "NCAM1", "PDGFRA", "KRT8", "AFP"
    ];

    const clusters: ClusterInfo[] = [
      { id: 0, name: "Stem Cells", cellCount: 250, proportion: 0.25, markerGenes: ["POU5F1", "SOX2", "NANOG"] },
      { id: 1, name: "Mesoderm Branch", cellCount: 250, proportion: 0.25, markerGenes: ["MESP1", "T", "PDGFRA"] },
      { id: 2, name: "Endoderm Branch", cellCount: 250, proportion: 0.25, markerGenes: ["SOX17", "GATA4", "AFP", "KRT8"] },
      { id: 3, name: "Ectoderm Branch", cellCount: 250, proportion: 0.25, markerGenes: ["PAX6", "NES", "NCAM1"] },
    ];

    geneNames.forEach(g => { expressions[g] = []; });

    for (let i = 0; i < cellCount; i++) {
      // Cell differentiation path mapping
      // Divide 1000 cells equally along 4 developmental stages
      let clusterId = 0;
      let pseudotime = 0;
      let uMapX = 0;
      let uMapY = 0;
      let tsneX = 0;
      let tsneY = 0;
      let pcaX = 0;
      let pcaY = 0;

      const progress = Math.random(); // 0 to 1
      pseudotime = progress;

      if (progress < 0.25) {
        // Stem cells in the center
        clusterId = 0;
        const radius = progress * 1.5;
        const angle = Math.random() * 2 * Math.PI;
        uMapX = radius * Math.cos(angle);
        uMapY = radius * Math.sin(angle);
        tsneX = radius * 8 * Math.cos(angle);
        tsneY = radius * 8 * Math.sin(angle);
        pcaX = radius * 0.8 * Math.cos(angle);
        pcaY = radius * 0.8 * Math.sin(angle);
      } else {
        // Branch choice: 3 options
        const branchChoice = i % 3; // 0: Mesoderm, 1: Endoderm, 2: Ectoderm
        const branchProgress = (progress - 0.25) / 0.75; // normalized path length

        if (branchChoice === 0) {
          clusterId = 1; // Mesoderm
          // Bottom Left
          uMapX = -1.0 - branchProgress * 3.5 + randomNormal(0, 0.4);
          uMapY = -1.0 - branchProgress * 3.5 + randomNormal(0, 0.4);
          tsneX = -8 - branchProgress * 25 + randomNormal(0, 3);
          tsneY = -8 - branchProgress * 25 + randomNormal(0, 3);
          pcaX = -0.5 - branchProgress * 1.8 + randomNormal(0, 0.25);
          pcaY = -0.5 - branchProgress * 1.8 + randomNormal(0, 0.25);
        } else if (branchChoice === 1) {
          clusterId = 2; // Endoderm
          // Bottom Right
          uMapX = 1.0 + branchProgress * 3.5 + randomNormal(0, 0.4);
          uMapY = -1.0 - branchProgress * 3.5 + randomNormal(0, 0.4);
          tsneX = 8 + branchProgress * 25 + randomNormal(0, 3);
          tsneY = -8 - branchProgress * 25 + randomNormal(0, 3);
          pcaX = 0.5 + branchProgress * 1.8 + randomNormal(0, 0.25);
          pcaY = -0.5 - branchProgress * 1.8 + randomNormal(0, 0.25);
        } else {
          clusterId = 3; // Ectoderm
          // Straight Up
          uMapX = 0.0 + randomNormal(0, 0.4);
          uMapY = 1.5 + branchProgress * 4.0 + randomNormal(0, 0.4);
          tsneX = 0 + randomNormal(0, 3);
          tsneY = 12 + branchProgress * 30 + randomNormal(0, 3);
          pcaX = 0.0 + randomNormal(0, 0.25);
          pcaY = 0.8 + branchProgress * 2.2 + randomNormal(0, 0.25);
        }
      }

      const isDead = Math.random() < 0.03;
      const countsBase = isDead ? 700 : 5200;
      const totalCounts = Math.max(300, Math.floor(countsBase + randomNormal(0, isDead ? 100 : 1100)));
      const nGenes = Math.max(45, Math.floor((totalCounts * 0.34) + randomNormal(0, 150)));
      const mitoFrac = isDead ? (0.20 + Math.random() * 0.12) : (0.01 + Math.random() * 0.03);
      
      const isDoublet = Math.random() < 0.05;
      const doubletScore = isDoublet ? (0.50 + Math.random() * 0.35) : (0.01 + Math.random() * 0.08);
      const countsMod = isDoublet ? totalCounts * 1.6 : totalCounts;
      const finalCounts = Math.floor(countsMod);

      cells.push({
        id: `cell_${String(i).padStart(4, "0")}`,
        uMapX,
        uMapY,
        tsneX,
        tsneY,
        pcaX,
        pcaY,
        clusterId,
        totalCounts: finalCounts,
        nGenes,
        mitoFrac,
        doubletScore,
        pseudotime,
        originalClusterId: clusterId
      });

      // Expression values modeled accurately according to differentiation trajectory progress!
      geneNames.forEach(gene => {
        let baseExpression = 0.1;

        if (clusterId === 0) {
          // Pluripotency markers express highly at early pseudotime
          if (["POU5F1", "SOX2", "NANOG"].includes(gene)) {
            const decay = Math.max(0.1, 1 - pseudotime * 1.2);
            baseExpression = (4.5 + Math.random() * 2) * decay;
          }
        } else {
          // Decreasing pluripotency markers as cells differentiate
          if (["POU5F1", "SOX2", "NANOG"].includes(gene)) {
            baseExpression = Math.max(0.01, 1.2 - pseudotime * 1.5);
          }

          // Branch lineage markers express highly as pseudotime increases
          if (clusterId === 1 && ["MESP1", "T", "PDGFRA"].includes(gene)) {
            baseExpression = (3.5 + Math.random() * 2) * pseudotime;
          } else if (clusterId === 2 && ["SOX17", "GATA4", "AFP", "KRT8", "GATA6"].includes(gene)) {
            baseExpression = (4.0 + Math.random() * 2) * pseudotime;
          } else if (clusterId === 3 && ["PAX6", "NES", "NCAM1"].includes(gene)) {
            baseExpression = (3.8 + Math.random() * 2) * pseudotime;
          }
        }

        if (gene === "GAPDH") {
          baseExpression = 2.4 + Math.random() * 1.6;
        }

        if (gene.startsWith("MT-")) {
          baseExpression = isDead ? (3.8 + Math.random() * 1.2) : (0.8 + Math.random() * 0.6);
        }

        const exprVal = Math.max(0, parseFloat((baseExpression + randomNormal(0, 0.45)).toFixed(2)));
        const dropoutProb = Math.max(0, 0.82 - exprVal * 0.2);
        expressions[gene].push(Math.random() < dropoutProb ? 0 : exprVal);
      });
    }

    const genes: Gene[] = geneNames.map(name => {
      const isHVG = !["GAPDH", "MT-CO1", "MT-CO2"].includes(name) && Math.random() > 0.3;
      return {
        name,
        meanExpression: isHVG ? 1.6 + Math.random() : 0.8 + Math.random(),
        dispersion: isHVG ? 2.6 + Math.random() * 1.6 : 0.7 + Math.random() * 0.5,
        isHVG
      };
    });

    return {
      info: {
        id: "stem",
        name: "hESC Direct Differentiation",
        description: "Simulated trajectory of 1,000 Human Embryonic Stem Cells differentiating down Mesoderm, Endoderm, and Ectoderm lineages, capturing continuous state progressions.",
        organism: "Human (Homo sapiens)",
        cellCount: 1000,
        geneCount: geneNames.length
      },
      cells,
      genes,
      clusters,
      expressions
    };
  }
}
