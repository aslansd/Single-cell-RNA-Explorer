import { useState, useMemo } from "react";
import { Network, HelpCircle, RefreshCw, Volume2, MessageSquare, ShieldAlert } from "lucide-react";
import { Cell, ClusterInfo, LigandReceptorPair } from "../types.js";
import { motion } from "motion/react";

interface CellCommunicationProps {
  cells: Cell[];
  clusters: ClusterInfo[];
  expressions: Record<string, number[]>;
  organism: string;
  onRunCommunication: () => Promise<LigandReceptorPair[]>;
}

export default function CellCommunication({
  cells,
  clusters,
  expressions,
  organism,
  onRunCommunication
}: CellCommunicationProps) {
  const [commPairs, setCommPairs] = useState<LigandReceptorPair[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const results = await onRunCommunication();
      setCommPairs(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Node coordinates for circular network layout (360px x 360px canvas)
  const nodeCoords = useMemo(() => {
    const N = clusters.length;
    const cx = 200;
    const cy = 200;
    const R = 130;

    return clusters.map((cluster, idx) => {
      const theta = (idx / N) * 2 * Math.PI;
      return {
        id: cluster.id,
        name: cluster.predictedType || `Cluster ${cluster.id}`,
        x: cx + R * Math.cos(theta),
        y: cy + R * Math.sin(theta)
      };
    });
  }, [clusters]);

  // Aggregate communication pairs for link intensities
  const linkAggregates = useMemo(() => {
    const links: Record<string, { sender: number; receiver: number; count: number; maxScore: number; details: string[] }> = {};

    commPairs.forEach(pair => {
      const key = `${pair.senderCluster}_to_${pair.receiverCluster}`;
      if (!links[key]) {
        links[key] = {
          sender: pair.senderCluster,
          receiver: pair.receiverCluster,
          count: 0,
          maxScore: 0,
          details: []
        };
      }
      links[key].count++;
      links[key].maxScore = Math.max(links[key].maxScore, pair.score);
      links[key].details.push(`${pair.ligand} - ${pair.receptor} (${pair.score})`);
    });

    return Object.values(links);
  }, [commPairs]);

  // Filter pairs table list
  const filteredPairs = useMemo(() => {
    if (!filterQuery) return commPairs;
    const query = filterQuery.toLowerCase();
    return commPairs.filter(p => 
      p.ligand.toLowerCase().includes(query) || 
      p.receptor.toLowerCase().includes(query) ||
      p.senderCellType.toLowerCase().includes(query) ||
      p.receiverCellType.toLowerCase().includes(query)
    );
  }, [commPairs, filterQuery]);

  return (
    <div className="space-y-6" id="cell-communication-step">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-sans font-medium text-gray-900">Cell-to-Cell Communication Networks</h2>
          <p className="text-xs text-gray-500">
            Predict paracrine and autocrine interactions by modeling co-expression of validated ligand-receptor pairs (e.g., CXCL12-CXCR4 chemokine signals) across sending and receiving cluster populations.
          </p>
        </div>

        <button
          onClick={handleCalculate}
          disabled={isCalculating}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? "animate-spin" : ""}`} />
          {isCalculating ? "Computing cross-talk..." : "Run Communication Analysis"}
        </button>
      </div>

      {commPairs.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: SVG Circle Network Topology (5 cols) */}
          <div className="xl:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center justify-between min-h-[440px]">
            <span className="text-xs font-semibold text-slate-800 self-start mb-2">Inter-Cluster Signaling Network</span>
            
            <div className="relative w-[360px] h-[360px]">
              <svg className="w-full h-full" viewBox="0 0 400 400">
                <defs>
                  {/* Directed arrow markers */}
                  <marker
                    id="arrowhead"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
                  </marker>
                </defs>

                {/* Draw interaction lines */}
                {linkAggregates.map(link => {
                  const senderNode = nodeCoords.find(n => n.id === link.sender);
                  const receiverNode = nodeCoords.find(n => n.id === link.receiver);
                  if (!senderNode || !receiverNode) return null;

                  const isHovered = hoveredLink === `${link.sender}_to_${link.receiver}` ||
                    (hoveredNode !== null && (hoveredNode === link.sender || hoveredNode === link.receiver));
                  
                  // Compute stroke width from maxScore intensity
                  const strokeWidth = Math.min(6, Math.max(1.5, link.maxScore * 0.75));

                  return (
                    <g key={`signal-link-${link.sender}-${link.receiver}`}>
                      <line
                        x1={senderNode.x}
                        y1={senderNode.y}
                        x2={receiverNode.x}
                        y2={receiverNode.y}
                        stroke={isHovered ? "#6366f1" : "#e2e8f0"}
                        strokeWidth={strokeWidth}
                        opacity={hoveredNode !== null && !isHovered ? 0.2 : 0.75}
                        markerEnd="url(#arrowhead)"
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredLink(`${link.sender}_to_${link.receiver}`)}
                        onMouseLeave={() => setHoveredLink(null)}
                      />
                    </g>
                  );
                })}

                {/* Draw Node circles */}
                {nodeCoords.map(node => {
                  const isHovered = hoveredNode === node.id || 
                    (hoveredLink !== null && hoveredLink.includes(String(node.id)));

                  return (
                    <g
                      key={`signal-node-${node.id}`}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={16}
                        fill={isHovered ? "#4f46e5" : "#e0e7ff"}
                        stroke={isHovered ? "#312e81" : "#818cf8"}
                        strokeWidth={2}
                        className="transition-all duration-200"
                      />
                      <text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight="bold"
                        fill={isHovered ? "#ffffff" : "#312e81"}
                        fontFamily="monospace"
                      >
                        {node.id}
                      </text>
                      
                      {/* Outer Label text */}
                      <text
                        x={node.x}
                        y={node.y + (node.y > 200 ? 30 : -22)}
                        textAnchor="middle"
                        fontSize={8.5}
                        fontWeight="bold"
                        fill="#475569"
                      >
                        {node.name.length > 18 ? `${node.name.slice(0, 16)}..` : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right Column: Interaction Lists & Tables (7 cols) */}
          <div className="xl:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[440px] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-800">Paracrine Signaling Crosstalk Logs</span>
              
              {/* Search filter input */}
              <input
                type="text"
                placeholder="Filter by Ligand, Receptor, or Cluster..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="text-[11px] border border-gray-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-indigo-500 w-full sm:w-[220px]"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] border border-gray-100 rounded-lg">
              <table className="w-full text-left text-[11px] text-gray-500">
                <thead className="text-[9px] uppercase font-mono tracking-wider bg-slate-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Sender (Ligand)</th>
                    <th className="px-3 py-2">Receiver (Receptor)</th>
                    <th className="px-3 py-2">interaction Pair</th>
                    <th className="px-3 py-2 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {filteredPairs.map(pair => {
                    const isLinkHovered = hoveredLink === `${pair.senderCluster}_to_${pair.receiverCluster}`;
                    const isNodeHovered = hoveredNode === pair.senderCluster || hoveredNode === pair.receiverCluster;
                    const isRowHighlighted = isLinkHovered || isNodeHovered;

                    return (
                      <tr
                        key={`pair-row-${pair.id}`}
                        className={`hover:bg-indigo-50/40 transition-colors ${isRowHighlighted ? "bg-indigo-50/30" : ""}`}
                        onMouseEnter={() => setHoveredLink(`${pair.senderCluster}_to_${pair.receiverCluster}`)}
                        onMouseLeave={() => setHoveredLink(null)}
                      >
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {pair.senderCellType} <span className="font-mono text-slate-400">({pair.senderCluster})</span>
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {pair.receiverCellType} <span className="font-mono text-slate-400">({pair.receiverCluster})</span>
                        </td>
                        <td className="px-3 py-2 font-mono">
                          <span className="text-indigo-600 font-semibold">{pair.ligand}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-emerald-600 font-semibold">{pair.receptor}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">
                          {pair.score.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex gap-2 text-[10px] leading-normal text-indigo-700">
              <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>SVG Circular layout dynamically maps paracrine directions. Thicker links represent higher combined Ligand-Receptor densities, outlining dominant systemic axes.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <Network className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
          <h4 className="text-sm font-semibold text-slate-800">Paracrine Signaling Analysis</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
            Click "Run Communication Analysis" to search our interaction database and model cluster-level chemokine and cytokine ligand-receptor pathways in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
